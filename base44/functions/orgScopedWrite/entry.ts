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
// Phase 7C final-document drafts are service-write-only, so both reviewed
// source entities must remain explicit members of this backend allowlist.
const WRITE_WHITELIST = new Set([
  'ControlAssessment', 'Asset', 'ScopingProfile', 'ProjectPOAM',
  'SSPControlStatement', 'ProjectDiagram', 'ServiceProvider', 'IncidentResponsePlan',
  'IncidentLog', 'MockAssessmentSession', 'MockAssessmentObjective',
  'ObjectiveEvidenceLink', 'SPRSRecord', 'MaintenanceTask', 'RemediationComment',
  'PolicyTemplate', 'SystemSecurityPlan', 'GuidedProgress', 'CompanyProfile', 'PostureAssessment',
]);

// Org roles that are read-only and may not write anything.
const READ_ONLY_ORG_ROLES = new Set(['Auditor Viewer', 'Executive Viewer']);

// Fields clients must never set/change, stripped from every write payload.
const STRIP_FIELDS = ['pacsec_internal_notes'];
const REVIEW_PROVENANCE_FIELDS = new Set([
  'approval_status', 'approved_by', 'approved_date', 'review_request_id',
  'review_source_sha256', 'review_requested_by_user_id', 'review_requested_by_email',
  'review_requested_by_name', 'review_requested_date', 'reviewed_by_user_id',
  'reviewed_by_email', 'reviewed_by_name', 'reviewed_by_role', 'reviewed_date',
  'review_note', 'approval_record_id', 'approval_source_sha256',
  'last_transition_id', 'last_transition_action',
]);
const REVIEWED_SOURCE_ENTITIES = new Set(['PolicyTemplate', 'SystemSecurityPlan']);
const REVIEW_INVALIDATION = {
  approval_status: 'Draft', approved_by: '', approved_date: '',
  review_request_id: '', review_source_sha256: '',
  review_requested_by_user_id: '', review_requested_by_email: '',
  review_requested_by_name: '', review_requested_date: '',
  reviewed_by_user_id: '', reviewed_by_email: '', reviewed_by_name: '',
  reviewed_by_role: '', reviewed_date: '', review_note: '',
  approval_record_id: '', approval_source_sha256: '',
  last_transition_id: '', last_transition_action: '',
};

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
    if (!['create', 'update', 'bulkCreate'].includes(operation)) {
      return Response.json({ error: `Unsupported operation: ${operation}` }, { status: 400 });
    }

    // Resolve org membership + role server-side.
    // Tenant resolved from the caller's own user record only, and it must be
    // backed by an OrganizationUser membership with status exactly 'Active'.
    // Base44 exposes the authenticated app role as `_app_role` in some
    // function runtimes while preserving `role` in others. Both values come
    // from auth.me(), never from the request payload.
    const isPlatformAdmin = caller.role === 'admin' || caller._app_role === 'admin';
    let org = caller.organization_id || '';
    let orgRole = isPlatformAdmin ? 'Platform Admin' : '';
    if (!isPlatformAdmin) {
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
      orgRole = active[0].role;
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
    }

    const svc = base44.asServiceRole.entities[entity];
    const clean = stripForbidden(data);
    // organization_id and review provenance are never accepted from the client.
    delete clean.organization_id;
    if (REVIEWED_SOURCE_ENTITIES.has(entity)) {
      const protectedKeys = Object.keys(clean).filter((key) => REVIEW_PROVENANCE_FIELDS.has(key));
      if (protectedKeys.length) {
        return Response.json({ error: 'Approval and review fields require the independent final-document review workflow.' }, { status: 403 });
      }
    }

    // Applicability fields and the Not Applicable status are controlled only by
    // manageControlApplicability, including for platform technicians/support.
    if (entity === 'ControlAssessment') {
      const protectedFields = Object.keys(clean).filter((key) => key.startsWith('not_applicable_'));
      if (protectedFields.length || clean.status === 'Not Applicable') {
        return Response.json({ error: 'Not Applicable findings require an independent applicability review.' }, { status: 403 });
      }
    }

    // Any project_id referenced by this write must belong to the caller's org.
    // Platform admins may operate across tenants, but the record is still
    // forced to the organization derived from its Project.
    const projectBelongsToOrg = async (projectId: string) => {
      const p = await base44.asServiceRole.entities.Project.get(projectId).catch(() => null);
      if (!p?.organization_id) return false;
      if (isPlatformAdmin) {
        org = p.organization_id;
        return true;
      }
      return p.organization_id === org;
    };

    const prepareCreate = async (input: any) => {
      const item = stripForbidden(input);
      delete item.organization_id;
      if (REVIEWED_SOURCE_ENTITIES.has(entity)) {
        for (const key of REVIEW_PROVENANCE_FIELDS) delete item[key];
      }
      const isMasterPolicy = entity === 'PolicyTemplate' && item.is_master_template === true;
      if (isMasterPolicy && !isPlatformAdmin) {
        return { error: Response.json({ error: 'Only a platform admin may create master templates.' }, { status: 403 }) };
      }
      if (entity === 'PolicyTemplate') item.is_master_template = isMasterPolicy;
      if (REVIEWED_SOURCE_ENTITIES.has(entity)) item.approval_status = isMasterPolicy ? 'Template' : 'Draft';
      if (!isMasterPolicy) {
        if (!item.project_id || !(await projectBelongsToOrg(item.project_id))) {
          return { error: Response.json({ error: 'Not found' }, { status: 404 }) };
        }
      }
      return { item: { ...item, organization_id: isMasterPolicy ? '' : org } };
    };

    if (operation === 'create') {
      const prepared = await prepareCreate(clean);
      if (prepared.error) return prepared.error;
      const record = await svc.create(prepared.item);
      return Response.json({ record });
    }

    if (operation === 'bulkCreate') {
      const rows = Array.isArray(data) ? data : body.records;
      if (!Array.isArray(rows) || rows.length < 1 || rows.length > 100) {
        return Response.json({ error: 'bulkCreate requires 1-100 records.' }, { status: 400 });
      }
      const preparedRows = [];
      for (const row of rows) {
        const prepared = await prepareCreate(row);
        if (prepared.error) return prepared.error;
        preparedRows.push(prepared.item);
      }
      const records = await svc.bulkCreate(preparedRows);
      return Response.json({ records });
    }

    // update — verify the target belongs to the caller's org.
    if (!id) return Response.json({ error: 'id required' }, { status: 400 });
    const existing = await svc.get(id).catch(() => null);
    if (!existing || (!isPlatformAdmin && existing.organization_id !== org)) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }
    if (isPlatformAdmin) org = existing.organization_id || '';
    // PolicyTemplate: master templates are read-only except to platform admins.
    if (entity === 'PolicyTemplate' && existing.is_master_template === true && !isPlatformAdmin) {
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
    const updateData = REVIEWED_SOURCE_ENTITIES.has(entity)
      && ['In Review', 'Approved'].includes(existing.approval_status)
      && Object.keys(clean).length > 0
      ? { ...clean, ...REVIEW_INVALIDATION }
      : clean;
    const record = await svc.update(id, updateData);
    return Response.json({ record });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});