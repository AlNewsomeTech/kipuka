import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// PHASE 7C — SSP AND LEGACY POLICY REVIEW LIFECYCLE
// Draft content remains editable through orgScopedWrite. Review transitions are
// server-only, idempotent, independently reviewed, source-hashed, and audited.

const ALLOWED_KEYS = ['source_entity', 'record_id', 'action', 'transition_id', 'note'];
const SOURCE_ENTITIES = ['SystemSecurityPlan', 'PolicyTemplate'];
const ACTIONS = ['submit_review', 'approve', 'reject', 'withdraw'];
const SUBMIT_ROLES = ['Organization Owner', 'Organization Admin', 'Compliance Manager', 'Pac-Sec Admin', 'Pac-Sec Support'];
const REVIEW_ROLES = ['Organization Owner', 'Organization Admin', 'Compliance Manager', 'Pac-Sec Admin'];
const SSP_FIELDS = [
  'ssp_title', 'system_name', 'system_description', 'system_purpose',
  'authorization_boundary', 'environment_description', 'cui_description',
  'fci_description', 'user_population', 'asset_summary', 'network_summary',
  'cloud_services_summary', 'external_service_provider_summary',
  'roles_and_responsibilities', 'inherited_controls_summary',
  'shared_responsibility_summary', 'control_implementation_summary',
  'linked_poam_summary', 'revision_history', 'version',
];
const POLICY_FIELDS = [
  'policy_name', 'policy_category', 'mapped_control_ids', 'policy_body',
  'version', 'owner', 'effective_date', 'review_date', 'family_code',
  'doc_kind', 'unresolved_placeholders', 'unresolved_placeholders_count',
];

