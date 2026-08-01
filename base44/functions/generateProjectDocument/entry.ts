import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import JSZip from 'npm:jszip@3.10.1';

// PHASE 4C — CANONICAL PROJECT DOCUMENT GENERATION (real DOCX drafts)
//
// Generates a DOCX draft from the exact normalized, hash-verified template
// asset, filling named merge tags across ALL document parts (body, tables,
// headers, footers, logo area) from canonical Project data only. No AI is
// used and no factual business/scope/implementation/control/evidence/owner/
// approval content is ever invented.
//
// Draft-only: every generated record is status 'Draft', version 0.N. This
// endpoint can never set Approved or Published, never overwrites the bytes of
// any existing document, and regeneration always creates a NEW record.
//
// Fail-closed ordering: render → scan → upload → verify upload → snapshot →
// ProjectDocument → supersede prior draft. No ProjectDocument row can exist
// without a verified file and snapshot; a snapshot without a document is
// reported for cleanup and is harmless (immutable provenance only).
//
// Authorization order (identical to preflightProjectDocument):
//   auth.me() → 401; platform admin passes; otherwise exactly-Active
//   OrganizationUser membership before any project data read; wrong-org → 404.
// Generation additionally requires platform admin, platform technician, or an
// Active Organization Owner/Admin (or Pac-Sec org role). Other members get 403
// and may use preflightProjectDocument instead.
//
// NOTE: the resolution core is duplicated in preflightProjectDocument — keep in sync.

const ALLOWED_BODY_KEYS = ['project_id', 'template_key', 'template_version', 'mode'];
const APPROVAL_FIELDS = ['approval.date', 'approval.record_id', 'doc.effective_date', 'doc.next_review_date'];
const GENERATE_ORG_ROLES = ['Organization Owner', 'Organization Admin', 'Pac-Sec Admin', 'Pac-Sec Support'];
const CMMC_EXPECTED: Record<string, number> = { 'Level 1': 15, 'Level 2': 110 };
const MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const PENDING_APPROVAL_TEXT = 'Pending approval — draft';

