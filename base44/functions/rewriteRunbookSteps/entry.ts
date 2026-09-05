import { createClientFromRequest } from 'npm:@base44/sdk@0.8.41';
import {
  MIGRATION_KEY,
  REWRITE_VERSION,
  normalizeModelSteps,
  normalizeSourceStep,
  requiresNaming,
  rewritePrompt,
  validateRewrite,
} from '../../shared/runbookClarity.ts';

import { canAutoRewriteVariant } from '../../shared/runbookReviewGuard.ts';

const MAX_ATTEMPTS = 3;

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function pendingVariants(record: any): string[] {
  return Object.entries(record?.how_to_implement || {})
    .filter(([, v]: [string, any]) => canAutoRewriteVariant(v, REWRITE_VERSION))
    .map(([k]) => k);
}

async function rewriteVariant(base44: any, record: any, variantKey: string) {
  const variant = record.how_to_implement[variantKey];
  const originalSteps = (Array.isArray(variant.steps) ? variant.steps : []).map(String);
  const sourceSteps = originalSteps.map(normalizeSourceStep);
  const requireNaming = requiresNaming(variant);

  let steps: string[] = [];
  let lastFailures: string[] = [];
  let attempts = 0;

  while (attempts < MAX_ATTEMPTS) {
    attempts += 1;
    const prompt = rewritePrompt({
      controlId: record.control_id,
      controlTitle: record.control_title,
      variantKey,
      variant: { ...variant, steps: sourceSteps },
      requireNaming,
      previousFailures: lastFailures,
    });

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: 'claude_sonnet_4_6',
      response_json_schema: {
        type: 'object',
        properties: { steps: { type: 'array', items: { type: 'string' } } },
        required: ['steps'],
      },
    });

    steps = normalizeModelSteps(Array.isArray(result?.steps) ? result.steps : []);

    lastFailures = validateRewrite(sourceSteps, steps, {
      requireNaming,
      variantKey,
      allowedNavSource: [
        String(variant?.where_to_go?.name || ''),
        String(variant?.setting_to_change || ''),
        String(variant?.outcome || ''),
        'this CMMC project Capture & Upload Needs Work POA&M',
        ...(Array.isArray(variant?.before_you_start) ? variant.before_you_start.map(String) : []),
      ],
    });

    if (!lastFailures.length) {
      return { ok: true, attempts, steps, originalSteps };
    }
  }

  // Surface the offending text so a rejection can be judged, not guessed at.
  const failedIndexes = [...new Set(
    lastFailures
      .map((f) => Number((f.match(/^step (\d+):/) || [])[1]))
      .filter((n) => Number.isFinite(n)),
  )];
  return {
    ok: false,
    attempts,
    steps,
    originalSteps,
    failures: lastFailures,
    failedSteps: failedIndexes.map((n) => steps[n - 1]).filter(Boolean),
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (caller.role !== 'admin') {
      return Response.json({ error: 'Forbidden: platform admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const mode = body.mode === 'apply' ? 'apply' : 'dry_run';
    const limit = Math.max(1, Math.min(Number(body.limit) || 5, 15));

    const controls = await base44.asServiceRole.entities.ControlLibrary.filter(
      { active: true, framework: 'CMMC' },
      'sort_order',
      500,
    );
    const pending = controls
      .filter((c: any) => (body.control_id ? c.control_id === body.control_id : true))
      .map((c: any) => ({
        record: c,
        variants: pendingVariants(c).filter((variantKey) => body.variant ? variantKey === body.variant : true),
      }))
      .filter((c: any) => c.variants.length > 0);

    const batch = pending.slice(0, limit);
    const results: any[] = [];
    let rewritten = 0;
    let rejected = 0;

    for (const item of batch) {
      const record = item.record;
      const variantReports: any[] = [];
      const nextHowTo = { ...(record.how_to_implement || {}) };
      let applied = 0;

      for (const variantKey of item.variants) {
        const outcome = await rewriteVariant(base44, record, variantKey);
        if (!outcome.ok) {
          rejected += 1;
          variantReports.push({
            variant: variantKey,
            attempts: outcome.attempts,
            original_step_count: outcome.originalSteps.length,
            new_step_count: outcome.steps.length,
            rejected: outcome.failures,
            failed_steps: outcome.failedSteps,
          });
          continue;
        }

        rewritten += 1;
        variantReports.push({
          variant: variantKey,
          attempts: outcome.attempts,
          original_step_count: outcome.originalSteps.length,
          new_step_count: outcome.steps.length,
          preview: mode === 'apply' ? [] : outcome.steps.slice(0, 6),
        });

        if (mode !== 'apply') continue;

        // Archive the untouched original before the live record changes.
        const existing = nextHowTo[variantKey] || {};
        let archiveId = existing.original_steps_archive_id;
        if (!archiveId) {
          const payload = { control_id: record.control_id, variant: variantKey, steps: outcome.originalSteps };
          const archive = await base44.asServiceRole.entities.MigrationArchive.create({
            migration_key: MIGRATION_KEY,
            entity_name: 'ControlLibrary',
            source_record_id: record.id,
            reason: 'Updated',
            payload,
            content_sha256: await sha256(JSON.stringify(payload)),
            archived_at: new Date().toISOString(),
            archived_by: caller.email,
          });
          archiveId = archive.id;
        }

        nextHowTo[variantKey] = {
          ...existing,
          steps: outcome.steps,
          original_steps_archive_id: archiveId,
          clarity_rewrite_version: REWRITE_VERSION,
        };
        applied += 1;
      }

      if (mode === 'apply' && applied > 0) {
        await base44.asServiceRole.entities.ControlLibrary.update(record.id, { how_to_implement: nextHowTo });
      }
      results.push({ control_id: record.control_id, applied, variants: variantReports });
    }

    if (mode === 'apply') {
      await base44.asServiceRole.entities.DataMigrationRun.create({
        migration_key: MIGRATION_KEY,
        status: 'Applied',
        dataset_key: MIGRATION_KEY,
        before_counts: { pending_controls: pending.length },
        after_counts: { variants_rewritten: rewritten, variants_rejected: rejected },
        validation_notes: `Rewrote ${rewritten} variants across ${batch.length} controls.`,
        applied_at: new Date().toISOString(),
        applied_by: caller.email,
      });
    }

    return Response.json({
      mode,
      controls_pending_before: pending.length,
      controls_processed: batch.length,
      controls_remaining: Math.max(0, pending.length - batch.length),
      variants_rewritten: rewritten,
      variants_rejected: rejected,
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});