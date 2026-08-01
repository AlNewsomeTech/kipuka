import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ACTIONS = ['create', 'new_version', 'submit_review', 'accept', 'reject', 'archive', 'expire', 'update_quality', 'download'];
const CONTRIBUTOR_ROLES = ['Organization Owner', 'Organization Admin', 'Compliance Manager', 'IT Admin', 'Evidence Contributor', 'Pac-Sec Admin', 'Pac-Sec Support'];
const REVIEW_ROLES = ['Organization Owner', 'Organization Admin', 'Compliance Manager', 'Pac-Sec Admin'];
const SELF_REVIEW_ROLES = ['Organization Owner', 'Pac-Sec Admin'];
const MAX_FILE_BYTES = 50_000_000;
const QUALITY_KEYS = ['readable', 'dated', 'identifies_org', 'supports_control', 'no_sensitive', 'current', 'has_owner'];
const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'pdf', 'docx', 'xlsx', 'csv', 'txt', 'json', 'zip', 'log'];
const ALLOWED_KEYS = [
  'action', 'transition_id', 'project_id', 'evidence_id', 'prior_evidence_id', 'file_url',
  'original_file_name', 'evidence_title', 'evidence_type', 'control_ids', 'objective_ids',
  'description', 'evidence_date', 'expiration_date', 'retention_until', 'owner', 'source_system',
  'source_tool', 'provenance_type', 'provenance_details', 'quality_notes', 'quality_checklist', 'note',
];

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function stableStringify(value: any): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}
function cleanText(value: any, max = 4000): string {
  return String(value || '').trim().slice(0, max);
}
function cleanArray(value: any): string[] {
  return [...new Set((Array.isArray(value) ? value : []).map((v) => cleanText(v, 160)).filter(Boolean))].sort();
}
function displayName(caller: any): string {
  return caller.full_name || caller.email || 'Authenticated user';
}
function isIsoDate(value: string): boolean {
  return !value || /^\d{4}-\d{2}-\d{2}$/.test(value);
}
function sanitizePart(value: any, fallback: string): string {
  const cleaned = String(value || '').normalize('NFKD').replace(/[^A-Za-z0-9.-]+/g, '').slice(0, 70);
  return cleaned || fallback;
}
function extensionOf(name: string): string {
  const match = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : '';
}
async function fetchPublicUpload(appId: string, rawUrl: string): Promise<{ bytes: Uint8Array, mime: string }> {
  let url: URL;
  try { url = new URL(rawUrl); } catch { throw new Error('Uploaded file URL is invalid.'); }
  const expectedPrefix = `/api/apps/${appId}/files/mp/public/${appId}/`;
  if (url.protocol !== 'https:' || url.hostname !== 'base44.app' || !url.pathname.startsWith(expectedPrefix)) {
    throw new Error('Evidence ingestion accepts only a newly uploaded file from this Kipuka app.');
  }
  const response = await fetch(url.toString(), { redirect: 'error' });
  if (!response.ok) throw new Error('Uploaded evidence file could not be fetched.');
  const declared = Number(response.headers.get('content-length') || 0);
  if (declared > MAX_FILE_BYTES) throw new Error('Evidence files may not exceed 50 MB.');
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!bytes.length || bytes.length > MAX_FILE_BYTES) throw new Error('Evidence file is empty or exceeds 50 MB.');
  return { bytes, mime: cleanText(response.headers.get('content-type') || 'application/octet-stream', 160) };
}
async function fetchVerifiedPrivate(sr: any, fileUri: string, expectedHash: string): Promise<Uint8Array> {
  if (!String(fileUri || '').startsWith('mp/private/')) throw new Error('Evidence is not stored in canonical private storage.');
  if (!/^[a-f0-9]{64}$/i.test(expectedHash || '')) throw new Error('Evidence is missing a valid SHA-256 hash.');
  const signed = await sr.integrations.Core.CreateFileSignedUrl({ file_uri: fileUri });
  const response = await fetch(signed.signed_url);
  if (!response.ok) throw new Error('Evidence bytes could not be fetched.');
  const bytes = new Uint8Array(await response.arrayBuffer());
  if ((await sha256Hex(bytes)) !== expectedHash) throw new Error('Evidence hash verification failed.');
  return bytes;
}
function metadataPayload(record: any) {
  return {
    organization_id: record.organization_id || '', project_id: record.project_id || '',
    evidence_title: record.evidence_title || '', evidence_type: record.evidence_type || '',
    control_ids: cleanArray(record.control_ids), objective_ids: cleanArray(record.objective_ids),
    file_uri: record.file_uri || '', file_name: record.file_name || '', original_file_name: record.original_file_name || '',
    mime_type: record.mime_type || '', file_size_bytes: Number(record.file_size_bytes || 0),
    hash_algorithm: record.hash_algorithm || 'SHA-256', hash_value: record.hash_value || '',
    description: record.description || '', evidence_date: record.evidence_date || '',
    expiration_date: record.expiration_date || '', retention_until: record.retention_until || '',
    owner: record.owner || '', source_system: record.source_system || '', source_tool: record.source_tool || '',
    provenance_type: record.provenance_type || '', provenance_details: record.provenance_details || '',
    version: Number(record.version || 1), supersedes_evidence_id: record.supersedes_evidence_id || '',
  };
}
async function metadataSha(record: any): Promise<string> {
  return await sha256Hex(new TextEncoder().encode(stableStringify(metadataPayload(record))));
}
async function createEvent(sr: any, evidence: any, caller: any, orgRole: string, transitionId: string, action: string, fromStatus: string, toStatus: string, note = '') {
  const labels: Record<string, string> = {
    create: 'Created', new_version: 'Created', submit_review: 'Submitted for Review',
    accept: 'Accepted', reject: 'Rejected', archive: 'Archived', expire: 'Expired',
    update_quality: 'Updated', download: 'Downloaded',
  };
  const payload = {
    organization_id: evidence.organization_id, project_id: evidence.project_id,
    project_evidence_id: evidence.id, action: labels[action], from_status: fromStatus || '',
    to_status: toStatus || '', transition_id: transitionId, actor_user_id: caller.id || '',
    actor_email: caller.email || '', actor_name: displayName(caller), actor_role: orgRole || caller.role || '',
    note: cleanText(note, 4000), evidence_sha256: evidence.hash_value || '',
    metadata_sha256: evidence.metadata_sha256 || '', event_date: new Date().toISOString(),
  };
  const eventSha = await sha256Hex(new TextEncoder().encode(stableStringify(payload)));
  return await sr.entities.ProjectEvidenceEvent.create({ ...payload, event_sha256: eventSha });
}
async function validateMappings(sr: any, project: any, controlIds: string[], objectiveIds: string[]) {
  const assessments = await sr.entities.ControlAssessment.filter({ project_id: project.id }, null, 500).catch(() => []);
  const allowedControls = new Set(assessments.map((a: any) => a.control_id));
  const badControls = controlIds.filter((id) => !allowedControls.has(id));
  if (badControls.length) throw new Error(`Evidence contains controls outside this project: ${badControls.join(', ')}`);
  if (!controlIds.length) throw new Error('Map evidence to at least one canonical project control.');
  if (!objectiveIds.length) return [];
  const objectives = await sr.entities.AssessmentObjectiveLibrary.filter({ active: true }, null, 500).catch(() => []);
  const byId = new Map(objectives.map((o: any) => [o.objective_id, o]));
  const selected = objectiveIds.map((id) => byId.get(id)).filter(Boolean) as any[];
  if (selected.length !== objectiveIds.length) throw new Error('One or more objective IDs are not active authoritative objectives.');
  if (selected.some((o: any) => !controlIds.includes(o.control_id))) throw new Error('Every objective must belong to a mapped evidence control.');
  return selected;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const unknown = Object.keys(body).filter((key) => !ALLOWED_KEYS.includes(key));
    if (unknown.length) return Response.json({ error: `Unexpected fields: ${unknown.join(', ')}` }, { status: 400 });
    const action = cleanText(body.action, 40);
    const transitionId = cleanText(body.transition_id, 100);
    if (!ACTIONS.includes(action) || !/^[A-Za-z0-9_-]{12,100}$/.test(transitionId)) {
      return Response.json({ error: 'A supported action and 12-100 character transition_id are required.' }, { status: 400 });
    }

    const sr = base44.asServiceRole;
    const isPlatformAdmin = caller.role === 'admin';
    let callerOrg: string | null = null;
    let orgRole = '';
    if (!isPlatformAdmin) {
      callerOrg = caller.organization_id || null;
      if (!callerOrg) return Response.json({ error: 'No organization is linked to your account.' }, { status: 403 });
      const memberships = await sr.entities.OrganizationUser.filter({ user_email: caller.email, organization_id: callerOrg }).catch(() => []);
      const active = memberships.filter((m: any) => m.status === 'Active');
      if (active.length !== 1) return Response.json({ error: 'Your organization membership is missing, inactive, or ambiguous.' }, { status: 403 });
      orgRole = active[0].role;
    } else {
      orgRole = 'Platform Admin';
    }

    const claimed = await sr.entities.ProjectEvidenceEvent.filter({ transition_id: transitionId }).catch(() => []);
    if (claimed.length) {
      const prior = claimed[0];
      if (prior.action !== ({ create: 'Created', new_version: 'Created', submit_review: 'Submitted for Review', accept: 'Accepted', reject: 'Rejected', archive: 'Archived', expire: 'Expired', update_quality: 'Updated', download: 'Downloaded' } as any)[action]) {
        return Response.json({ error: 'transition_id was already used for another action.' }, { status: 409 });
      }
      const existing = await sr.entities.ProjectEvidence.get(prior.project_evidence_id).catch(() => null);
      return Response.json({ evidence: existing, idempotent: true });
    }

    let evidence: any = null;
    let project: any = null;
    if (action === 'create' || action === 'new_version') {
      if (!isPlatformAdmin && !CONTRIBUTOR_ROLES.includes(orgRole)) return Response.json({ error: 'Your organization role cannot contribute evidence.' }, { status: 403 });
      const projectId = cleanText(body.project_id, 100);
      if (!projectId) return Response.json({ error: 'project_id is required.' }, { status: 400 });
      project = await sr.entities.Project.get(projectId).catch(() => null);
      if (!project || (!isPlatformAdmin && project.organization_id !== callerOrg)) return Response.json({ error: 'Project not found' }, { status: 404 });
      const priorId = cleanText(body.prior_evidence_id, 100);
      const prior = priorId ? await sr.entities.ProjectEvidence.get(priorId).catch(() => null) : null;
      if (priorId && (!prior || prior.project_id !== project.id || prior.organization_id !== project.organization_id)) return Response.json({ error: 'Prior evidence not found' }, { status: 404 });

      const title = cleanText(body.evidence_title, 240);
      const evidenceType = cleanText(body.evidence_type, 80) || 'Other';
      const controlIds = cleanArray(body.control_ids);
      const objectiveIds = cleanArray(body.objective_ids);
      const objectives = await validateMappings(sr, project, controlIds, objectiveIds);
      if (title.length < 3) return Response.json({ error: 'Evidence title is required.' }, { status: 400 });
      for (const key of ['evidence_date', 'expiration_date', 'retention_until']) {
        if (!isIsoDate(cleanText(body[key], 10))) return Response.json({ error: `${key} must be YYYY-MM-DD.` }, { status: 400 });
      }

      let fileUri = prior?.file_uri || '';
      let fileHash = prior?.hash_value || '';
      let fileName = prior?.file_name || '';
      let originalName = prior?.original_file_name || prior?.file_name || '';
      let mime = prior?.mime_type || 'application/octet-stream';
      let size = Number(prior?.file_size_bytes || 0);
      const publicUrl = cleanText(body.file_url, 4000);
      if (publicUrl) {
        originalName = cleanText(body.original_file_name, 240);
        const ext = extensionOf(originalName);
        if (!ALLOWED_EXTENSIONS.includes(ext)) return Response.json({ error: 'Evidence file type is not allowed.' }, { status: 400 });
        const loaded = await fetchPublicUpload('6a3a0bd467c38d3ef7400909', publicUrl);
        const organization = await sr.entities.Organization.get(project.organization_id).catch(() => null);
        fileHash = await sha256Hex(loaded.bytes);
        const date = cleanText(body.evidence_date, 10) || new Date().toISOString().slice(0, 10);
        const normalized = [
          sanitizePart(organization?.short_name || organization?.organization_name, 'Company'),
          sanitizePart(evidenceType, 'Evidence'), sanitizePart(controlIds[0], 'Control'),
          sanitizePart(body.source_tool || body.source_system, 'Source'), sanitizePart(title, 'Evidence'), date,
        ].join('_') + `.${ext}`;
        const uploaded = await sr.integrations.Core.UploadPrivateFile({ file: new File([loaded.bytes], normalized, { type: loaded.mime }) });
        if (!uploaded?.file_uri) return Response.json({ error: 'Private evidence upload failed.' }, { status: 502 });
        fileUri = uploaded.file_uri; fileName = normalized; mime = loaded.mime; size = loaded.bytes.length;
        await fetchVerifiedPrivate(sr, fileUri, fileHash);
      } else if (!prior) {
        return Response.json({ error: 'A file is required for canonical evidence.' }, { status: 400 });
      }

      const now = new Date().toISOString();
      const version = prior ? Number(prior.version || 1) + 1 : 1;
      const record: any = {
        organization_id: project.organization_id, project_id: project.id,
        control_ids: controlIds, objective_ids: objectiveIds, evidence_title: title, evidence_type: evidenceType,
        source_tool: cleanText(body.source_tool, 100) || 'None', file_uri: fileUri, file_url: '',
        file_name: fileName, original_file_name: originalName, mime_type: mime, file_size_bytes: size,
        description: cleanText(body.description, 12000), evidence_date: cleanText(body.evidence_date, 10),
        expiration_date: cleanText(body.expiration_date, 10), retention_until: cleanText(body.retention_until, 10),
        uploaded_by: displayName(caller), uploaded_by_user_id: caller.id || '', uploaded_by_email: caller.email || '',
        uploaded_date: now, owner: cleanText(body.owner, 240), review_status: 'Draft',
        quality_notes: cleanText(body.quality_notes, 8000), quality_checklist: body.quality_checklist || {},
        hash_algorithm: 'SHA-256', hash_value: fileHash, hash_verified_date: now,
        source_system: cleanText(body.source_system, 240), provenance_type: cleanText(body.provenance_type, 80) || 'Manual Upload',
        provenance_details: cleanText(body.provenance_details, 4000), version,
        supersedes_evidence_id: prior?.id || '', superseded_by_evidence_id: '', lifecycle_status: 'Current',
        last_transition_id: transitionId, last_transition_action: action,
      };
      record.metadata_sha256 = await metadataSha(record);
      evidence = await sr.entities.ProjectEvidence.create(record);
      for (const objective of objectives) {
        const duplicates = await sr.entities.ObjectiveEvidenceLink.filter({ project_id: project.id, objective_id: objective.objective_id, evidence_id: evidence.id }).catch(() => []);
        if (!duplicates.length) await sr.entities.ObjectiveEvidenceLink.create({
          organization_id: project.organization_id, project_id: project.id, control_id: objective.control_id,
          objective_id: objective.objective_id, evidence_id: evidence.id, status: 'Not Assessed',
          notes: 'Evidence linked by canonical evidence ingestion; finding remains Not Assessed until assessed.',
        });
      }
      if (prior) {
        await sr.entities.ProjectEvidence.update(prior.id, {
          review_status: 'Superseded', lifecycle_status: 'Superseded', superseded_by_evidence_id: evidence.id,
        });
      }
      try { await createEvent(sr, evidence, caller, orgRole, transitionId, action, prior?.review_status || '', 'Draft', body.note); }
      catch (e) { return Response.json({ error: `Evidence created but audit event failed. Retry with the same transition_id. Details: ${e.message}`, evidence, recoverable: true }, { status: 500 }); }
      return Response.json({ evidence, normalized_file_name: fileName, sha256: fileHash });
    }

    const evidenceId = cleanText(body.evidence_id, 100);
    if (!evidenceId) return Response.json({ error: 'evidence_id is required.' }, { status: 400 });
    evidence = await sr.entities.ProjectEvidence.get(evidenceId).catch(() => null);
    if (!evidence || (!isPlatformAdmin && evidence.organization_id !== callerOrg)) return Response.json({ error: 'Evidence not found' }, { status: 404 });
    project = await sr.entities.Project.get(evidence.project_id).catch(() => null);
    if (!project || project.organization_id !== evidence.organization_id) return Response.json({ error: 'Evidence project linkage is inconsistent.' }, { status: 409 });
    if (evidence.last_transition_id === transitionId) {
      if (evidence.last_transition_action !== action) return Response.json({ error: 'transition_id was already used for another action.' }, { status: 409 });
      return Response.json({ evidence, idempotent: true });
    }

    const fromStatus = evidence.review_status || 'Draft';
    const note = cleanText(body.note, 4000);
    const now = new Date().toISOString();
    let updates: any = { last_transition_id: transitionId, last_transition_action: action };

    if (action === 'download') {
      if (!isPlatformAdmin && !CONTRIBUTOR_ROLES.includes(orgRole) && !REVIEW_ROLES.includes(orgRole)) return Response.json({ error: 'Your role cannot download evidence.' }, { status: 403 });
      await fetchVerifiedPrivate(sr, evidence.file_uri, evidence.hash_value);
      const signed = await sr.integrations.Core.CreateFileSignedUrl({ file_uri: evidence.file_uri });
      await createEvent(sr, evidence, caller, orgRole, transitionId, action, fromStatus, fromStatus, note);
      return Response.json({ evidence_id: evidence.id, file_name: evidence.file_name, signed_url: signed.signed_url, sha256: evidence.hash_value });
    }

    if (action === 'update_quality') {
      if (!isPlatformAdmin && !CONTRIBUTOR_ROLES.includes(orgRole)) return Response.json({ error: 'Your role cannot update evidence quality.' }, { status: 403 });
      if (!['Draft', 'Needs Review', 'Rejected'].includes(fromStatus)) return Response.json({ error: 'Accepted, expired, archived, and superseded evidence is immutable.' }, { status: 409 });
      const checklist = body.quality_checklist && typeof body.quality_checklist === 'object' ? body.quality_checklist : {};
      updates.quality_checklist = Object.fromEntries(QUALITY_KEYS.map((key) => [key, Boolean(checklist[key])]));
      updates.quality_notes = cleanText(body.quality_notes, 8000);
    } else if (action === 'submit_review') {
      if (!isPlatformAdmin && !CONTRIBUTOR_ROLES.includes(orgRole)) return Response.json({ error: 'Your role cannot submit evidence.' }, { status: 403 });
      if (!['Draft', 'Rejected'].includes(fromStatus)) return Response.json({ error: 'Only Draft or Rejected evidence may be submitted.' }, { status: 409 });
      if (!evidence.file_uri || !/^[a-f0-9]{64}$/i.test(evidence.hash_value || '')) return Response.json({ error: 'Evidence must have verified private bytes and SHA-256 before review.' }, { status: 409 });
      await fetchVerifiedPrivate(sr, evidence.file_uri, evidence.hash_value);
      updates.review_status = 'Needs Review'; updates.rejection_reason = '';
    } else if (action === 'accept') {
      if (!isPlatformAdmin && !REVIEW_ROLES.includes(orgRole)) return Response.json({ error: 'Your organization role cannot accept evidence.' }, { status: 403 });
      if (fromStatus !== 'Needs Review') return Response.json({ error: 'Only evidence in Needs Review may be accepted.' }, { status: 409 });
      const samePerson = String(evidence.uploaded_by_email || '').toLowerCase() === String(caller.email || '').toLowerCase();
      if (samePerson && !isPlatformAdmin && !SELF_REVIEW_ROLES.includes(orgRole)) return Response.json({ error: 'Reviewer separation required: contributors cannot accept their own evidence.' }, { status: 403 });
      if (evidence.expiration_date && evidence.expiration_date < now.slice(0, 10)) return Response.json({ error: 'Expired evidence cannot be accepted.' }, { status: 409 });
      if (!evidence.retention_until || evidence.retention_until < now.slice(0, 10)) return Response.json({ error: 'A current retention-until date is required before acceptance.' }, { status: 409 });
      const missingQuality = QUALITY_KEYS.filter((key) => !evidence.quality_checklist?.[key]);
      if (missingQuality.length) return Response.json({ error: `Complete every evidence quality check before acceptance: ${missingQuality.join(', ')}` }, { status: 409 });
      await fetchVerifiedPrivate(sr, evidence.file_uri, evidence.hash_value);
      const rebuiltMetadata = await metadataSha(evidence);
      if (rebuiltMetadata !== evidence.metadata_sha256) return Response.json({ error: 'Evidence metadata hash mismatch.' }, { status: 409 });
      updates.review_status = 'Accepted'; updates.reviewed_by = displayName(caller);
      updates.reviewer_user_id = caller.id || ''; updates.reviewer_email = caller.email || '';
      updates.reviewed_date = now; updates.review_note = note; updates.rejection_reason = '';
    } else if (action === 'reject') {
      if (!isPlatformAdmin && !REVIEW_ROLES.includes(orgRole)) return Response.json({ error: 'Your organization role cannot reject evidence.' }, { status: 403 });
      if (fromStatus !== 'Needs Review') return Response.json({ error: 'Only evidence in Needs Review may be rejected.' }, { status: 409 });
      if (note.length < 10) return Response.json({ error: 'A clear rejection reason of at least 10 characters is required.' }, { status: 400 });
      updates.review_status = 'Rejected'; updates.rejection_reason = note;
      updates.reviewed_by = displayName(caller); updates.reviewer_user_id = caller.id || '';
      updates.reviewer_email = caller.email || ''; updates.reviewed_date = now; updates.review_note = note;
    } else if (action === 'expire') {
      if (!isPlatformAdmin && !REVIEW_ROLES.includes(orgRole)) return Response.json({ error: 'Your organization role cannot expire evidence.' }, { status: 403 });
      if (!['Accepted', 'Needs Review'].includes(fromStatus)) return Response.json({ error: 'Only Accepted or Needs Review evidence may be expired.' }, { status: 409 });
      updates.review_status = 'Expired'; updates.reviewed_by = displayName(caller);
      updates.reviewer_user_id = caller.id || ''; updates.reviewer_email = caller.email || '';
      updates.reviewed_date = now; updates.review_note = note || 'Evidence expired.';
    } else if (action === 'archive') {
      if (!isPlatformAdmin && !REVIEW_ROLES.includes(orgRole)) return Response.json({ error: 'Your organization role cannot archive evidence.' }, { status: 403 });
      if (evidence.retention_until && evidence.retention_until > now.slice(0, 10)) return Response.json({ error: 'Evidence cannot be archived before its retention-until date.' }, { status: 409 });
      updates.review_status = 'Archived'; updates.lifecycle_status = 'Archived';
    }

    const candidate = { ...evidence, ...updates };
    updates.metadata_sha256 = await metadataSha(candidate);
    const updated = await sr.entities.ProjectEvidence.update(evidence.id, updates);
    try { await createEvent(sr, updated, caller, orgRole, transitionId, action, fromStatus, updated.review_status, note); }
    catch (e) { return Response.json({ error: `Evidence transition completed but audit event failed. Retry with the same transition_id. Details: ${e.message}`, evidence: updated, recoverable: true }, { status: 500 }); }
    return Response.json({ evidence: updated, transition_id: transitionId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
