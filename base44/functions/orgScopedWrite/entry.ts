import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ORG WRITE GATEKEEPER — the single WRITE path for client-role users.
//
// Resolves the caller's organization membership server-side from
// OrganizationUser (never trusting a client-supplied organization_id),
// forces organization_id on creates, verifies the target record's
// organization_id on updates, blocks read-only org roles from all writes,
// and strips fields clients must never set.
//
// Payload: { entity, operation: 'create'|'update', id, data }
//
// WHITELIST of entities client-role users may write.
const WRITE_WHITELIST = new Set([
  'ControlAssessment', 'Asset', 'ScopingProfile', 'ProjectPOAM',
  'SSPControlStatement', 'ProjectDiagram', 'ServiceProvider', 'IncidentResponsePlan',
  'IncidentLog', 'MockAssessmentSession', 'MockAssessmentObjective',
  'ObjectiveEvidenceLink', 'SPRSRecord', 'MaintenanceTask', 'RemediationComment',
  'PolicyTemplate', 'GuidedProgress', 'CompanyProfile', 'PostureAssessment',
]);

// Org roles that are read-only and may not write anything.
const READ_ONLY_ORG_ROLES = new Set(['Auditor Viewer', 'Executive Viewer']);

// Fields clients must never set/change, stripped from every write payload.
const STRIP_FIELDS = ['pacsec_internal_notes'];

function stripForbidden(data: any) {
  const clean = { ...(data || {}) };
  for (const f of STRIP_FIELDS) delete clean[f];
  return clean;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const entity = body.entity;
    const operation = body.operation || body.op;
    const { id, data } = body;

    if (!WRITE_WHITELIST.has(entity)) {
      return Response.json({ error: `Entity not writable: ${entity}` }, { status: 403 });
    }
    if (!['create', 'update'].includes(operation)) {
      return Response.json({ error: `Unsupported operation: ${operation}` }, { status: 400 });
    }

    // Resolve org membership + role server-side.
    // Tenant resolved from the caller's own user record only, and it must be
    // backed by an OrganizationUser membership with status exactly 'Active'.
    const org = caller.organization_id;
    if (!org) {
      return Response.json({ error: 'No organization is linked to your account. Contact your administrator.' }, { status: 403 });
    }
    const memberships = await base44.asServiceRole.entities.OrganizationUser
      .filter({ user_email: caller.email, organization_id: org })
      .catch(() => []);
    const active = memberships.filter((m: any) => m.status === 'Active');
    if (active.length !== 1) {
      return Response.json({ error: 'Your organization membership is missing or ambiguous. Contact your administrator.' }, { status: 403 });
    }
    const orgRole = active[0].role;
    if (READ_ONLY_ORG_ROLES.has(orgRole)) {
      return Response.json({ error: `Your role (${orgRole}) has read-only access and cannot make changes.` }, { status: 403 });
    }

    // Org gating: fully disabled or expired subscription → clean 403.
    const orgRecord = await base44.asServiceRole.entities.Organization.get(org).catch(() => null);
    if (orgRecord?.fully_disabled === true) {
      return Response.json({ error: 'Your organization\'s access has been disabled. Contact Pac-Sec support.' }, { status: 403 });
    }
    const endDate = orgRecord?.subscription_end_date;
    if (endDate && new Date(endDate) < new Date(new Date().toDateString())) {
      return Response.json({ error: 'Your organization\'s subscription has ended. Contact Pac-Sec support to restore access.' }, { status: 403 });
    }

    const svc = base44.asServiceRole.entities[entity];
    const clean = stripForbidden(data);
    // organization_id is never accepted from the client on any operation.
    delete clean.organization_id;

    // Any project_id referenced by this write must belong to the caller's org.
    const projectBelongsToOrg = async (projectId: string) => {
      const p = await base44.asServiceRole.entities.Project.get(projectId).catch(() => null);
      return !!p && p.organization_id === org;
    };

    if (operation === 'create') {
      // PolicyTemplate: never let clients create master templates.
      if (entity === 'PolicyTemplate') clean.is_master_template = false;
      if (clean.project_id && !(await projectBelongsToOrg(clean.project_id))) {
        return Response.json({ error: 'Not found' }, { status: 404 });
      }
      const record = await svc.create({ ...clean, organization_id: org });
      return Response.json({ record });
    }

    // update — verify the target belongs to the caller's org.
    if (!id) return Response.json({ error: 'id required' }, { status: 400 });
    const existing = await svc.get(id).catch(() => null);
    if (!existing || existing.organization_id !== org) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }
    // PolicyTemplate: master templates are read-only to clients.
    if (entity === 'PolicyTemplate' && existing.is_master_template === true) {
      return Response.json({ error: 'Master templates are read-only.' }, { status: 403 });
    }
    // The record's existing project (if any) must belong to the caller's org,
    // and a newly supplied project_id must too — updates can never move a
    // record across organizations or projects of another tenant.
    if (existing.project_id && !(await projectBelongsToOrg(existing.project_id))) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }
    if (clean.project_id && !(await projectBelongsToOrg(clean.project_id))) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }
    // organization_id (already stripped above) and master flag can never change.
    if (entity === 'PolicyTemplate') delete clean.is_master_template;
    const record = await svc.update(id, clean);
    return Response.json({ record });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});