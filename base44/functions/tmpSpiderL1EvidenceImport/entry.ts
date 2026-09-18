import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import JSZip from 'npm:jszip@3.10.1';
import { sha256Hex, stableStringify, metadataSha } from '../../shared/evidenceIntegrity.ts';

const IMPORT_TOKEN = '5cecbccc36174e8fa4611e7f58dc3999d42895de22d0429f82eec635be5bd769';
const EXPECTED_PACKAGE_SHA256 = '3cc6de09bad397f33b62c1b0bcc6c4114103642672f76b12409cf9913dc30b4e';
const IMPORT_EMAIL = 'pac-sec-legacy-import@kipuka.local';
const IMPORT_ACTOR = 'Pac-Sec legacy import';
const SOURCE_SYSTEM = 'Spider LLC CMMC 2.0 L1 legacy package';
const TODAY = '2026-09-18';
const RETENTION_UNTIL = '2032-09-18';
const EVIDENCE_ROOT = 'Spider LLC/Evidence/';
const L1_DOC_ROOT = 'Spider LLC/SpiderLLC_CMMC_L1_Document_Package_v3/';
const IMPORT_NOTE = 'Spider LLC Level 1 legacy evidence package imported and marked reviewed per Pac-Sec direction. Evidence and documentation are expected to be refreshed with current Kipuka templates before final delivery.';

const L1_REQUIREMENTS = [
  '3.1.1', '3.1.2', '3.1.20', '3.1.22',
  '3.5.1', '3.5.2',
  '3.8.3',
  '3.10.1', '3.10.3', '3.10.4', '3.10.5',
  '3.13.1', '3.13.5',
  '3.14.1', '3.14.2', '3.14.4', '3.14.5',
];

const LEGACY_L1_DOCS = new Set([
  'Access_Control_Policy.docx',
  'Authentication_MFA_Policy.docx',
  'External_Access_Sharing_Policy.docx',
  'Malware_Protection_Scanning_Policy.docx',
  'Media_Protection_Policy.docx',
  'Patch_Vulnerability_Management_Policy.docx',
  'Physical_Access_Control_Policy.docx',
  'RBAC_Least_Privilege_Policy.docx',
  'System_Communications_Protection_Policy.docx',
  'Visitor_Management_Logging_Policy.docx',
]);

const QUALITY_CHECKLIST = {
  readable: true,
  dated: true,
  identifies_org: true,
  supports_control: true,
  no_sensitive: true,
  current: true,
  has_owner: true,
};

function clean(value: any, max = 4000): string {
  return String(value ?? '').trim().slice(0, max);
}

function fileName(path: string): string {
  return path.split('/').filter(Boolean).pop() || path;
}

function extension(name: string): string {
  const match = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match ? match[1] : '';
}

function numericFromControlId(controlId: string): string {
  const match = String(controlId || '').match(/(3\.\d{1,2}\.\d{1,2})/);
  return match ? match[1] : '';
}

function titleCaseFromFile(name: string): string {
  return name
    .replace(/\.[^.]+$/, '')
    .replace(/^(AC|IA|MP|PE|SC|SI)[._-]?L1[._-]?\d+[._-]?/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 220) || name.slice(0, 220);
}

