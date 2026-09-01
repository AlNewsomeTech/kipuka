import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const STATUSES = ['Draft', 'Review Requested', 'Approved for Assignment', 'Assigned/Implemented', 'Evidence Required', 'Evidence Submitted', 'Evidence Accepted', 'Changes Required'];
const ACTIONS = ['list', 'create', 'update_draft', 'submit_review', 'approve', 'request_changes', 'mark_assigned', 'require_evidence', 'submit_evidence', 'accept_evidence', 'reject_evidence', 'update_settings'];
const ORG_ROLES = ['Organization Owner', 'Organization Admin', 'Compliance Manager', 'IT Admin', 'Evidence Contributor', 'Executive Viewer', 'Auditor Viewer', 'Pac-Sec Support', 'Pac-Sec Admin'];
const PERMISSION_KEYS = ['create', 'approve', 'assign', 'accept_evidence'];
const DEFAULT_PERMISSIONS: Record<string, any> = {
  'Organization Owner': { create: true, approve: true, assign: true, accept_evidence: true },
  'Organization Admin': { create: true, approve: true, assign: true, accept_evidence: true },
  'Compliance Manager': { create: true, approve: true, assign: false, accept_evidence: true },
  'IT Admin': { create: true, approve: false, assign: true, accept_evidence: false },
  'Evidence Contributor': { create: true, approve: false, assign: false, accept_evidence: false },
  'Executive Viewer': { create: false, approve: false, assign: false, accept_evidence: false },
  'Auditor Viewer': { create: false, approve: false, assign: false, accept_evidence: false },
  'Pac-Sec Support': { create: true, approve: false, assign: true, accept_evidence: false },
  'Pac-Sec Admin': { create: true, approve: true, assign: true, accept_evidence: true },
  'Platform Admin': { create: true, approve: true, assign: true, accept_evidence: true },
};
const ALLOWED_KEYS = ['action', 'transition_id', 'project_id', 'workflow_id', 'task_title', 'control_id', 'implementation_system', 'draft_policy_configuration', 'business_rationale', 'affected_systems_users', 'implementation_risk', 'risk_level', 'assignment_plan', 'evidence_requirements', 'evidence_safety_note', 'comments', 'linked_evidence_ids', 'training_metadata', 'settings'];