function text(value: any): string { return String(value ?? '').trim(); }
function stableStringify(value: any): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}
async function sha256Hex(value: any): Promise<string> {
  const bytes = value instanceof Uint8Array ? value : new TextEncoder().encode(String(value));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function displayName(caller: any) { return caller.full_name || caller.email || 'System'; }
function sourcePayload(sourceEntity: string, record: any) {
  const fields = sourceEntity === 'SystemSecurityPlan' ? SSP_FIELDS : POLICY_FIELDS;
  const payload: Record<string, any> = {
    source_entity: sourceEntity,
    record_id: record.id || '',
    organization_id: record.organization_id || '',
    project_id: record.project_id || '',
  };
  for (const field of fields) {
    const value = record[field];
    payload[field] = Array.isArray(value) ? [...value].sort() : (value ?? '');
  }
  return payload;
}
async function sourceHash(sourceEntity: string, record: any) {
  return await sha256Hex(stableStringify(sourcePayload(sourceEntity, record)));
}
function validateComplete(sourceEntity: string, record: any): string[] {
  const missing: string[] = [];
  if (sourceEntity === 'SystemSecurityPlan') {
    for (const field of SSP_FIELDS.filter((f) => f !== 'revision_history')) {
      if (!text(record[field]).replace(/<[^>]+>/g, '').trim()) missing.push(field);
    }
  } else {
    for (const field of ['policy_name', 'policy_category', 'policy_body', 'version', 'owner', 'effective_date', 'review_date', 'family_code', 'doc_kind']) {
      if (!text(record[field]).replace(/<[^>]+>/g, '').trim()) missing.push(field);
    }
    if (!(record.mapped_control_ids || []).length) missing.push('mapped_control_ids');
    if (Number(record.unresolved_placeholders_count || 0) > 0 || text(record.unresolved_placeholders)) {
      missing.push('unresolved_placeholders');
    }
    if (record.is_master_template === true) missing.push('project_policy_required');
  }
  return missing;
}
async function appendEvent(sr: any, record: any, sourceEntity: string, caller: any, transitionId: string, action: string, fromStatus: string, toStatus: string, note: string, hash: string) {
  const prior = await sr.entities.FinalDocumentReviewEvent
    .filter({ source_entity: sourceEntity, source_record_id: record.id }, '-event_date', 500)
    .catch(() => []);
  const existing = prior.filter((e: any) => e.transition_id === transitionId);
  if (existing.length === 1) return existing[0];
  if (existing.length > 1) throw new Error('Duplicate final-document transition IDs detected.');
  const payload = {
    organization_id: record.organization_id,
    project_id: record.project_id,
    source_entity: sourceEntity,
    source_record_id: record.id,
    action,
    from_status: fromStatus,
    to_status: toStatus,
    transition_id: transitionId,
    actor_user_id: caller.id || '',
    actor_email: caller.email || '',
    actor_name: displayName(caller),
    actor_role: caller.role || caller._app_role || '',
    note,
    source_sha256: hash,
    previous_event_sha256: prior[0]?.event_sha256 || '',
    event_date: new Date().toISOString(),
  };
  const eventSha = await sha256Hex(stableStringify(payload));
  return await sr.entities.FinalDocumentReviewEvent.create({ ...payload, event_sha256: eventSha });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const unknown = Object.keys(body).filter((key) => !ALLOWED_KEYS.includes(key));
    if (unknown.length) return Response.json({ error: `Unexpected fields: ${unknown.join(', ')}` }, { status: 400 });

    const sourceEntity = body.source_entity;
    const recordId = body.record_id;
    const action = body.action;
    const transitionId = text(body.transition_id);
    const note = text(body.note);
    if (!SOURCE_ENTITIES.includes(sourceEntity) || !recordId || !ACTIONS.includes(action)) {
      return Response.json({ error: 'source_entity, record_id, and a supported action are required.' }, { status: 400 });
    }
    if (!/^[A-Za-z0-9_-]{12,100}$/.test(transitionId)) {
      return Response.json({ error: 'transition_id must be 12-100 URL-safe characters.' }, { status: 400 });
    }
    if (action === 'reject' && note.length < 5) {
      return Response.json({ error: 'A clear rejection note of at least 5 characters is required.' }, { status: 400 });
    }

    const sr = base44.asServiceRole;
    const isPlatformAdmin = caller.role === 'admin' || caller._app_role === 'admin';
    let orgRole = isPlatformAdmin ? 'Platform Admin' : '';
    let callerOrg = caller.organization_id || '';
    if (!isPlatformAdmin) {
      if (!callerOrg) return Response.json({ error: 'No organization is linked to your account.' }, { status: 403 });
      const memberships = await sr.entities.OrganizationUser
        .filter({ user_email: caller.email, organization_id: callerOrg })
        .catch(() => []);
      const active = memberships.filter((m: any) => m.status === 'Active');
      if (active.length !== 1) return Response.json({ error: 'Your organization membership is missing, inactive, or ambiguous.' }, { status: 403 });
      orgRole = active[0].role;
      if (!(action === 'approve' || action === 'reject' ? REVIEW_ROLES : SUBMIT_ROLES).includes(orgRole)) {
        return Response.json({ error: 'Your active organization role is not authorized for this transition.' }, { status: 403 });
      }
    }

    const record = await sr.entities[sourceEntity].get(recordId).catch(() => null);
    if (!record || !record.project_id || !record.organization_id || (!isPlatformAdmin && record.organization_id !== callerOrg)) {
      return Response.json({ error: 'Document not found' }, { status: 404 });
    }
    const project = await sr.entities.Project.get(record.project_id).catch(() => null);
    if (!project || project.organization_id !== record.organization_id) {
      return Response.json({ error: 'Document project linkage is invalid.' }, { status: 409 });
    }
    if (sourceEntity === 'PolicyTemplate' && record.is_master_template === true) {
      return Response.json({ error: 'Master templates cannot enter project review.' }, { status: 409 });
    }

    if (record.last_transition_id === transitionId) {
      if (record.last_transition_action !== action) return Response.json({ error: 'transition_id was already used for another action.' }, { status: 409 });
      const events = await sr.entities.FinalDocumentReviewEvent.filter({ transition_id: transitionId }).catch(() => []);
      if (!events.length) {
        const hash = await sourceHash(sourceEntity, record);
        await appendEvent(sr, record, sourceEntity, caller, transitionId,
          action === 'submit_review' ? 'Submitted for Review' : action === 'approve' ? 'Approved' : action === 'reject' ? 'Rejected' : 'Withdrawn',
          record.approval_status, record.approval_status, note, hash);
      }
      return Response.json({ document: record, idempotent: true });
    }
    const claimed = await sr.entities.FinalDocumentReviewEvent.filter({ transition_id: transitionId }).catch(() => []);
    if (claimed.length) return Response.json({ error: 'transition_id has already been used.' }, { status: 409 });

    const status = record.approval_status || 'Draft';
    const transitions: Record<string, { from: string[], to: string, label: string }> = {
      submit_review: { from: ['Draft'], to: 'In Review', label: 'Submitted for Review' },
      approve: { from: ['In Review'], to: 'Approved', label: 'Approved' },
      reject: { from: ['In Review'], to: 'Draft', label: 'Rejected' },
      withdraw: { from: ['In Review'], to: 'Draft', label: 'Withdrawn' },
    };
    const transition = transitions[action];
    if (!transition.from.includes(status)) {
      return Response.json({ error: `${action} is not valid from status ${status}.` }, { status: 409 });
    }
    if (action === 'withdraw') {
      const sameRequester = (record.review_requested_by_user_id && record.review_requested_by_user_id === caller.id)
        || (record.review_requested_by_email && record.review_requested_by_email === caller.email);
      if (!sameRequester && !isPlatformAdmin) return Response.json({ error: 'Only the submitter may withdraw this review.' }, { status: 403 });
    }
    if (action === 'approve' || action === 'reject') {
      const sameReviewer = (record.review_requested_by_user_id && record.review_requested_by_user_id === caller.id)
        || (record.review_requested_by_email && record.review_requested_by_email === caller.email);
      if (sameReviewer) return Response.json({ error: 'You cannot review a document you submitted.' }, { status: 403 });
    }

    const hash = await sourceHash(sourceEntity, record);
    const now = new Date().toISOString();
    const updates: Record<string, any> = {
      approval_status: transition.to,
      last_transition_id: transitionId,
      last_transition_action: action,
    };

    if (action === 'submit_review') {
      const missing = validateComplete(sourceEntity, record);
      if (missing.length) {
        return Response.json({ error: `Complete these fields before review: ${missing.join(', ')}.` }, { status: 409 });
      }
      updates.review_request_id = transitionId;
      updates.review_source_sha256 = hash;
      updates.review_requested_by_user_id = caller.id || '';
      updates.review_requested_by_email = caller.email || '';
      updates.review_requested_by_name = displayName(caller);
      updates.review_requested_date = now;
      updates.review_note = '';
      updates.reviewed_by_user_id = '';
      updates.reviewed_by_email = '';
      updates.reviewed_by_name = '';
      updates.reviewed_by_role = '';
      updates.reviewed_date = '';
      updates.approval_record_id = '';
      updates.approval_source_sha256 = '';
      updates.approved_by = '';
      updates.approved_date = '';
    } else if (action === 'approve') {
      if (!record.review_source_sha256 || hash !== record.review_source_sha256) {
        return Response.json({ error: 'Document content changed after submission. Return it to Draft and submit the current content.' }, { status: 409 });
      }
      updates.reviewed_by_user_id = caller.id || '';
      updates.reviewed_by_email = caller.email || '';
      updates.reviewed_by_name = displayName(caller);
      updates.reviewed_by_role = orgRole;
      updates.reviewed_date = now;
      updates.approval_record_id = transitionId;
      updates.approval_source_sha256 = hash;
      updates.approved_by = displayName(caller);
      updates.approved_date = now.slice(0, 10);
      updates.review_note = note;
    } else {
      updates.reviewed_by_user_id = action === 'reject' ? caller.id || '' : '';
      updates.reviewed_by_email = action === 'reject' ? caller.email || '' : '';
      updates.reviewed_by_name = action === 'reject' ? displayName(caller) : '';
      updates.reviewed_by_role = action === 'reject' ? orgRole : '';
      updates.reviewed_date = action === 'reject' ? now : '';
      updates.review_note = note;
      updates.approval_record_id = '';
      updates.approval_source_sha256 = '';
      updates.approved_by = '';
      updates.approved_date = '';
    }

    const saved = await sr.entities[sourceEntity].update(record.id, updates);
    await appendEvent(sr, saved, sourceEntity, caller, transitionId, transition.label, status, transition.to, note, hash);
    return Response.json({ document: saved });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