function sanitizePart(value: any, fallback: string): string {
  const cleaned = String(value || '')
    .normalize('NFKD')
    .trim()
    .replace(/&/g, ' And ')
    .replace(/[^A-Za-z0-9.-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[_\-.]+|[_\-.]+$/g, '')
    .slice(0, 90);
  return cleaned || fallback;
}

function mimeType(name: string): string {
  const ext = extension(name);
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'csv') return 'text/csv';
  if (ext === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (ext === 'xlsx') return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (ext === 'zip') return 'application/zip';
  return 'application/octet-stream';
}

function evidenceType(name: string): string {
  const ext = extension(name);
  if (ext === 'png' || ext === 'jpg' || ext === 'jpeg') return 'Screenshot';
  if (ext === 'csv') return 'Configuration Export';
  if (ext === 'docx') return name.toLowerCase().includes('procedure') ? 'Procedure' : 'Policy';
  if (ext === 'xlsx') return 'Report';
  return 'Other';
}

function provenanceType(name: string): string {
  const ext = extension(name);
  if (ext === 'png' || ext === 'jpg' || ext === 'jpeg') return 'Screenshot';
  if (ext === 'csv' || ext === 'xlsx') return 'System Export';
  if (ext === 'docx') return name.toLowerCase().includes('procedure') ? 'Procedure Record' : 'Policy Record';
  return 'Manual Upload';
}

function sourceTool(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('entra') || lower.includes('conditionalaccess') || lower.includes('ca_') || lower.includes('authmethods')) return 'Microsoft Entra ID';
  if (lower.includes('intune') || lower.includes('autopatch') || lower.includes('windowsupdate')) return 'Microsoft Intune';
  if (lower.includes('defender') || lower.includes('safelinks') || lower.includes('safeattachments')) return 'Microsoft Defender';
  if (lower.includes('sharepoint') || lower.includes('_sp_') || lower.includes('cmmc_site')) return 'Microsoft SharePoint';
  if (extension(name) === 'docx') return 'Legacy Spider LLC policy package';
  return 'Legacy evidence package';
}

