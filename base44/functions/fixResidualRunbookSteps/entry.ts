// One-off deterministic cleanup for the six residual v4 clarity findings.
// No LLM: each fix is a fixed regex rewrite (drop vague "as required" filler,
// turn passive statement openers into imperative "Confirm ..." instructions).
// Originals are archived to MigrationArchive before any change, and the
// result must pass the shared stepIssues validator before it is stored.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { MIGRATION_KEY, REWRITE_VERSION, stepIssues } from '../../shared/runbookClarity.ts';
import { canAutoRewriteVariant } from '../../shared/runbookReviewGuard.ts';

const TARGETS = [
  { control: 'IA.L1-b.1.vi', variant: 'm365_commercial' },
  { control: 'IA.L2-3.5.2', variant: 'm365_commercial' },
  { control: 'AC.L2-3.1.19', variant: 'generic' },
  { control: 'AU.L2-3.3.3', variant: 'generic' },
  { control: 'CM.L2-3.4.4', variant: 'generic' },
  { control: 'CM.L2-3.4.9', variant: 'generic' },
];

function fixStep(text) {
  let t = String(text);
  // Vague "as required" with no authority named: the step already states the
  // condition, so the filler is dropped. "as required by X" is left alone.
  if (!/\bas required by\b/i.test(t)) {
    t = t.replace(/,?\s+as required(?=[\s.,;])/gi, '');
    t = t.replace(/,?\s+as required\.$/i, '.');
  }
  // Passive statement openers become direct verification instructions.
  t = t.replace(/^The completed rule must state:/, 'Confirm the completed rule states:');
  t = t.replace(/^The required result for every row is:/, 'Confirm the required result for every row states:');
  t = t.replace(/^The required result is:/, 'Confirm the required result states:');
  t = t.replace(/^The required result also states/, 'Confirm the required result also states');
  return t;
}

async function sha256Hex(input) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const apply = body.mode === 'apply';
    const results = [];

    for (const target of TARGETS) {
      const records = await base44.asServiceRole.entities.ControlLibrary.filter({
        control_id: target.control,
        active: true,
        framework: 'CMMC',
      });
      const rec = records[0];
      if (!rec) { results.push({ ...target, error: 'control not found' }); continue; }

      const hti = rec.how_to_implement || {};
      const variant = hti[target.variant];
      if (!variant || !Array.isArray(variant.steps)) {
        results.push({ ...target, error: 'variant not found' });
        continue;
      }

      if (!canAutoRewriteVariant(variant, REWRITE_VERSION)) {
        results.push({ ...target, changed: [], note: 'protected newer or manually reviewed directions' });
        continue;
      }

      const steps = variant.steps.map(String);
      const newSteps = steps.map(fixStep);
      const changed = steps
        .map((s, i) => (s !== newSteps[i] ? i + 1 : null))
        .filter((n) => n !== null);
      if (!changed.length) { results.push({ ...target, changed: [], note: 'already clean' }); continue; }

      // Every changed step must pass the shared clarity validator.
      const residual = [];
      for (const n of changed) {
        for (const issue of stepIssues(newSteps[n - 1])) residual.push(`step ${n}: ${issue}`);
      }
      if (residual.length) { results.push({ ...target, changed, rejected: residual }); continue; }

      if (apply) {
        const payload = { control_id: rec.control_id, variant: target.variant, steps };
        await base44.asServiceRole.entities.MigrationArchive.create({
          migration_key: MIGRATION_KEY,
          entity_name: 'ControlLibrary',
          source_record_id: rec.id,
          reason: 'Updated',
          payload,
          content_sha256: await sha256Hex(JSON.stringify(payload)),
          archived_at: new Date().toISOString(),
          archived_by: user.email,
        });
        await base44.asServiceRole.entities.ControlLibrary.update(rec.id, {
          how_to_implement: { ...hti, [target.variant]: { ...variant, steps: newSteps } },
        });
      }

      results.push({
        ...target,
        changed,
        applied: apply,
        after: changed.map((n) => newSteps[n - 1]),
      });
    }

    return Response.json({ mode: apply ? 'apply' : 'dry_run', results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}