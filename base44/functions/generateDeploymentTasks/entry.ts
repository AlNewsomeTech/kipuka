import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// The "template" client whose deployment tasks define the canonical CMMC Level 1 task set.
// New clients receive a copy of these tasks (runbooks included), scoped to their own client_id.
const TEMPLATE_CLIENT_ID = '6a3d40cfbe3513bfa50e19fb'; // Fulcrum Defense (full 30-task L1 set)

// Natural-sort CMMC control IDs so multi-step controls group together:
// AC.L1-3.1.1 < AC.L1-3.1.2 < AC.L1-3.1.20 < IA.L1-3.5.1 ...
function ctrlKey(id) {
  if (!id || id === 'All') return [999, 999, 999, 999];
  const nums = (id.match(/\d+/g) || []).map(Number);
  while (nums.length < 4) nums.push(0);
  return nums.slice(0, 4);
}
function cmpCtrl(a, b) {
  const ka = ctrlKey(a), kb = ctrlKey(b);
  for (let i = 0; i < 4; i++) { if (ka[i] !== kb[i]) return ka[i] - kb[i]; }
  return 0;
}

// Fields copied from each template task. Excludes id/client_id/created/updated and
// any per-client progress so every generated task starts clean.
const COPY_FIELDS = [
  'title', 'phase', 'priority', 'related_control', 'related_system',
  'instructions', 'admin_center_url', 'required_screenshots', 'required_exports',
  'required_documents', 'validation_checklist',
  'runbook_purpose', 'runbook_role', 'runbook_clicks', 'runbook_setting',
  'runbook_screenshot', 'runbook_naming', 'runbook_save_location',
  'runbook_validation', 'runbook_mistakes', 'order'
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const clientId = body.client_id;
    const force = body.force === true; // if true, generate even if tasks already exist
    if (!clientId) return Response.json({ error: 'client_id is required' }, { status: 400 });

    // Don't re-seed the template client itself
    if (clientId === TEMPLATE_CLIENT_ID) {
      return Response.json({ created: 0, skipped: true, reason: 'template_client' });
    }

    // Skip if this client already has tasks (idempotent), unless forced
    const existing = await base44.asServiceRole.entities.DeploymentTask.filter({ client_id: clientId }, 'order', 1);
    if (existing.length > 0 && !force) {
      return Response.json({ created: 0, skipped: true, reason: 'tasks_already_exist' });
    }

    // Load the canonical template tasks
    const template = await base44.asServiceRole.entities.DeploymentTask.filter({ client_id: TEMPLATE_CLIENT_ID }, 'order', 100);
    if (template.length === 0) {
      return Response.json({ error: 'Template task set is empty — cannot generate tasks.' }, { status: 500 });
    }

    // Build clean copies scoped to the target client
    const newTasks = template.map((t) => {
      const copy = { client_id: clientId, status: 'Not Started', completion_status: false };
      for (const f of COPY_FIELDS) {
        if (t[f] !== undefined && t[f] !== null) copy[f] = t[f];
      }
      return copy;
    });

    // Guarantee every Level 1 control has a validation card on the board.
    // The template task set historically covered only a subset of controls, which left
    // the board (and therefore dashboard progress) unable to reach 100%.
    const l1Controls = await base44.asServiceRole.entities.CMMCControl.filter({ level: 'Level 1' });
    const coveredControls = new Set(newTasks.map((t) => t.related_control).filter(Boolean));
    let order = Math.max(0, ...newTasks.map((t) => t.order || 0));
    // Add missing validation cards in control-ID order so same-control steps stay grouped.
    const missingControls = l1Controls
      .filter((c) => !coveredControls.has(c.control_id))
      .sort((a, b) => cmpCtrl(a.control_id, b.control_id));
    for (const c of missingControls) {
      order += 1;
      newTasks.push({
        client_id: clientId,
        status: 'Not Started',
        completion_status: false,
        title: `Validate ${c.control_id} — ${c.control_title}`,
        phase: 'Level 1 Control Validation',
        priority: 'High',
        related_control: c.control_id,
        instructions: `Confirm ${c.control_id} (${c.control_title}) is implemented, capture the required evidence, then mark this task complete to advance the control.`,
        order,
      });
    }

    await base44.asServiceRole.entities.DeploymentTask.bulkCreate(newTasks);

    return Response.json({ created: newTasks.length, skipped: false });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});