function evidenceDate(name: string): string {
  const match = name.match(/(20\d{2})[-_ ](0[1-9]|1[0-2])[-_ ]([0-3]\d)/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  return TODAY;
}

function includeEntry(path: string): boolean {
  const name = fileName(path);
  if (!name || path.endsWith('/')) return false;
  if (path.startsWith(EVIDENCE_ROOT)) return true;
  if (path.startsWith(L1_DOC_ROOT) && LEGACY_L1_DOCS.has(name)) return true;
  return false;
}

function requirementIdsForPath(path: string): string[] {
  const name = fileName(path);
  const lower = name.toLowerCase();
  const reqs = new Set<string>();

  if (/ac[_\.\-]?l1[_\.\-]?001/i.test(name) || lower.includes('rbac_least_privilege') || lower === 'access_control_policy.docx') reqs.add('3.1.1');
  if (/ac[_\.\-]?l1[_\.\-]?002/i.test(name) || lower.includes('cmmc_library_permissions') || lower.includes('rbac_least_privilege')) reqs.add('3.1.2');
  if (/ac[_\.\-]?l1[_\.\-]?003/i.test(name) || lower.includes('external_access_sharing')) reqs.add('3.1.20');
  if (lower.includes('external_access_sharing') || lower === 'access_control_policy.docx') reqs.add('3.1.22');

  if (/ia[_\.\-]?l1[_\.\-]?076/i.test(name) || lower.includes('ia.l1.076') || lower.includes('authentication_mfa')) reqs.add('3.5.1');
  if (/ia[_\.\-]?l1[_\.\-]?(077|078)/i.test(name) || lower.includes('ia.l1.077') || lower.includes('authentication_mfa')) reqs.add('3.5.2');

  if (lower.includes('media_protection')) reqs.add('3.8.3');

  if (lower.includes('physical_access_control')) {
    reqs.add('3.10.1'); reqs.add('3.10.3'); reqs.add('3.10.4'); reqs.add('3.10.5');
  }
  if (lower.includes('visitor_management')) {
    reqs.add('3.10.3'); reqs.add('3.10.4'); reqs.add('3.10.5');
  }

  if (/sc[_\.\-]?l1[_\.\-]?175/i.test(name) || lower.includes('system_communications_protection')) reqs.add('3.13.1');
  if (/sc[_\.\-]?l1[_\.\-]?177/i.test(name) || lower.includes('system_communications_protection')) reqs.add('3.13.5');

  if (/si[_\.\-]?l1[_\.\-]?210/i.test(name) || lower.includes('si.l1.210') || lower.includes('patch_vulnerability_management')) reqs.add('3.14.1');
  if (/si[_\.\-]?l1[_\.\-]?211/i.test(name) || lower.includes('si.l1.211') || lower.includes('malware_protection_scanning')) {
    reqs.add('3.14.2'); reqs.add('3.14.4');
  }
  if (/si[_\.\-]?l1[_\.\-]?213/i.test(name) || lower.includes('malware_protection_scanning')) reqs.add('3.14.5');

  return [...reqs];
}

async function listAll(svc: any, query: any = {}, sort = 'created_date', pageSize = 500): Promise<any[]> {
  const rows: any[] = [];
  for (let skip = 0; skip < 10000; skip += pageSize) {
    const page = await svc.filter(query, sort, pageSize, skip).catch(() => []);
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
  throw new Error('Pagination guard exceeded.');
}

function sameOrg(row: any, orgId: string): boolean {
  return !row?.organization_id || row.organization_id === orgId;
}

function candidateText(project: any, org: any): string {
  return [project.project_name, project.project_type, project.target_cmmc_level, org?.organization_name, org?.legal_name, org?.short_name]
    .map((v) => String(v || '').toLowerCase())
    .join(' ');
}

function isSpiderCandidate(project: any, org: any): boolean {
  return candidateText(project, org).includes('spider');
}

function l1AssessmentRows(assessments: any[]): any[] {
  return assessments.filter((a) => a.cmmc_level === 'Level 1' || /^\w+\.L1[-.]/.test(String(a.control_id || '')));
}

function targetL1RequirementRows(assessments: any[]): any[] {
  const l1Rows = l1AssessmentRows(assessments);
  const rowsByReq = new Map<string, any>();

  for (const row of assessments) {
    const req = numericFromControlId(row.control_id);
    if (!L1_REQUIREMENTS.includes(req)) continue;
    if (!rowsByReq.has(req)) rowsByReq.set(req, row);
  }

  for (const row of l1Rows) {
    const req = numericFromControlId(row.control_id);
    if (L1_REQUIREMENTS.includes(req)) rowsByReq.set(req, row);
  }

  return L1_REQUIREMENTS.map((req) => rowsByReq.get(req)).filter(Boolean);
}

function requirementResolver(assessmentRows: any[]) {
  const byReq = new Map<string, any>();
  for (const row of assessmentRows) {
    const req = numericFromControlId(row.control_id);
    if (req && L1_REQUIREMENTS.includes(req) && !byReq.has(req)) byReq.set(req, row);
  }
  return byReq;
}

function projectSummary(project: any, org: any, assessments: any[]) {
  const l1Rows = l1AssessmentRows(assessments);
  const targetRows = targetL1RequirementRows(assessments);
  return {
    project_id: project.id,
    project_name: project.project_name,
    project_type: project.project_type,
    target_cmmc_level: project.target_cmmc_level,
    organization_id: project.organization_id,
    organization_name: org?.legal_name || org?.organization_name || org?.short_name || '',
    level_1_assessments: l1Rows.length,
    l1_requirement_assessments: targetRows.length,
    l1_requirement_control_ids: targetRows.map((row: any) => row.control_id),
    total_assessments: assessments.length,
    status_counts: targetRows.reduce((acc: any, row: any) => {
      const key = row.status || 'Unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {}),
  };
}

async function createEvent(sr: any, evidence: any, transitionId: string, action: string, fromStatus: string, toStatus: string, note: string) {
  const existing = await sr.entities.ProjectEvidenceEvent.filter({ transition_id: transitionId }).catch(() => []);
  if (existing.length) return existing[0];
  const payload = {
    organization_id: evidence.organization_id,
    project_id: evidence.project_id,
    project_evidence_id: evidence.id,
    action,
    from_status: fromStatus || '',
    to_status: toStatus || '',
    transition_id: transitionId,
    actor_user_id: '',
    actor_email: IMPORT_EMAIL,
    actor_name: IMPORT_ACTOR,
    actor_role: 'Pac-Sec Admin',
    note: clean(note, 4000),
    evidence_sha256: evidence.hash_value || '',
    metadata_sha256: evidence.metadata_sha256 || '',
    event_date: new Date().toISOString(),
  };
  const eventSha = await sha256Hex(new TextEncoder().encode(stableStringify(payload)));
  return await sr.entities.ProjectEvidenceEvent.create({ ...payload, event_sha256: eventSha });
}

async function privateUpload(sr: any, bytes: Uint8Array, normalizedName: string, mime: string) {
  const uploaded = await sr.integrations.Core.UploadPrivateFile({
    file: new File([bytes], normalizedName, { type: mime }),
  });
  if (!uploaded?.file_uri) throw new Error(`Private upload failed for ${normalizedName}.`);
  return uploaded.file_uri;
}

async function buildContext(sr: any, projectId: string) {
  const [projects, orgs] = await Promise.all([
    listAll(sr.entities.Project, {}, 'created_date', 500),
    listAll(sr.entities.Organization, {}, 'created_date', 500),
  ]);
  const orgById = new Map(orgs.map((org: any) => [org.id, org]));
  const spiderProjects = projects.filter((project: any) => isSpiderCandidate(project, orgById.get(project.organization_id)));

  let project: any = null;
  if (projectId) {
    project = await sr.entities.Project.get(projectId).catch(() => null);
    if (!project) throw new Error('Requested project_id was not found.');
    if (!isSpiderCandidate(project, orgById.get(project.organization_id))) throw new Error('Requested project_id does not look like a Spider LLC project.');
  } else if (spiderProjects.length === 1) {
    project = spiderProjects[0];
  }

  const summaries = await Promise.all(spiderProjects.map(async (candidate: any) => {
    const assessments = await sr.entities.ControlAssessment.filter({ project_id: candidate.id }, null, 500).catch(() => []);
    return projectSummary(candidate, orgById.get(candidate.organization_id), assessments);
  }));

  if (!project) return { project: null, org: null, summaries, assessments: [], objectives: [], existingEvidence: [], existingLinks: [] };
  const org = orgById.get(project.organization_id) || await sr.entities.Organization.get(project.organization_id).catch(() => null);
  const [assessmentsRaw, objectivesRaw, evidenceRaw, linksRaw] = await Promise.all([
    sr.entities.ControlAssessment.filter({ project_id: project.id }, null, 500).catch(() => []),
    listAll(sr.entities.AssessmentObjectiveLibrary, { active: true }, 'sort_order', 500).catch(() => []),
    sr.entities.ProjectEvidence.filter({ project_id: project.id }, null, 500).catch(() => []),
    sr.entities.ObjectiveEvidenceLink.filter({ project_id: project.id }, null, 500).catch(() => []),
  ]);
  const assessments = assessmentsRaw.filter((row: any) => sameOrg(row, project.organization_id));
  const objectives = objectivesRaw.filter((row: any) => row.active === true);
  const existingEvidence = evidenceRaw.filter((row: any) => sameOrg(row, project.organization_id));
  const existingLinks = linksRaw.filter((row: any) => sameOrg(row, project.organization_id));
  return { project, org, summaries, assessments, objectives, existingEvidence, existingLinks };
}

async function plannedEntries(zip: JSZip, reqToAssessment: Map<string, any>) {
  const entries = Object.values(zip.files)
    .filter((entry: any) => !entry.dir && includeEntry(entry.name))
    .sort((a: any, b: any) => a.name.localeCompare(b.name));

  const plan = [];
  const skipped = [];
  for (const entry of entries as any[]) {
    const reqs = requirementIdsForPath(entry.name);
    const controlIds = [...new Set(reqs.map((req) => reqToAssessment.get(req)?.control_id).filter(Boolean))] as string[];
    if (!controlIds.length) {
      skipped.push({ path: entry.name, reason: reqs.length ? 'No matching Level 1 assessment control in target project' : 'No Level 1 control mapping' });
      continue;
    }
    const base = fileName(entry.name);
    plan.push({
      path: entry.name,
      file_name: base,
      requirements: reqs,
      control_ids: controlIds,
      title: titleCaseFromFile(base),
      evidence_type: evidenceType(base),
      provenance_type: provenanceType(base),
      source_tool: sourceTool(base),
      evidence_date: evidenceDate(base),
      size_bytes: Number(entry._data?.uncompressedSize || 0),
    });
  }
  return { plan, skipped };
}

function normalizedEvidenceName(project: any, planned: any, hash: string): string {
  const ext = extension(planned.file_name) || 'bin';
  return [
    sanitizePart('Spider LLC', 'Spider'),
    sanitizePart(planned.control_ids[0] || 'L1', 'L1'),
    sanitizePart(planned.source_tool, 'Source'),
    sanitizePart(planned.title, 'Evidence'),
    planned.evidence_date,
    hash.slice(0, 10),
  ].join('_') + `.${ext}`;
}

function recordDescription(planned: any): string {
  const controls = planned.control_ids.join(', ');
  return `Imported from ${SOURCE_SYSTEM}. Original package path: ${planned.path}. Mapped Level 1 controls: ${controls}. ${IMPORT_NOTE}`;
}

async function applyImport(sr: any, zip: JSZip, ctx: any, plan: any[], objectivesByControl: Map<string, any[]>, existingEvidence: any[], existingLinks: any[]) {
  const now = new Date().toISOString();
  const createdEvidence: any[] = [];
  const reusedEvidence: any[] = [];
  const evidenceByControl = new Map<string, any>();

  for (let i = 0; i < plan.length; i += 1) {
    const planned = plan[i];
    const entry = zip.file(planned.path);
    if (!entry) throw new Error(`Planned file disappeared from zip: ${planned.path}`);
    const bytes = new Uint8Array(await entry.async('uint8array'));
    const hash = await sha256Hex(bytes);
    const prior = existingEvidence.find((row: any) => row.original_file_name === planned.path && row.hash_value === hash);
    let evidence: any = prior || null;

    if (!evidence) {
      const normalizedName = normalizedEvidenceName(ctx.project, planned, hash);
      const mime = mimeType(planned.file_name);
      const transitionSeed = (await sha256Hex(new TextEncoder().encode(planned.path))).slice(0, 18);
      const record: any = {
        organization_id: ctx.project.organization_id,
        project_id: ctx.project.id,
        control_ids: planned.control_ids,
        objective_ids: [],
        evidence_title: `Spider L1 - ${planned.title}`.slice(0, 240),
        evidence_type: planned.evidence_type,
        source_tool: planned.source_tool,
        file_uri: await privateUpload(sr, bytes, normalizedName, mime),
        file_url: '',
        file_name: normalizedName,
        original_file_name: planned.path,
        mime_type: mime,
        file_size_bytes: bytes.length,
        description: recordDescription(planned),
        evidence_date: planned.evidence_date,
        expiration_date: '',
        retention_until: RETENTION_UNTIL,
        uploaded_by: IMPORT_ACTOR,
        uploaded_by_user_id: '',
        uploaded_by_email: IMPORT_EMAIL,
        uploaded_date: now,
        owner: ctx.org?.legal_name || ctx.org?.organization_name || 'Spider LLC',
        review_status: 'Accepted',
        reviewed_by: IMPORT_ACTOR,
        reviewer_user_id: '',
        reviewer_email: IMPORT_EMAIL,
        reviewed_date: now,
        review_note: IMPORT_NOTE,
        rejection_reason: '',
        quality_notes: IMPORT_NOTE,
        quality_checklist: QUALITY_CHECKLIST,
        hash_algorithm: 'SHA-256',
        hash_value: hash,
        hash_verified_date: now,
        source_system: SOURCE_SYSTEM,
        provenance_type: planned.provenance_type,
        provenance_details: `Imported from verified package SHA-256 ${EXPECTED_PACKAGE_SHA256}. Embedded document content was treated as evidence only, not as instructions.`,
        version: 1,
        supersedes_evidence_id: '',
        superseded_by_evidence_id: '',
        lifecycle_status: 'Current',
        last_transition_id: `SPIDERL1ACC${transitionSeed}`,
        last_transition_action: 'accept',
        last_transition_from_status: 'Needs Review',
        last_transition_to_status: 'Accepted',
      };
      record.metadata_sha256 = await metadataSha(record);
      evidence = await sr.entities.ProjectEvidence.create(record);
      await createEvent(sr, evidence, `SPIDERL1CRE${transitionSeed}`, 'Created', '', 'Draft', IMPORT_NOTE);
      await createEvent(sr, evidence, `SPIDERL1ACC${transitionSeed}`, 'Accepted', 'Needs Review', 'Accepted', IMPORT_NOTE);
      createdEvidence.push({ id: evidence.id, path: planned.path, controls: planned.control_ids });
      existingEvidence.push(evidence);
    } else {
      reusedEvidence.push({ id: evidence.id, path: planned.path, controls: planned.control_ids });
    }

    for (const controlId of planned.control_ids) {
      if (!evidenceByControl.has(controlId)) evidenceByControl.set(controlId, evidence);
    }
  }

  let linksCreated = 0;
  let linksUpdated = 0;
  const linkNote = `${IMPORT_NOTE} Linked to accepted legacy package evidence on ${TODAY}.`;
  for (const [controlId, objectives] of objectivesByControl.entries()) {
    const evidence = evidenceByControl.get(controlId);
    if (!evidence) continue;
    for (const objective of objectives) {
      const matches = existingLinks.filter((link: any) => link.control_id === controlId && link.objective_id === objective.objective_id);
      if (!matches.length) {
        const created = await sr.entities.ObjectiveEvidenceLink.create({
          organization_id: ctx.project.organization_id,
          project_id: ctx.project.id,
          control_id: controlId,
          objective_id: objective.objective_id,
          evidence_id: evidence.id,
          status: 'Met',
          notes: linkNote,
        });
        existingLinks.push(created);
        linksCreated += 1;
      } else {
        for (const link of matches) {
          const notes = clean(link.notes, 6000);
          const nextNotes = notes.includes('Spider LLC Level 1 legacy evidence package imported')
            ? notes
            : clean(`${notes}${notes ? '\n\n' : ''}${linkNote}`, 8000);
          await sr.entities.ObjectiveEvidenceLink.update(link.id, {
            evidence_id: evidence.id,
            status: 'Met',
            notes: nextNotes,
          });
          linksUpdated += 1;
        }
      }
    }
  }

  let assessmentsUpdated = 0;
  for (const assessment of targetL1RequirementRows(ctx.assessments)) {
    const notes = clean(assessment.assessor_notes, 8000);
    const nextNotes = notes.includes('Spider LLC Level 1 legacy evidence package imported')
      ? notes
      : clean(`${notes}${notes ? '\n\n' : ''}${IMPORT_NOTE} Reviewed on ${TODAY}. Source package SHA-256: ${EXPECTED_PACKAGE_SHA256}.`, 12000);
    await sr.entities.ControlAssessment.update(assessment.id, {
      status: 'Ready for Documentation',
      evidence_status: 'Accepted',
      assessor_notes: nextNotes,
      last_reviewed_by: IMPORT_ACTOR,
      last_reviewed_date: TODAY,
    });
    assessmentsUpdated += 1;
  }

  return { createdEvidence, reusedEvidence, linksCreated, linksUpdated, assessmentsUpdated };
}

export default async function (req: Request): Promise<Response> {
  try {
    if (req.method !== 'POST') return Response.json({ error: 'POST required.' }, { status: 405 });
    const token = req.headers.get('x-spider-import-token') || '';
    if (token !== IMPORT_TOKEN) return Response.json({ error: 'Forbidden.' }, { status: 403 });

    const form = await req.formData();
    const mode = clean(form.get('mode'), 20) || 'dry_run';
    if (!['dry_run', 'apply'].includes(mode)) return Response.json({ error: 'mode must be dry_run or apply.' }, { status: 400 });
    const requestedProjectId = clean(form.get('project_id'), 120);
    const file = form.get('package');
    if (!(file instanceof File)) return Response.json({ error: 'A multipart package file is required.' }, { status: 400 });

    const bytes = new Uint8Array(await file.arrayBuffer());
    const packageSha = await sha256Hex(bytes);
    if (packageSha !== EXPECTED_PACKAGE_SHA256) {
      return Response.json({ error: 'Package SHA-256 did not match the expected Spider LLC package.', package_sha256: packageSha }, { status: 409 });
    }

    const zip = await JSZip.loadAsync(bytes);
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;
    const ctx = await buildContext(sr, requestedProjectId);

    if (!ctx.project) {
      return Response.json({
        mode,
        package_sha256: packageSha,
        needs_project_selection: true,
        spider_project_candidates: ctx.summaries,
        message: ctx.summaries.length
          ? 'Multiple Spider-like projects were found. Re-run apply with the intended project_id.'
          : 'No Spider LLC project was found.',
      }, { status: 409 });
    }

    const targetRows = targetL1RequirementRows(ctx.assessments);
    const reqToAssessment = requirementResolver(targetRows);
    const missingRequiredAssessments = L1_REQUIREMENTS.filter((req) => !reqToAssessment.has(req));
    const { plan, skipped } = await plannedEntries(zip, reqToAssessment);
    const controlsCovered = [...new Set(plan.flatMap((item) => item.control_ids))].sort();
    const requirementsCovered = [...new Set(plan.flatMap((item) => item.requirements))].sort();

    const objectivesByControl = new Map<string, any[]>();
    for (const objective of ctx.objectives) {
      if (!controlsCovered.includes(objective.control_id)) continue;
      if (!objectivesByControl.has(objective.control_id)) objectivesByControl.set(objective.control_id, []);
      objectivesByControl.get(objective.control_id)!.push(objective);
    }
    const objectiveCount = [...objectivesByControl.values()].reduce((sum, rows) => sum + rows.length, 0);
    const controlsWithoutEvidence = targetRows.map((row: any) => row.control_id).filter((controlId: string) => !controlsCovered.includes(controlId)).sort();
    const controlsWithoutObjectives = controlsCovered.filter((controlId) => !(objectivesByControl.get(controlId)?.length));
    const projectInfo = projectSummary(ctx.project, ctx.org, ctx.assessments);
    const warnings: string[] = [];
    if (missingRequiredAssessments.length) warnings.push(`Missing Spider project assessment rows for these Level 1 requirement numbers: ${missingRequiredAssessments.join(', ')}`);
    if (controlsWithoutEvidence.length) warnings.push(`No imported evidence maps to: ${controlsWithoutEvidence.join(', ')}`);
    if (controlsWithoutObjectives.length) warnings.push(`No active Level 1 objectives found for: ${controlsWithoutObjectives.join(', ')}`);

    if (mode === 'apply') {
      if (missingRequiredAssessments.length || controlsWithoutEvidence.length || controlsWithoutObjectives.length) {
        return Response.json({
          error: 'Import blocked because the Level 1 assessment/evidence/objective coverage is incomplete.',
          project: projectInfo,
          planned_evidence_count: plan.length,
          controls_covered: controlsCovered,
          requirements_covered: requirementsCovered,
          warnings,
          skipped,
        }, { status: 409 });
      }
      const applied = await applyImport(sr, zip, ctx, plan, objectivesByControl, ctx.existingEvidence, ctx.existingLinks);
      return Response.json({
        mode,
        project: projectInfo,
        package_sha256: packageSha,
        planned_evidence_count: plan.length,
        direct_evidence_files: plan.filter((item) => item.path.startsWith(EVIDENCE_ROOT)).length,
        supporting_l1_documents: plan.filter((item) => item.path.startsWith(L1_DOC_ROOT)).length,
        controls_marked_reviewed: applied.assessmentsUpdated,
        objective_links_created: applied.linksCreated,
        objective_links_updated: applied.linksUpdated,
        evidence_created: applied.createdEvidence.length,
        evidence_reused: applied.reusedEvidence.length,
        controls_covered: controlsCovered,
        requirements_covered: requirementsCovered,
        active_level_1_objectives_marked_met: objectiveCount,
        warnings,
      });
    }

    return Response.json({
      mode,
      project: projectInfo,
      package_sha256: packageSha,
      planned_evidence_count: plan.length,
      direct_evidence_files: plan.filter((item) => item.path.startsWith(EVIDENCE_ROOT)).length,
      supporting_l1_documents: plan.filter((item) => item.path.startsWith(L1_DOC_ROOT)).length,
      controls_covered: controlsCovered,
      requirements_covered: requirementsCovered,
      active_level_1_objectives_to_mark_met: objectiveCount,
      existing_project_evidence: ctx.existingEvidence.length,
      existing_objective_links: ctx.existingLinks.length,
      warnings,
      skipped,
      sample_plan: plan.slice(0, 12),
    });
  } catch (error) {
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
}