// Original white-label bracket tokens: none may survive in generated output.
const FORBIDDEN_TOKENS = [
  '[ORGANIZATION NAME]', '[INSERT LOGO]', '[VERSION]', '[POLICY OWNER / TITLE]', '[APPROVING AUTHORITY]',
  '[YYYY-MM-DD]', '[PUBLIC / INTERNAL / CONFIDENTIAL]', '[ANNUAL / OTHER]', '[RECORDS RETENTION REQUIREMENT]',
  '[DEFINED FREQUENCY]', '[REPORTING CHANNEL]', '[IDENTIFY SYSTEMS, SERVICES, FACILITIES, USERS, AND DATA]',
  '[ROLE / TEAM / SERVICE OWNER]', '[PROCEDURE OR RUNBOOK NAME / LOCATION]',
  '[PLATFORM, TENANT, DEVICE GROUP, NETWORK, OR FACILITY]', '[APPROVED REPOSITORY / KIPUKA RECORD LOCATION]',
  '[FREQUENCY / TRIGGER / RESPONSIBLE REVIEWER]', '[SERVICE DESK / SECURITY HOTLINE / INCIDENT CHANNEL]',
  '[RETENTION PERIOD / SCHEDULE AUTHORITY]', '[CHANGE SUMMARY]', '[NAME / TITLE]', '[APPROVER NAME / TITLE]',
  '[SIGNATURE OR WORKFLOW ID]', '[DOCUMENT ID]',
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
function xmlEscape(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function sanitizeNamePart(value: any): string {
  return String(value || '').normalize('NFKD').replace(/[^A-Za-z0-9-]+/g, '').slice(0, 60);
}
function sanitizeControlPart(value: any): string {
  return String(value || '').replace(/[^A-Za-z0-9.-]+/g, '').slice(0, 40);
}

function put(fields: Record<string, any>, tag: string, value: any, provenance: string) {
  const v = value == null ? '' : String(value).trim();
  fields[tag] = { value: v, provenance, resolved: v.length > 0 };
}

function resolveFields({ template, project, organization, companyProfile, scoping, components, tools, config, plannedVersion, generatedBy }: any) {
  const fields: Record<string, any> = {};
  const orgName = organization?.legal_name || organization?.organization_name || companyProfile?.company_name || '';

  put(fields, 'org.legal_name', orgName, 'Organization.legal_name/organization_name');
  put(fields, 'org.short_name', config?.filename_short_name || organization?.short_name, 'DocumentConfiguration.filename_short_name/Organization.short_name');
  put(fields, 'org.logo', orgName, 'Organization (text mark for logo area)');

  put(fields, 'doc.template_key', template?.template_key, 'DocumentTemplate.template_key');
  put(fields, 'doc.document_id', template?.document_id, 'DocumentTemplate.document_id');
  put(fields, 'doc.title', template?.title, 'DocumentTemplate.title');
  put(fields, 'doc.version', plannedVersion, 'Engine draft version');
  put(fields, 'doc.classification', config?.classification, 'DocumentConfiguration.classification');
  put(fields, 'doc.owner_name', config?.policy_owner_name, 'DocumentConfiguration.policy_owner_name');
  put(fields, 'doc.approver_name', config?.approving_authority_name, 'DocumentConfiguration.approving_authority_name');
  const cycleDays = config?.review_cycle_days;
  put(fields, 'doc.review_cycle', cycleDays ? (cycleDays === 365 ? 'Annual' : `Every ${cycleDays} days`) : '', 'DocumentConfiguration.review_cycle_days');

  put(fields, 'scope.summary', scoping?.included_systems_summary || scoping?.boundary_summary, 'ScopingProfile.included_systems_summary/boundary_summary');
  put(fields, 'scope.boundary', scoping?.boundary_summary, 'ScopingProfile.boundary_summary');
  put(fields, 'scope.included_locations', (scoping?.included_locations || []).join('; '), 'ScopingProfile.included_locations');
  put(fields, 'scope.excluded_locations', (scoping?.excluded_locations || []).join('; '), 'ScopingProfile.excluded_locations');
  const componentNames = (components || []).map((c: any) => c.component_name || c.asset_name).filter(Boolean).slice(0, 30).join('; ');
  put(fields, 'scope.systems', componentNames || scoping?.included_systems_summary, 'SystemComponent/ScopingProfile');
  put(fields, 'scope.data_flow', scoping?.data_flow_summary, 'ScopingProfile.data_flow_summary');

  const enabledTools = (tools || []).filter((t: any) => t.tool_status === 'Enabled').map((t: any) => t.tool_name);
  const stack = project?.implementation_stack || '';
  put(fields, 'implementation.control_location', stack ? (enabledTools.length ? `${stack} (managed with ${enabledTools.join(', ')})` : stack) : '', 'Project.implementation_stack/ProjectSecurityTool');
  put(fields, 'implementation.responsible_team', config?.default_responsible_team, 'DocumentConfiguration.default_responsible_team');
  put(fields, 'implementation.reporting_channel', config?.reporting_channel, 'DocumentConfiguration.reporting_channel');
  put(fields, 'implementation.repository', config?.evidence_repository, 'DocumentConfiguration.evidence_repository');
  put(fields, 'implementation.procedure_location', config?.document_repository, 'DocumentConfiguration.document_repository');
  put(fields, 'implementation.retention_period', config?.retention_schedule, 'DocumentConfiguration.retention_schedule');
  put(fields, 'implementation.review_trigger', cycleDays ? `Reviewed every ${cycleDays} days or upon significant change` : '', 'DocumentConfiguration.review_cycle_days');
  put(fields, 'implementation.defined_frequency', cycleDays ? (cycleDays === 365 ? 'Annually' : `Every ${cycleDays} days`) : '', 'DocumentConfiguration.review_cycle_days');

  const today = new Date().toISOString().slice(0, 10);
  put(fields, 'revision.date', today, 'Engine draft generation date');
  put(fields, 'revision.summary', `Draft ${plannedVersion} generated from canonical project data`, 'Engine');
  put(fields, 'revision.author', generatedBy, 'Generating user');

  for (const tag of APPROVAL_FIELDS) put(fields, tag, '', 'Approval workflow (not implemented in 4C — never fabricated)');
  return fields;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const unknown = Object.keys(body).filter((k) => !ALLOWED_BODY_KEYS.includes(k));
    if (unknown.length) return Response.json({ error: `Unexpected fields: ${unknown.join(', ')}` }, { status: 400 });
    const { project_id: projectId, template_key: templateKey, template_version: templateVersion } = body;
    if (!projectId || !templateKey) return Response.json({ error: 'project_id and template_key are required' }, { status: 400 });
    // Draft-only endpoint. Approval is not implemented in Phase 4C.
    if (body.mode !== undefined && body.mode !== 'draft') {
      return Response.json({ error: "Only mode 'draft' is supported. Approved/Published transitions are not available." }, { status: 400 });
    }

    const sr = base44.asServiceRole;
    // --- Membership gate BEFORE project data reads ---
    const isPlatformAdmin = caller.role === 'admin';
    let callerOrg: string | null = null;
    let orgRole: string | null = null;
    if (!isPlatformAdmin) {
      callerOrg = caller.organization_id;
      if (!callerOrg) return Response.json({ error: 'No organization is linked to your account.' }, { status: 403 });
      const memberships = await sr.entities.OrganizationUser.filter({ user_email: caller.email, organization_id: callerOrg }).catch(() => []);
      const active = memberships.filter((m: any) => m.status === 'Active');
      if (active.length !== 1) return Response.json({ error: 'Your organization membership is missing, inactive, or ambiguous.' }, { status: 403 });
      orgRole = active[0].role;
      // Generation role gate: platform technician or org Owner/Admin (Pac-Sec org roles included).
      if (caller.role !== 'technician' && !GENERATE_ORG_ROLES.includes(orgRole)) {
        return Response.json({ error: 'Your role may run preflight and read documents but not generate drafts. Ask an Organization Owner/Admin.' }, { status: 403 });
      }
    }

    const project = await sr.entities.Project.get(projectId).catch(() => null);
    if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });
    if (!isPlatformAdmin && project.organization_id !== callerOrg) return Response.json({ error: 'Project not found' }, { status: 404 });
    const org = project.organization_id;
    if (!org) return Response.json({ error: 'Project is not linked to an organization.' }, { status: 409 });

    // --- Template record + asset verification ---
    const templateQuery: any = { template_key: templateKey, active: true };
    if (templateVersion) templateQuery.template_version = templateVersion;
    const templates = await sr.entities.DocumentTemplate.filter(templateQuery).catch(() => []);
    if (templates.length !== 1) {
      return Response.json({ error: templates.length === 0 ? 'Template is not imported into the canonical library.' : 'Template selection is ambiguous — multiple active versions match.' }, { status: 409 });
    }
    const template = templates[0];
    if (!template.file_uri || !template.normalized_sha256) {
      return Response.json({ error: 'Template record is missing its verified asset.' }, { status: 409 });
    }
    const signedTpl = await sr.integrations.Core.CreateFileSignedUrl({ file_uri: template.file_uri });
    const tplRes = await fetch(signedTpl.signed_url);
    if (!tplRes.ok) return Response.json({ error: 'Template asset could not be fetched.' }, { status: 502 });
    const tplBytes = new Uint8Array(await tplRes.arrayBuffer());
    const tplHash = await sha256Hex(tplBytes);
    if (tplHash !== template.normalized_sha256) {
      return Response.json({ error: 'Template asset hash mismatch — generation refused.' }, { status: 409 });
    }

    // --- Canonical source loads (allowlist only; legacy Client/ControlProgress/EvidenceItem/Screenshot/POAMItem are never queried) ---
    const [organization, companyProfiles, scopings, components, tools, toolMappings, assessments, evidence, poams, objectiveLinks, configs, existingDocs] = await Promise.all([
      sr.entities.Organization.get(org).catch(() => null),
      sr.entities.CompanyProfile.filter({ organization_id: org }).catch(() => []),
      sr.entities.ScopingProfile.filter({ project_id: projectId }).catch(() => []),
      sr.entities.SystemComponent.filter({ project_id: projectId }).catch(() => []),
      sr.entities.ProjectSecurityTool.filter({ project_id: projectId }).catch(() => []),
      sr.entities.ToolControlMapping.list(null, 500).catch(() => []),
      sr.entities.ControlAssessment.filter({ project_id: projectId }, null, 500).catch(() => []),
      sr.entities.ProjectEvidence.filter({ project_id: projectId }, null, 500).catch(() => []),
      sr.entities.ProjectPOAM.filter({ project_id: projectId }, null, 500).catch(() => []),
      sr.entities.ObjectiveEvidenceLink.filter({ project_id: projectId }, null, 500).catch(() => []),
      sr.entities.DocumentConfiguration.filter({ organization_id: org, active: true }).catch(() => []),
      sr.entities.ProjectDocument.filter({ project_id: projectId, template_key: templateKey }).catch(() => []),
    ]);
    const scoping = scopings[0] || null;
    if (scoping && scoping.organization_id && scoping.organization_id !== org) {
      return Response.json({ error: 'Inconsistent project/organization/scope linkage.' }, { status: 409 });
    }

    // --- Configuration: enforce one active org default, at most one active project override ---
    const defaults = configs.filter((c: any) => !c.project_id);
    const overrides = configs.filter((c: any) => c.project_id === projectId);
    if (defaults.length > 1 || overrides.length > 1) {
      return Response.json({ error: 'Duplicate active document configuration detected — deactivate extras before generating.' }, { status: 409 });
    }
    const config = overrides[0] || defaults[0] || null;

    // --- Canonical assessment integrity gate (fail closed) ---
    const targetLevel = project.target_cmmc_level;
    const expected = CMMC_EXPECTED[targetLevel];
    if (!expected) return Response.json({ error: `Project target level "${targetLevel || 'Unknown'}" is not an authoritative CMMC level.` }, { status: 409 });
    const controlIds = assessments.map((a: any) => String(a.control_id || '').trim()).filter(Boolean);
    const uniqueControls = new Set(controlIds);
    if (assessments.length !== expected || uniqueControls.size !== expected) {
      return Response.json({ error: `Canonical assessment integrity failed: expected ${expected} unique assessment rows, found ${assessments.length} rows / ${uniqueControls.size} unique controls.` }, { status: 409 });
    }

    // --- Applicability ---
    if (!template.cmmc_levels?.includes(targetLevel)) {
      return Response.json({ error: `Template does not apply to ${targetLevel} projects.` }, { status: 409 });
    }

    // --- Resolve fields (deterministic, canonical data only) ---
    const generatedBy = caller.full_name || caller.email || 'System';
    const plannedVersion = `0.${existingDocs.length + 1}`;
    const fields = resolveFields({
      template, project, organization, companyProfile: companyProfiles[0] || null,
      scoping, components, tools, config, plannedVersion, generatedBy,
    });
    const requiredSource = template.required_source_fields || [];
    const missingFields = requiredSource.filter((tag: string) => !fields[tag]?.resolved);
    const unresolvedFields = Object.keys(fields).filter((tag) => !fields[tag].resolved && !APPROVAL_FIELDS.includes(tag));

    // --- Render DOCX: fill tags across ALL document parts ---
    const zip = await JSZip.loadAsync(tplBytes);
    const renderParts = Object.keys(zip.files).filter((p) => /^word\/(document|header\d*|footer\d*)\.xml$/.test(p));
    for (const part of renderParts) {
      let xml = await zip.files[part].async('string');
      for (const tag of Object.keys(fields)) {
        const token = `{{${tag}}}`;
        if (!xml.includes(token)) continue;
        let replacement: string;
        if (APPROVAL_FIELDS.includes(tag)) replacement = xmlEscape(PENDING_APPROVAL_TEXT);
        else if (fields[tag].resolved) replacement = xmlEscape(fields[tag].value);
        else replacement = xmlEscape(`[INFORMATION REQUIRED: ${tag}]`);
        xml = xml.split(token).join(replacement);
      }
      zip.file(part, xml);
    }

    // --- Scan the COMPLETE finished DOCX ZIP for unresolved tokens/instructions/tags ---
    const scanFailures: string[] = [];
    for (const part of Object.keys(zip.files).filter((p) => p.endsWith('.xml'))) {
      const text = (await zip.files[part].async('string')).replace(/<[^>]+>/g, '');
      if (/\{\{[a-z_.]+\}\}/.test(text)) scanFailures.push(`${part}: unresolved merge tag`);
      for (const tok of FORBIDDEN_TOKENS) if (text.includes(tok)) scanFailures.push(`${part}: leftover template token ${tok}`);
      if (/Replace all bracketed fields/i.test(text) || /White-Label Template/i.test(text)) scanFailures.push(`${part}: template authoring instruction present`);
    }
    if (scanFailures.length > 0) {
      return Response.json({ error: 'Output scan failed — draft not saved.', failures: scanFailures }, { status: 500 });
    }

    const outBytes: Uint8Array = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
    const outputSha = await sha256Hex(outBytes);

    // --- Filename: CompanyName_PolicyType_PRIMARYCONTROLID_ControlLocation_YYYY-MM-DD.docx ---
    const companyShort = sanitizeNamePart(config?.filename_short_name || organization?.short_name || organization?.organization_name) || 'Company';
    const controlLocation = sanitizeNamePart(project.implementation_stack) || 'Org';
    const today = new Date().toISOString().slice(0, 10);
    const fileName = [companyShort, sanitizeNamePart(template.document_type) || 'Policy', sanitizeControlPart(template.primary_control_id) || 'GEN', controlLocation, today].join('_') + '.docx';

    // --- Upload output and verify round-trip hash (fail closed) ---
    const uploaded = await sr.integrations.Core.UploadPrivateFile({ file: new File([outBytes], fileName, { type: MIME }) });
    if (!uploaded?.file_uri) return Response.json({ error: 'Draft upload failed — nothing was saved.' }, { status: 502 });
    const verifySigned = await sr.integrations.Core.CreateFileSignedUrl({ file_uri: uploaded.file_uri });
    const verifyBytes = new Uint8Array(await (await fetch(verifySigned.signed_url)).arrayBuffer());
    if ((await sha256Hex(verifyBytes)) !== outputSha) {
      return Response.json({ error: 'Uploaded draft failed hash verification — nothing was saved.' }, { status: 502 });
    }

    // --- Immutable source snapshot ---
    const evidenceHashes: Record<string, string> = {};
    for (const ev of evidence) {
      if (ev.hash_value && (ev.control_ids || []).some((c: string) => (template.control_ids || []).includes(c))) {
        evidenceHashes[ev.id] = ev.hash_value;
      }
    }
    const snapshotPayload = {
      project_id: projectId, organization_id: org,
      template_key: template.template_key, template_version: template.template_version, template_sha256: template.normalized_sha256,
      resolved_fields: fields,
      source_counts: {
        ControlAssessment: assessments.length, ProjectEvidence: evidence.length, ProjectPOAM: poams.length,
        SystemComponent: components.length, ProjectSecurityTool: tools.length, ToolControlMapping: toolMappings.length,
        ObjectiveEvidenceLink: objectiveLinks.length, ScopingProfile: scopings.length,
      },
      evidence_hashes: evidenceHashes,
    };
    const snapshotSha = await sha256Hex(new TextEncoder().encode(stableStringify(snapshotPayload)));
    const nowIso = new Date().toISOString();
    let snapshot: any = null;
    try {
      snapshot = await sr.entities.DocumentSourceSnapshot.create({
        ...snapshotPayload, snapshot_sha256: snapshotSha, generated_by: generatedBy, generated_date: nowIso,
      });
    } catch (e) {
      return Response.json({ error: `Snapshot save failed — draft file uploaded but no document record was created. Details: ${e.message}` }, { status: 500 });
    }

    // --- ProjectDocument Draft record (never Approved/Published) ---
    const priorActive = existingDocs.filter((d: any) => !['Superseded', 'Archived'].includes(d.status));
    const priorDraft = priorActive.find((d: any) => !['Approved', 'Published'].includes(d.status));
    let docRecord: any = null;
    try {
      docRecord = await sr.entities.ProjectDocument.create({
        organization_id: org, project_id: projectId,
        template_key: template.template_key, template_version: template.template_version, template_sha256: template.normalized_sha256,
        title: template.title, document_id: template.document_id, document_type: template.document_type,
        file_name: fileName, file_uri: uploaded.file_uri, mime_type: MIME, output_sha256: outputSha,
        source_snapshot_id: snapshot.id, source_snapshot_sha256: snapshotSha,
        owner_name: config?.policy_owner_name || '', approver_name: config?.approving_authority_name || '',
        control_ids: template.control_ids || [], primary_control_id: template.primary_control_id || '',
        missing_fields: missingFields, unresolved_fields: unresolvedFields, missing_approval_fields: APPROVAL_FIELDS,
        status: 'Draft', document_version: plannedVersion,
        stale: false, stale_reasons: [],
        generated_by: generatedBy, generated_date: nowIso,
        supersedes_document_id: priorDraft?.id || '',
        include_in_package: false,
      });
    } catch (e) {
      return Response.json({
        error: `Document record save failed after snapshot creation. CLEANUP NEEDED: orphan snapshot ${snapshot.id} (immutable provenance only, no published-looking artifact exists). Details: ${e.message}`,
      }, { status: 500 });
    }

    // Supersede the prior DRAFT only. Approved/Published records are never modified.
    if (priorDraft) {
      await sr.entities.ProjectDocument.update(priorDraft.id, { status: 'Superseded', superseded_by_document_id: docRecord.id }).catch(() => {});
    }

    return Response.json({
      document: docRecord,
      snapshot_id: snapshot.id,
      snapshot_sha256: snapshotSha,
      output_sha256: outputSha,
      file_name: fileName,
      missing_fields: missingFields,
      unresolved_fields: unresolvedFields,
      missing_approval_fields: APPROVAL_FIELDS,
      note: 'Draft generated. Approval/Published transitions are not available in Phase 4C.',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});