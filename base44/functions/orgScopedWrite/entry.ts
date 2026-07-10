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
  'ControlAssessment', 'ProjectEvidence', 'Asset', 'ScopingProfile', 'ProjectPOAM',
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
    const memberships = await base44.asServiceRole.entities.OrganizationUser
      .filter({ user_email: caller.email })
      .catch(() => []);
    const active = memberships.filter((m: any) => m.status !== 'Removed');
    if (active.length === 0) {
      return Response.json({ error: 'No organization is linked to your account. Contact your administrator.' }, { status: 403 });
    }
    const org = active[0].organization_id;
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

    if (operation === 'create') {
      // PolicyTemplate: never let clients create master templates.
      if (entity === 'PolicyTemplate') clean.is_master_template = false;
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
    // organization_id and master flag can never be changed through this path.
    delete clean.organization_id;
    if (entity === 'PolicyTemplate') delete clean.is_master_template;
    const record = await svc.update(id, clean);
    return Response.json({ record });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});