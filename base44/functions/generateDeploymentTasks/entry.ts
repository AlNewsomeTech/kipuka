import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// The "template" client whose deployment tasks define the canonical CMMC Level 1 task set.
// New clients receive a copy of these tasks (runbooks included), scoped to their own client_id.
const TEMPLATE_CLIENT_ID = '6a3d40cfbe3513bfa50e19fb'; // Fulcrum Defense (full 30-task L1 set)

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

    // The template task set (Fulcrum Defense) is the canonical, human-reviewed board:
    // one clean step-by-step flow that already covers every Level 1 control through real,
    // named tasks. We copy it verbatim — no auto-injected abstract "Validate X" cards.
    await base44.asServiceRole.entities.DeploymentTask.bulkCreate(newTasks);

    return Response.json({ created: newTasks.length, skipped: false });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});