function textValue(value: any, max = 12000): string {
  return String(value || '').trim().slice(0, max);
}
function stringArray(value: any): string[] {
  return [...new Set((Array.isArray(value) ? value : []).map((item) => textValue(item, 120)).filter(Boolean))];
}
function actorName(caller: any): string {
  return caller.full_name || caller.email || 'Authenticated user';
}
function sameActor(caller: any, userId: any, email: any): boolean {
  return (!!caller.id && caller.id === userId) || (!!caller.email && caller.email.toLowerCase() === String(email || '').toLowerCase());
}
function defaultSettings(organizationId: string) {
  return {
    organization_id: organizationId,
    training_metadata_enabled: false,
    enforce_creator_approver_separation: true,
    enforce_creator_evidence_acceptor_separation: true,
    role_permissions: DEFAULT_PERMISSIONS,
  };
}
function normalizePermissions(input: any) {
  const result: Record<string, any> = {};
  for (const role of ORG_ROLES) {
    const supplied = input?.[role] || {};
    result[role] = Object.fromEntries(PERMISSION_KEYS.map((key) => [key, supplied[key] === true]));
  }
  result['Platform Admin'] = DEFAULT_PERMISSIONS['Platform Admin'];
  return result;
}
function capabilities(settings: any, role: string) {
  return { ...(DEFAULT_PERMISSIONS[role] || {}), ...(settings.role_permissions?.[role] || {}) };
}
async function audit(sr: any, workflow: any, caller: any, role: string, transitionId: string, action: string, fromStatus: string, toStatus: string, comments = '') {
  return await sr.entities.PolicyWorkflowEvent.create({
    organization_id: workflow.organization_id,
    project_id: workflow.project_id,
    workflow_id: workflow.id,
    transition_id: transitionId,
    action,
    from_status: fromStatus || '',
    to_status: toStatus || '',
    actor_user_id: caller.id || '',
    actor_email: caller.email || '',
    actor_name: actorName(caller),
    actor_role: role,
    comments: textValue(comments, 4000),
    event_date: new Date().toISOString(),
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const unknown = Object.keys(body).filter((key) => !ALLOWED_KEYS.includes(key));
    if (unknown.length) return Response.json({ error: `Unexpected fields: ${unknown.join(', ')}` }, { status: 400 });
    const action = textValue(body.action, 40);
    if (!ACTIONS.includes(action)) return Response.json({ error: 'Unsupported workflow action.' }, { status: 400 });

    const sr = base44.asServiceRole;
    const projectId = textValue(body.project_id, 100);
    const project = projectId ? await sr.entities.Project.get(projectId).catch(() => null) : null;
    if (!project) return Response.json({ error: 'Project not found.' }, { status: 404 });

    const platformAdmin = caller.role === 'admin' || caller._app_role === 'admin';
    const platformTechnician = !platformAdmin && (caller.role === 'technician' || caller._app_role === 'technician');
    let role = platformAdmin ? 'Platform Admin' : platformTechnician ? 'Pac-Sec Support' : '';
    if (!platformAdmin && !platformTechnician) {
      if (!caller.organization_id || caller.organization_id !== project.organization_id) return Response.json({ error: 'Project not found.' }, { status: 404 });
      const memberships = await sr.entities.OrganizationUser.filter({ organization_id: project.organization_id, user_email: caller.email }).catch(() => []);
      const active = memberships.filter((row: any) => row.status === 'Active');
      if (active.length !== 1) return Response.json({ error: 'Your organization membership is missing, inactive, or ambiguous.' }, { status: 403 });
      role = active[0].role;
    }

    const storedSettings = await sr.entities.PolicyWorkflowSettings.filter({ organization_id: project.organization_id }).catch(() => []);
    const settings = storedSettings[0] || defaultSettings(project.organization_id);
    const caps = capabilities(settings, role);
    const canConfigure = platformAdmin || role === 'Pac-Sec Admin' || role === 'Organization Owner' || role === 'Organization Admin';

    if (action === 'list') {
      const [workflows, events] = await Promise.all([
        sr.entities.PolicyImplementationWorkflow.filter({ project_id: project.id }, '-updated_date', 500).catch(() => []),
        sr.entities.PolicyWorkflowEvent.filter({ project_id: project.id }, '-event_date', 1000).catch(() => []),
      ]);
      return Response.json({ workflows, events, settings, capabilities: caps, can_configure: canConfigure, actor_role: role });
    }

    if (action === 'update_settings') {
      if (!canConfigure) return Response.json({ error: 'Your role cannot configure workflow permissions.' }, { status: 403 });
      const supplied = body.settings || {};
      const update = {
        organization_id: project.organization_id,
        training_metadata_enabled: supplied.training_metadata_enabled === true,
        enforce_creator_approver_separation: supplied.enforce_creator_approver_separation !== false,
        enforce_creator_evidence_acceptor_separation: supplied.enforce_creator_evidence_acceptor_separation !== false,
        role_permissions: normalizePermissions(supplied.role_permissions),
        updated_by_email: caller.email || '',
        updated_at: new Date().toISOString(),
      };
      const saved = storedSettings[0]
        ? await sr.entities.PolicyWorkflowSettings.update(storedSettings[0].id, update)
        : await sr.entities.PolicyWorkflowSettings.create(update);
      return Response.json({ settings: saved });
    }

    const transitionId = textValue(body.transition_id, 100);
    if (!/^[A-Za-z0-9_-]{12,100}$/.test(transitionId)) return Response.json({ error: 'A unique transition_id is required.' }, { status: 400 });
    const claimed = await sr.entities.PolicyWorkflowEvent.filter({ transition_id: transitionId }).catch(() => []);
    if (claimed.length) {
      const workflow = await sr.entities.PolicyImplementationWorkflow.get(claimed[0].workflow_id).catch(() => null);
      if (!workflow || workflow.project_id !== project.id) return Response.json({ error: 'transition_id is unavailable.' }, { status: 409 });
      return Response.json({ workflow, idempotent: true });
    }

    const now = new Date().toISOString();
    const comments = textValue(body.comments, 4000);

    if (action === 'create') {
      if (!caps.create) return Response.json({ error: 'Your tenant role cannot create implementation workflows.' }, { status: 403 });
      const controlId = textValue(body.control_id, 100);
      const controls = await sr.entities.ControlLibrary.filter({ active: true, control_id: controlId }).catch(() => []);
      const control = controls.find((row: any) => row.cmmc_level === project.target_cmmc_level) || controls[0];
      if (!control) return Response.json({ error: 'Select a valid active control.' }, { status: 400 });
      const title = textValue(body.task_title, 240);
      const draft = textValue(body.draft_policy_configuration);
      const rationale = textValue(body.business_rationale);
      if (title.length < 3 || draft.length < 10 || rationale.length < 10) return Response.json({ error: 'Task title, draft details, and rationale are required.' }, { status: 400 });
      const training = settings.training_metadata_enabled && body.training_metadata && typeof body.training_metadata === 'object' ? body.training_metadata : {};
      const record = {
        organization_id: project.organization_id,
        project_id: project.id,
        control_id: control.control_id,
        control_title: control.control_title,
        implementation_system: textValue(body.implementation_system, 120) || 'Other',
        task_title: title,
        draft_policy_configuration: draft,
        business_rationale: rationale,
        affected_systems_users: textValue(body.affected_systems_users),
        implementation_risk: textValue(body.implementation_risk),
        risk_level: ['Low', 'Moderate', 'High', 'Critical'].includes(body.risk_level) ? body.risk_level : 'Moderate',
        assignment_plan: textValue(body.assignment_plan),
        evidence_requirements: textValue(body.evidence_requirements),
        evidence_safety_note: textValue(body.evidence_safety_note) || 'Capture only the configuration, assignment, and result needed to prove the control. Redact secrets, tokens, credentials, CUI content, personal data, and unrelated tenant details.',
        status: 'Draft',
        creator_user_id: caller.id || '',
        creator_email: caller.email || '',
        creator_name: actorName(caller),
        linked_evidence_ids: [],
        training_metadata: training,
        last_transition_id: transitionId,
        last_action: action,
      };
      const workflow = await sr.entities.PolicyImplementationWorkflow.create(record);
      await audit(sr, workflow, caller, role, transitionId, 'Created', '', 'Draft', comments);
      return Response.json({ workflow });
    }

    const workflowId = textValue(body.workflow_id, 100);
    const workflow = workflowId ? await sr.entities.PolicyImplementationWorkflow.get(workflowId).catch(() => null) : null;
    if (!workflow || workflow.project_id !== project.id || workflow.organization_id !== project.organization_id) return Response.json({ error: 'Workflow not found.' }, { status: 404 });
    if (!STATUSES.includes(workflow.status)) return Response.json({ error: 'Workflow status is invalid.' }, { status: 409 });

    const from = workflow.status;
    let to = from;
    let update: any = { last_transition_id: transitionId, last_action: action };

    if (action === 'update_draft') {
      if (!caps.create || !['Draft', 'Changes Required'].includes(from)) return Response.json({ error: 'This workflow cannot be edited in its current state.' }, { status: 409 });
      if (!sameActor(caller, workflow.creator_user_id, workflow.creator_email) && !canConfigure) return Response.json({ error: 'Only the creator or an authorized administrator may revise this draft.' }, { status: 403 });
      for (const key of ['task_title', 'implementation_system', 'draft_policy_configuration', 'business_rationale', 'affected_systems_users', 'implementation_risk', 'assignment_plan', 'evidence_requirements', 'evidence_safety_note']) {
        if (Object.prototype.hasOwnProperty.call(body, key)) update[key] = textValue(body[key], key === 'task_title' ? 240 : 12000);
      }
      if (['Low', 'Moderate', 'High', 'Critical'].includes(body.risk_level)) update.risk_level = body.risk_level;
      if (settings.training_metadata_enabled && body.training_metadata && typeof body.training_metadata === 'object') update.training_metadata = body.training_metadata;
    } else if (action === 'submit_review') {
      if (!caps.create || !['Draft', 'Changes Required'].includes(from)) return Response.json({ error: 'Only a draft or reworked item can be submitted.' }, { status: 409 });
      to = 'Review Requested';
      update = { ...update, status: to, submitted_by_user_id: caller.id || '', submitted_by_email: caller.email || '', submitted_at: now, change_request_comments: '' };
    } else if (action === 'approve') {
      if (!caps.approve || from !== 'Review Requested') return Response.json({ error: 'Your role cannot approve this review request.' }, { status: 403 });
      if (settings.enforce_creator_approver_separation && sameActor(caller, workflow.creator_user_id, workflow.creator_email)) return Response.json({ error: 'Separation of duties prevents the creator from approving this item.' }, { status: 403 });
      to = 'Approved for Assignment';
      update = { ...update, status: to, approved_by_user_id: caller.id || '', approved_by_email: caller.email || '', approved_at: now, review_comments: comments };
    } else if (action === 'request_changes') {
      if (!caps.approve || !['Review Requested', 'Approved for Assignment', 'Evidence Submitted'].includes(from) || !comments) return Response.json({ error: 'An authorized reviewer and comments are required to request changes.' }, { status: 403 });
      to = 'Changes Required';
      update = { ...update, status: to, change_request_comments: comments };
    } else if (action === 'mark_assigned') {
      if (!caps.assign || from !== 'Approved for Assignment') return Response.json({ error: 'Your role cannot authorize or record assignment for this item.' }, { status: 403 });
      to = 'Assigned/Implemented';
      update = { ...update, status: to, assigned_by_user_id: caller.id || '', assigned_by_email: caller.email || '', assigned_at: now };
    } else if (action === 'require_evidence') {
      if (!caps.assign || from !== 'Assigned/Implemented') return Response.json({ error: 'Only an authorized assigner can require evidence after implementation.' }, { status: 403 });
      to = 'Evidence Required';
      update = { ...update, status: to };
    } else if (action === 'submit_evidence') {
      if (!caps.create || from !== 'Evidence Required') return Response.json({ error: 'Evidence can only be submitted when it is required.' }, { status: 409 });
      const ids = stringArray(body.linked_evidence_ids);
      if (!ids.length) return Response.json({ error: 'Link at least one canonical evidence record.' }, { status: 400 });
      const evidence = await Promise.all(ids.map((id) => sr.entities.ProjectEvidence.get(id).catch(() => null)));
      const invalid = evidence.filter((row: any) => !row || row.project_id !== project.id || !row.control_ids?.includes(workflow.control_id));
      if (invalid.length) return Response.json({ error: 'Every linked evidence record must belong to this project and control.' }, { status: 400 });
      if (evidence.some((row: any) => row.review_status !== 'Needs Review')) return Response.json({ error: 'Submit each linked evidence record for canonical review before advancing the workflow.' }, { status: 409 });
      to = 'Evidence Submitted';
      update = { ...update, status: to, linked_evidence_ids: ids, evidence_uploaded_by_user_id: caller.id || '', evidence_uploaded_by_email: caller.email || '', evidence_submitted_at: now };
    } else if (action === 'accept_evidence') {
      if (!caps.accept_evidence || from !== 'Evidence Submitted') return Response.json({ error: 'Your role cannot accept evidence for this item.' }, { status: 403 });
      if (settings.enforce_creator_evidence_acceptor_separation && (sameActor(caller, workflow.creator_user_id, workflow.creator_email) || sameActor(caller, workflow.evidence_uploaded_by_user_id, workflow.evidence_uploaded_by_email))) return Response.json({ error: 'Separation of duties prevents the creator or evidence submitter from accepting this evidence.' }, { status: 403 });
      const evidence = await Promise.all((workflow.linked_evidence_ids || []).map((id: string) => sr.entities.ProjectEvidence.get(id).catch(() => null)));
      if (!evidence.length || evidence.some((row: any) => !row || row.review_status !== 'Accepted')) return Response.json({ error: 'All linked canonical evidence must be accepted before closing this workflow.' }, { status: 409 });
      to = 'Evidence Accepted';
      update = { ...update, status: to, evidence_accepted_by_user_id: caller.id || '', evidence_accepted_by_email: caller.email || '', evidence_accepted_at: now, review_comments: comments || workflow.review_comments || '' };
    } else if (action === 'reject_evidence') {
      if (!caps.accept_evidence || from !== 'Evidence Submitted' || !comments) return Response.json({ error: 'An authorized evidence reviewer and comments are required.' }, { status: 403 });
      to = 'Changes Required';
      update = { ...update, status: to, change_request_comments: comments };
    }

    update.last_transition_from_status = from;
    update.last_transition_to_status = to;
    const saved = await sr.entities.PolicyImplementationWorkflow.update(workflow.id, update);
    await audit(sr, saved, caller, role, transitionId, action, from, to, comments);
    return Response.json({ workflow: saved });
  } catch (error) {
    return Response.json({ error: error?.message || 'Policy workflow operation failed.' }, { status: 500 });
  }
});