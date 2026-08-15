import { createClientFromRequest } from 'npm:@base44/sdk@0.8.41';

const BLOCKED_BOILERPLATE = [
  'create or approve the exact matrix',
  'configure or perform the control',
  'review the complete in-scope',
  'assign named operators',
  'according to the approved design',
  'where applicable',
  'as appropriate',
  'implement the control',
];

function variants(record) {
  return Object.entries(record?.how_to_implement || {})
    .filter(([, value]) => value && typeof value === 'object');
}

function auditVariant(controlId, variantName, variant) {
  const text = JSON.stringify(variant).toLowerCase();
  const blocking = BLOCKED_BOILERPLATE.filter((phrase) => text.includes(phrase));
  const steps = Array.isArray(variant.steps) ? variant.steps : [];
  const captureItems = Array.isArray(variant.capture_items) ? variant.capture_items : [];
  const structural = [];

  if (steps.length < 5) structural.push('fewer than five implementation steps');
  if (!steps.some((step) => /(sign in|open |select |click |go to |under |left menu|navigation)/i.test(String(step)))) {
    structural.push('no navigation action');
  }
  if (!steps.some((step) => /(confirm|verify|status|visible|shows|result|pass|fail|needs work)/i.test(String(step)))) {
    structural.push('no visible success or failure check');
  }
  if (!steps.some((step) => /(needs work|poa&m)/i.test(String(step)))) {
    structural.push('no explicit failure handling');
  }
  if (captureItems.length < 2) structural.push('fewer than two explicit capture items');
  if (!captureItems.every((item) => /full page/i.test(String(item?.instructions || '')))) {
    structural.push('capture item does not require a full-page image');
  }
  if (variant.capture_guidance_version !== 3) {
    structural.push('capture guidance is not version 3');
  }

  return {
    control_id: controlId,
    variant: variantName,
    blocking_phrases: blocking,
    structural_issues: structural,
    passes: blocking.length === 0 && structural.length === 0,
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

    const controls = await base44.asServiceRole.entities.ControlLibrary.filter(
      { active: true, framework: 'CMMC', cmmc_level: 'Level 2' },
      'sort_order',
      500,
    );
    const results = controls.flatMap((record) =>
      variants(record).map(([name, variant]) => auditVariant(record.control_id, name, variant))
    );
    const failing = results.filter((result) => !result.passes);

    return Response.json({
      ok: failing.length === 0,
      controls_scanned: controls.length,
      variants_scanned: results.length,
      capture_items_scanned: controls.reduce(
        (total, record) => total + variants(record).reduce(
          (sum, [, variant]) => sum + (Array.isArray(variant.capture_items) ? variant.capture_items.length : 0),
          0,
        ),
        0,
      ),
      passing_variants: results.length - failing.length,
      failing_variants: failing.length,
      failing,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
