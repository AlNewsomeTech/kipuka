import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import JSZip from 'npm:jszip@3.10.1';

// PHASE 4D — CANONICAL PROJECT DOCUMENT LIFECYCLE
// Every transition is authorized server-side, idempotent by transition_id,
// hash-verifies the current file, and appends an immutable audit event.
// Approval additionally recomputes the canonical source-state hash and renders
// a separate approval-complete DOCX from the exact stored source snapshot.

const MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const ALLOWED_KEYS = ['document_id', 'action', 'transition_id', 'note', 'effective_date'];
const ACTIONS = ['submit_review', 'request_changes', 'resubmit', 'approve', 'publish', 'archive'];
const GENERATE_ROLES = ['Organization Owner', 'Organization Admin', 'Compliance Manager', 'Pac-Sec Admin', 'Pac-Sec Support'];
const REVIEW_ROLES = ['Organization Owner', 'Organization Admin', 'Compliance Manager', 'Pac-Sec Admin'];
const PUBLISH_ROLES = ['Organization Owner', 'Organization Admin', 'Pac-Sec Admin'];
const APPROVAL_TAGS = ['approval.date', 'approval.record_id', 'doc.effective_date', 'doc.next_review_date'];

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function stableStringify(value: any): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}
function sourceRows(rows: any[]) {
  return (rows || []).map((r: any) => ({
    id: r.id || '', updated_date: r.updated_date || '', hash_value: r.hash_value || '',
  })).sort((a: any, b: any) => a.id.localeCompare(b.id));
}
function xmlEscape(s: any): string {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function displayName(caller: any) {
  return caller.full_name || caller.email || 'System';
}
async function fetchVerified(sr: any, fileUri: string, expectedHash: string, label: string) {
  if (!fileUri || !expectedHash) throw new Error(`${label} is missing its file URI or SHA-256.`);
  const signed = await sr.integrations.Core.CreateFileSignedUrl({ file_uri: fileUri });
  const response = await fetch(signed.signed_url);
  if (!response.ok) throw new Error(`${label} could not be fetched.`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if ((await sha256Hex(bytes)) !== expectedHash) throw new Error(`${label} hash mismatch.`);
  return bytes;
}
async function createEvent(sr: any, doc: any, caller: any, transitionId: string, action: string, fromStatus: string, toStatus: string, note: string) {
  const existing = await sr.entities.ProjectDocumentEvent.filter({ transition_id: transitionId }).catch(() => []);
  if (existing.length === 1) return existing[0];
  if (existing.length > 1) throw new Error('Duplicate lifecycle transition IDs detected.');
  const label: Record<string, string> = {
    submit_review: 'Submitted for Review', request_changes: 'Changes Requested',
    resubmit: 'Resubmitted', approve: 'Approved', publish: 'Published', archive: 'Archived',
  };
  const payload = {
    organization_id: doc.organization_id, project_id: doc.project_id, project_document_id: doc.id,
    template_key: doc.template_key, action: label[action], from_status: fromStatus, to_status: toStatus,
    transition_id: transitionId, actor_user_id: caller.id || '', actor_email: caller.email || '',
    actor_name: displayName(caller), note: note || '', document_sha256: doc.output_sha256 || '',
    source_snapshot_sha256: doc.source_snapshot_sha256 || '', event_date: new Date().toISOString(),
  };
  const eventSha = await sha256Hex(new TextEncoder().encode(stableStringify(payload)));
  return await sr.entities.ProjectDocumentEvent.create({ ...payload, event_sha256: eventSha });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const unknown = Object.keys(body).filter((k) => !ALLOWED_KEYS.includes(k));
    if (unknown.length) return Response.json({ error: `Unexpected fields: ${unknown.join(', ')}` }, { status: 400 });
    const { document_id: documentId, action, transition_id: transitionId } = body;
    const note = String(body.note || '').trim();
    if (!documentId || !transitionId || !ACTIONS.includes(action)) {
      return Response.json({ error: 'document_id, a supported action, and transition_id are required.' }, { status: 400 });
    }
    if (!/^[A-Za-z0-9_-]{12,100}$/.test(transitionId)) {
      return Response.json({ error: 'transition_id must be 12-100 URL-safe characters.' }, { status: 400 });
    }

    const sr = base44.asServiceRole;
    const isAdmin = caller.role === 'admin';
    let callerOrg: string | null = null;
    let orgRole: string | null = null;
    if (!isAdmin) {
      callerOrg = caller.organization_id;
      if (!callerOrg) return Response.json({ error: 'No organization is linked to your account.' }, { status: 403 });
      const memberships = await sr.entities.OrganizationUser.filter({ user_email: caller.email, organization_id: callerOrg }).catch(() => []);
      const active = memberships.filter((m: any) => m.status === 'Active');
      if (active.length !== 1) return Response.json({ error: 'Your organization membership is missing, inactive, or ambiguous.' }, { status: 403 });
      orgRole = active[0].role;
    }

    const doc = await sr.entities.ProjectDocument.get(documentId).catch(() => null);
    if (!doc || (!isAdmin && doc.organization_id !== callerOrg)) return Response.json({ error: 'Document not found' }, { status: 404 });
    if (doc.last_transition_id === transitionId) {
      const events = await sr.entities.ProjectDocumentEvent.filter({ transition_id: transitionId }).catch(() => []);
      if (events.length === 0) await createEvent(sr, doc, caller, transitionId, action, doc.status, doc.status, note);
      return Response.json({ document: doc, idempotent: true });
    }
    const claimed = await sr.entities.ProjectDocumentEvent.filter({ transition_id: transitionId }).catch(() => []);
    if (claimed.length) return Response.json({ error: 'transition_id has already been used.' }, { status: 409 });

    const allowedRoles = action === 'approve' || action === 'request_changes'
      ? REVIEW_ROLES : action === 'publish' || action === 'archive' ? PUBLISH_ROLES : GENERATE_ROLES;
    if (!isAdmin && caller.role !== 'technician' && !allowedRoles.includes(orgRole || '')) {
      return Response.json({ error: 'Your role is not authorized for this document transition.' }, { status: 403 });
    }
    if (action === 'request_changes' && note.length < 5) {
      return Response.json({ error: 'A clear change-request note is required.' }, { status: 400 });
    }

    const transitions: Record<string, { from: string[], to: string }> = {
      submit_review: { from: ['Draft'], to: 'In Review' },
      request_changes: { from: ['In Review'], to: 'Changes Requested' },
      resubmit: { from: ['Changes Requested'], to: 'In Review' },
      approve: { from: ['In Review'], to: 'Approved' },
      publish: { from: ['Approved'], to: 'Published' },
      archive: { from: ['Draft', 'In Review', 'Changes Requested', 'Approved', 'Published', 'Superseded'], to: 'Archived' },
    };
    const transition = transitions[action];
    if (!transition.from.includes(doc.status)) {
      return Response.json({ error: `${action} is not valid from status ${doc.status}.` }, { status: 409 });
    }

    try {
      await fetchVerified(sr, doc.file_uri, doc.output_sha256, 'Current document');
    } catch (e) {
      return Response.json({ error: e.message }, { status: 409 });
    }

    const now = new Date().toISOString();
    const actor = displayName(caller);
    const fromStatus = doc.status;
    let updates: any = { status: transition.to, last_transition_id: transitionId };

    if (['submit_review', 'resubmit'].includes(action)) {
      if ((doc.missing_fields || []).length || (doc.unresolved_fields || []).length || doc.stale) {
        return Response.json({ error: 'Resolve all missing fields and stale-source findings before review.' }, { status: 409 });
      }
      updates.review_requested_by = actor;
      updates.review_requested_date = now;
      updates.change_request_note = '';
    } else if (action === 'request_changes') {
      updates.reviewed_by = actor;
      updates.reviewed_date = now;
      updates.change_request_note = note;
    } else if (action === 'publish') {
      updates.published_by = actor;
      updates.published_date = now;
      updates.include_in_package = true;
    }

    if (action === 'approve') {
      if ((doc.missing_fields || []).length || (doc.unresolved_fields || []).length || doc.stale) {
        return Response.json({ error: 'A stale or incomplete document cannot be approved.' }, { status: 409 });
      }
      const [snapshot, project, templateRows] = await Promise.all([
        sr.entities.DocumentSourceSnapshot.get(doc.source_snapshot_id).catch(() => null),
        sr.entities.Project.get(doc.project_id).catch(() => null),
        sr.entities.DocumentTemplate.filter({ template_key: doc.template_key, template_version: doc.template_version }).catch(() => []),
      ]);
      if (!snapshot || snapshot.snapshot_sha256 !== doc.source_snapshot_sha256 || !snapshot.source_state_sha256) {
        return Response.json({ error: 'The immutable source snapshot is missing, mismatched, or predates source-state hashing.' }, { status: 409 });
      }
      if (!project || project.organization_id !== doc.organization_id || templateRows.length !== 1) {
        return Response.json({ error: 'Project, organization, or template linkage is inconsistent.' }, { status: 409 });
      }
      const template = templateRows[0];
      const snapshotPayload = {
        project_id: snapshot.project_id, organization_id: snapshot.organization_id,
        template_key: snapshot.template_key, template_version: snapshot.template_version,
        template_sha256: snapshot.template_sha256, source_state_sha256: snapshot.source_state_sha256,
        resolved_fields: snapshot.resolved_fields, source_counts: snapshot.source_counts, evidence_hashes: snapshot.evidence_hashes,
      };
      const rebuiltSnapshotSha = await sha256Hex(new TextEncoder().encode(stableStringify(snapshotPayload)));
      if (rebuiltSnapshotSha !== snapshot.snapshot_sha256) {
        return Response.json({ error: 'Source snapshot content hash mismatch.' }, { status: 409 });
      }

      const [organization, companyProfiles, scopings, components, tools, mappings, assessments, evidence, poams, objectiveLinks, configs] = await Promise.all([
        sr.entities.Organization.get(doc.organization_id).catch(() => null),
        sr.entities.CompanyProfile.filter({ organization_id: doc.organization_id }).catch(() => []),
        sr.entities.ScopingProfile.filter({ project_id: doc.project_id }).catch(() => []),
        sr.entities.SystemComponent.filter({ project_id: doc.project_id }).catch(() => []),
        sr.entities.ProjectSecurityTool.filter({ project_id: doc.project_id }).catch(() => []),
        sr.entities.ToolControlMapping.list(null, 500).catch(() => []),
        sr.entities.ControlAssessment.filter({ project_id: doc.project_id }, null, 500).catch(() => []),
        sr.entities.ProjectEvidence.filter({ project_id: doc.project_id }, null, 500).catch(() => []),
        sr.entities.ProjectPOAM.filter({ project_id: doc.project_id }, null, 500).catch(() => []),
        sr.entities.ObjectiveEvidenceLink.filter({ project_id: doc.project_id }, null, 500).catch(() => []),
        sr.entities.DocumentConfiguration.filter({ organization_id: doc.organization_id, active: true }).catch(() => []),
      ]);
      const sourceStatePayload = {
        template: { id: template.id, updated_date: template.updated_date || '', normalized_sha256: template.normalized_sha256 },
        project: sourceRows([project]), organization: sourceRows(organization ? [organization] : []),
        company_profiles: sourceRows(companyProfiles), scoping_profiles: sourceRows(scopings),
        system_components: sourceRows(components), project_security_tools: sourceRows(tools),
        tool_control_mappings: sourceRows(mappings), control_assessments: sourceRows(assessments),
        project_evidence: sourceRows(evidence), project_poams: sourceRows(poams),
        objective_evidence_links: sourceRows(objectiveLinks), document_configurations: sourceRows(configs),
      };
      const currentStateSha = await sha256Hex(new TextEncoder().encode(stableStringify(sourceStatePayload)));
      if (currentStateSha !== snapshot.source_state_sha256) {
        await sr.entities.ProjectDocument.update(doc.id, {
          stale: true, stale_reasons: ['Canonical source data changed after draft generation. Generate a new version.'],
        }).catch(() => {});
        return Response.json({ error: 'Canonical source data changed after draft generation. The draft is now stale; generate a new version.' }, { status: 409 });
      }

      const defaults = configs.filter((c: any) => !c.project_id);
      const overrides = configs.filter((c: any) => c.project_id === doc.project_id);
      if (defaults.length > 1 || overrides.length > 1) return Response.json({ error: 'Duplicate active document configuration detected.' }, { status: 409 });
      const config = overrides[0] || defaults[0] || null;
      const effectiveDate = body.effective_date || now.slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate)) return Response.json({ error: 'effective_date must be YYYY-MM-DD.' }, { status: 400 });
      const reviewDays = Math.max(1, Number(config?.review_cycle_days || 365));
      const nextReview = addDays(effectiveDate, reviewDays);
      const approvalValues: Record<string, string> = {
        'approval.date': effectiveDate, 'approval.record_id': transitionId,
        'doc.effective_date': effectiveDate, 'doc.next_review_date': nextReview,
        'doc.version': '1.0', 'revision.date': effectiveDate,
        'revision.summary': 'Approved version 1.0', 'revision.author': actor,
      };
      const fields = JSON.parse(JSON.stringify(snapshot.resolved_fields || {}));
      for (const [tag, value] of Object.entries(approvalValues)) {
        fields[tag] = { value, provenance: 'Verified approval workflow', resolved: true };
      }
      const unresolved = Object.entries(fields).filter(([tag, value]: any) => !value?.resolved && !APPROVAL_TAGS.includes(tag));
      if (unresolved.length) return Response.json({ error: 'Approval render has unresolved source fields.', fields: unresolved.map(([tag]) => tag) }, { status: 409 });

      let templateBytes: Uint8Array;
      try {
        templateBytes = await fetchVerified(sr, template.file_uri, template.normalized_sha256, 'Template asset');
      } catch (e) {
        return Response.json({ error: e.message }, { status: 409 });
      }
      const zip = await JSZip.loadAsync(templateBytes);
      const parts = Object.keys(zip.files).filter((p) => /^word\/(document|header\d*|footer\d*)\.xml$/.test(p));
      for (const part of parts) {
        let xml = await zip.files[part].async('string');
        for (const [tag, field]: any of Object.entries(fields)) {
          xml = xml.split(`{{${tag}}}`).join(xmlEscape(field.value));
        }
        zip.file(part, xml);
      }
      const scan: string[] = [];
      for (const part of Object.keys(zip.files).filter((p) => p.endsWith('.xml'))) {
        const text = (await zip.files[part].async('string')).replace(/<[^>]+>/g, '');
        if (/\{\{[a-z_.]+\}\}/.test(text)) scan.push(`${part}: unresolved merge tag`);
        if (/INFORMATION REQUIRED|Pending approval|White-Label Template|Replace all bracketed fields/i.test(text)) scan.push(`${part}: draft marker remains`);
      }
      if (scan.length) return Response.json({ error: 'Approval output scan failed.', failures: scan }, { status: 500 });
      const approvedBytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
      const approvedSha = await sha256Hex(approvedBytes);
      const approvedName = doc.file_name.replace(/\.docx$/i, '') + '_v1.0_Approved.docx';
      const uploaded = await sr.integrations.Core.UploadPrivateFile({ file: new File([approvedBytes], approvedName, { type: MIME }) });
      if (!uploaded?.file_uri) return Response.json({ error: 'Approved document upload failed.' }, { status: 502 });
      try {
        await fetchVerified(sr, uploaded.file_uri, approvedSha, 'Approved document');
      } catch (e) {
        return Response.json({ error: e.message }, { status: 502 });
      }
      updates = {
        ...updates, file_name: approvedName, file_uri: uploaded.file_uri, output_sha256: approvedSha,
        draft_file_uri: doc.draft_file_uri || doc.file_uri, draft_output_sha256: doc.draft_output_sha256 || doc.output_sha256,
        document_version: '1.0', missing_approval_fields: [], approval_record_id: transitionId,
        approved_by: actor, approved_by_email: caller.email || '', approved_date: now,
        effective_date: effectiveDate, next_review_date: nextReview, reviewed_by: actor,
        reviewed_date: now, include_in_package: true, stale: false, stale_reasons: [],
      };
    }

    const updated = await sr.entities.ProjectDocument.update(doc.id, updates);
    if (action === 'approve') {
      const older = await sr.entities.ProjectDocument.filter({ project_id: doc.project_id, template_key: doc.template_key }).catch(() => []);
      for (const prior of older.filter((d: any) => d.id !== doc.id && ['Approved', 'Published'].includes(d.status))) {
        await sr.entities.ProjectDocument.update(prior.id, { status: 'Superseded', superseded_by_document_id: doc.id }).catch(() => {});
      }
    }
    try {
      await createEvent(sr, updated, caller, transitionId, action, fromStatus, transition.to, note);
    } catch (e) {
      return Response.json({
        error: `Transition completed but audit event append failed. Retry with the same transition_id. Details: ${e.message}`,
        document: updated, recoverable: true,
      }, { status: 500 });
    }
    return Response.json({ document: updated, transition_id: transitionId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
