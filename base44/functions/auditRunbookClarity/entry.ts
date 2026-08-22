import { createClientFromRequest } from 'npm:@base44/sdk@0.8.41';

const FORBIDDEN_NAVIGATION = [
  'kipuka',
  'project workspace',
  'kipuka training records',
];

const MAX_STEPS = 24;
const GENERIC_VENDOR_TERMS = /\b(?:microsoft|m365|entra|intune|azure|defender|purview|sharepoint|exchange|teams|onedrive)\b/i;

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
  const text = JSON.stringify(Object.values(variant)).toLowerCase();
  const blocking = BLOCKED_BOILERPLATE.filter((phrase) => text.includes(phrase));
  const forbiddenNavigation = FORBIDDEN_NAVIGATION.filter((phrase) => text.includes(phrase));
  const steps = Array.isArray(variant.steps) ? variant.steps : [];
  const captureItems = Array.isArray(variant.capture_items) ? variant.capture_items : [];
  const structural = [];

  if (forbiddenNavigation.length) {
    structural.push(`ambiguous product or workspace navigation: ${forbiddenNavigation.join(', ')}`);
  }
  if (steps.some((step) =>
    /(security\.microsoft\.com|admin\.microsoft\.com|entra\.microsoft\.com|microsoft defender portal|microsoft entra admin center)/i.test(String(step)) &&
    /(cmmc project|preliminary scope|final inventory|shared responsibility|poa&m|capture & upload)/i.test(String(step)) &&
    !/not a cmmc project/i.test(String(step))
  )) {
    structural.push('external Microsoft portal and internal CMMC project destination mixed in one step');
  }
  if (steps.length < 6) structural.push('fewer than six implementation steps');
  if (steps.length > MAX_STEPS) structural.push(`more than ${MAX_STEPS} implementation steps`);
  if (variantName === 'generic' && GENERIC_VENDOR_TERMS.test(text)) {
    structural.push('generic instructions contain vendor-specific product names');
  }
  const normalizedSteps = steps.map((step) => String(step).toLowerCase().replace(/\W+/g, ' ').trim());
  if (new Set(normalizedSteps).size !== normalizedSteps.length) structural.push('duplicate implementation steps');
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
    forbidden_navigation: forbiddenNavigation,
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
      { active: true, framework: 'CMMC' },
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
