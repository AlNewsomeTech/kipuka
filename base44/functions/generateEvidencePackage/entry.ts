import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import JSZip from 'npm:jszip@3.10.1';

// ---------------------------------------------------------------------------
// Project-based C3PAO Evidence Package (ZIP) generator.
// Distinct from the legacy Client-based generatePackage function: this operates
// on the Phase 3+ project entity model (Project, ProjectEvidence, ControlAssessment,
// SystemSecurityPlan, ProjectPOAM, PolicyTemplate). It packs the ACTUAL evidence
// binary files organized by NIST control family, plus a README, completeness
// report, and evidence index CSV. Draft packages remain exportable, but canonical
// assessment readiness is computed fail-closed and is never inferred from workflow status.
// ---------------------------------------------------------------------------

const BRAND = {
  company: 'Pacific Global Security Group',
  confidential: 'CONFIDENTIAL & PROPRIETARY — Property of Pacific Global Security Group. Unauthorized distribution is prohibited.',
  disclaimer: 'This package supports CMMC assessment preparation. It does not replace an independent C3PAO assessment. Generated content must be reviewed by Pac-Sec staff before submission.',
};

const FAMILY_FOLDERS = {
  AC: 'AC_Access_Control', AT: 'AT_Awareness_and_Training', AU: 'AU_Audit_and_Accountability',
  CA: 'CA_Security_Assessment', CM: 'CM_Configuration_Management', IA: 'IA_Identification_and_Authentication',
  IR: 'IR_Incident_Response', MA: 'MA_Maintenance', MP: 'MP_Media_Protection',
  PE: 'PE_Physical_Protection', PS: 'PS_Personnel_Security', RA: 'RA_Risk_Assessment',
  SC: 'SC_System_and_Communications_Protection', SI: 'SI_System_and_Information_Integrity',
};

function sanitize(value, fallback) {
  let s = String(value == null ? '' : value).trim();
  if (!s) s = fallback || 'Item';
  s = s.replace(/["*:<>?/\\|#%]+/g, '_').replace(/\s+/g, '_').replace(/_{2,}/g, '_');
  s = s.replace(/^[._\s]+|[._\s]+$/g, '');
  if (!s) s = fallback || 'Item';
  if (s.length > 80) s = s.slice(0, 80).replace(/[._-]+$/g, '');
  return s;
}

function familyCode(controlId) {
  const m = (controlId || '').match(/^([A-Z]{2})/);
  return m ? m[1] : null;
}

function familyFolder(controlId) {
  const code = familyCode(controlId);
  return code && FAMILY_FOLDERS[code] ? `03_Evidence/${FAMILY_FOLDERS[code]}` : '03_Evidence/Other_Supporting_Evidence';
}

function extFromUrl(url, fallback) {
  if (!url) return fallback || 'pdf';
  const m = url.split('?')[0].match(/\.([a-z0-9]{2,5})$/i);
  return m ? m[1].toLowerCase() : (fallback || 'pdf');
}

function csvCell(v) {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function stripHtml(html) {
  if (!html) return '';
  return String(html).replace(/<\/(p|div|h[1-6]|li)>/gi, '\n').replace(/<li[^>]*>/gi, '- ')
    .replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n').trim();
}

const CMMC_TOTALS = { 'Level 1': { requirements: 15, objectives: 59 }, 'Level 2': { requirements: 110, objectives: 320 } };
const IMPLEMENTED = new Set(['Implemented Pending Evidence', 'Evidence Uploaded', 'Evidence Needs Review', 'Evidence Accepted', 'Ready for Documentation', 'Implemented', 'Ready for Assessment']);
const SCOPING_KEYS = ['fci_location', 'cui_location', 'cui_access', 'cui_systems', 'cui_cloud', 'cui_endpoints', 'external_providers', 'separate_enclave', 'out_of_scope', 'exclusion_reason', 'boundary_evidence'];

function validApprovedScope(scoping) {
  if (scoping?.scope_status !== 'Approved') return false;
  if (!String(scoping.scope_name || '').trim() || !scoping.environment_type || scoping.environment_type === 'Unknown') return false;
  if (!String(scoping.boundary_summary || '').trim() || !String(scoping.included_systems_summary || '').trim() || !String(scoping.data_flow_summary || '').trim()) return false;
  if (scoping.handles_fci && !String(scoping.fci_description || '').trim()) return false;
  if (scoping.handles_cui && !String(scoping.cui_description || '').trim()) return false;
  return SCOPING_KEYS.every((key) => String((scoping.wizard_answers || {})[key] || '').trim());
}
function validFinalInventory(project, assets) {
  if (project?.inventory_status !== 'Finalized' || assets.length === 0) return false;
  return assets.every((asset) => String(asset.owner || '').trim()
    && asset.scope_category && asset.scope_category !== 'Unknown'
    && asset.status && asset.status !== 'Unknown'
    && (asset.scope_category !== 'CUI Asset' || asset.stores_cui || asset.processes_cui || asset.transmits_cui || asset.handles_cui));
}

function validNa(a) {
  return a?.status === 'Not Applicable'
    && a?.not_applicable_request_status === 'Approved'
    && !!String(a.not_applicable_request_id || '').trim()
    && /^[a-f0-9]{64}$/i.test(String(a.not_applicable_decision_sha256 || '').trim())
    && !!String(a.not_applicable_justification || '').trim()
    && !!String(a.not_applicable_scope_evidence || '').trim()
    && !!String(a.not_applicable_confirmed_by || '').trim()
    && !!String(a.not_applicable_confirmed_date || '').trim()
    && !!String(a.not_applicable_approved_by_email || '').trim()
    && !!String(a.not_applicable_approved_date || '').trim();
}
function validEvidence(e, now = new Date()) {
  if (!e || e.review_status !== 'Accepted') return false;
  if ((e.lifecycle_status || 'Current') !== 'Current') return false;
  const hasFile = !!String(e.file_uri || '').trim() || !!String(e.file_url || '').trim();
  if (!hasFile || !/^[a-f0-9]{64}$/i.test(String(e.hash_value || '').trim())) return false;
  if (!e.expiration_date) return true;
  const expiry = new Date(`${e.expiration_date}T23:59:59.999Z`);
  return Number.isNaN(expiry.getTime()) || expiry.getTime() >= now.getTime();
}
async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
async function fetchVerifiedPrivate(serviceClient: any, evidence: any): Promise<Uint8Array> {
  const fileUri = String(evidence?.file_uri || '');
  const expectedHash = String(evidence?.hash_value || '');
  if (!fileUri.startsWith('mp/private/')) throw new Error(`Evidence ${evidence?.id || ''} is not stored in canonical private storage.`);
  if (!/^[a-f0-9]{64}$/i.test(expectedHash)) throw new Error(`Evidence ${evidence?.id || ''} is missing a valid SHA-256 hash.`);
  const signed = await serviceClient.integrations.Core.CreateFileSignedUrl({ file_uri: fileUri });
  const response = await fetch(signed.signed_url);
  if (!response.ok) throw new Error(`Evidence ${evidence?.id || ''} bytes could not be fetched.`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if ((await sha256Hex(bytes)) !== expectedHash.toLowerCase()) throw new Error(`Evidence ${evidence?.id || ''} failed SHA-256 verification.`);
  return bytes;
}
function canonicalSummary(project, assessments, objectiveLibrary, objectiveLinks, evidence) {
  const expected = CMMC_TOTALS[project?.target_cmmc_level];
  const objectives = objectiveLibrary.filter((o) => o.active === true && o.cmmc_level === project?.target_cmmc_level);
  const controlIds = assessments.map((a) => String(a.control_id || '').trim());
  const objectiveKeys = objectives.map((o) => String(o.objective_key || `${o.control_id}|${o.objective_id}`));
  const linkKeys = objectiveLinks.map((l) => `${l.control_id}|${l.objective_id}`);
  const issues = [];
  if (!expected) issues.push('Project target level is not authoritative.');
  if (expected && assessments.length !== expected.requirements) issues.push(`Expected ${expected.requirements} requirements; found ${assessments.length}.`);
  if (expected && objectives.length !== expected.objectives) issues.push(`Expected ${expected.objectives} objectives; found ${objectives.length}.`);
  if (new Set(controlIds).size !== controlIds.length || controlIds.some((id) => !id)) issues.push('Assessment control IDs are blank or duplicated.');
  if (new Set(objectiveKeys).size !== objectiveKeys.length) issues.push('Authoritative objective keys are duplicated.');
  if (new Set(linkKeys).size !== linkKeys.length) issues.push('Objective finding rows are duplicated.');
  const validEvidenceIds = new Set(evidence.filter((e) => validEvidence(e)).map((e) => e.id));
  const linkByKey = new Map(objectiveLinks.map((l) => [`${l.control_id}|${l.objective_id}`, l]));
  const objectivesByControl = new Map();
  objectives.forEach((o) => {
    if (!objectivesByControl.has(o.control_id)) objectivesByControl.set(o.control_id, []);
    objectivesByControl.get(o.control_id).push(o);
  });
  const controls = assessments.map((a) => {
    const required = objectivesByControl.get(a.control_id) || [];
    const na = validNa(a);
    const objectiveMet = required.filter((o) => {
      const link = linkByKey.get(`${a.control_id}|${o.objective_id}`);
      return link?.status === 'Met' && !!link.evidence_id && validEvidenceIds.has(link.evidence_id);
    }).length;
    return { control_id: a.control_id, met: na || (required.length > 0 && objectiveMet === required.length), implemented: na || IMPLEMENTED.has(a.status) };
  });
  const integrityOk = issues.length === 0;
  const met = controls.filter((c) => c.met).length;
  const implemented = controls.filter((c) => c.implemented).length;
  return {
    integrity_ok: integrityOk, integrity_issues: issues,
    requirements_total: expected?.requirements || assessments.length,
    objectives_total: expected?.objectives || objectives.length,
    requirements_met: met,
    readiness_percent: integrityOk && expected ? Math.round((met / expected.requirements) * 100) : null,
    implementation_percent: integrityOk && expected ? Math.round((implemented / expected.requirements) * 100) : null,
    valid_final_evidence: validEvidenceIds.size,
    assessment_ready: integrityOk && !!expected && met === expected.requirements,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const projectId = body.project_id;
    if (!projectId) return Response.json({ error: 'project_id required' }, { status: 400 });
    const previewOnly = body.preview_only === true;

    const sr = base44.asServiceRole;
    const project = await sr.entities.Project.get(projectId).catch(() => null);
    if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });

    const orgId = project.organization_id;
    if (!orgId) return Response.json({ error: 'Project not found' }, { status: 404 });

    // ---- AUTHORIZATION (before any package data is read) ----
    const isStaff = user.role === 'admin' || user.role === 'technician';
    if (!isStaff) {
      if (user.organization_id !== orgId) {
        // 404 — do not disclose that another tenant's project exists.
        return Response.json({ error: 'Project not found' }, { status: 404 });
      }
      const memberships = await sr.entities.OrganizationUser
        .filter({ user_email: user.email, organization_id: orgId })
        .catch(() => []);
      const active = memberships.filter((m) => m.status === 'Active');
      if (active.length !== 1) {
        return Response.json({ error: 'Project not found' }, { status: 404 });
      }
    }

    const orgRecord = await sr.entities.Organization.get(orgId).catch(() => null);
    if (!orgRecord) return Response.json({ error: 'Project not found' }, { status: 404 });
    if (orgRecord.fully_disabled === true
      || orgRecord?.subscription_status === 'Suspended'
      || orgRecord?.subscription_status === 'Cancelled'
      || orgRecord?.subscription_status === 'Past Due') {
      return Response.json({ error: 'Your organization\'s access is not active. Contact Pac-Sec support.' }, { status: 403 });
    }
    const subEnd = orgRecord?.subscription_end_date;
    if (subEnd && new Date(subEnd) < new Date(new Date().toDateString())) {
      return Response.json({ error: 'Your organization\'s subscription has ended. Contact Pac-Sec support to restore access.' }, { status: 403 });
    }

    const [org, assessments, evidenceAll, sspList, poams, policiesAll, scopingList, assetsAll, sprsList, objectiveLibrary, objectiveLinks] = await Promise.all([
      Promise.resolve(orgRecord),
      sr.entities.ControlAssessment.filter({ project_id: projectId }),
      sr.entities.ProjectEvidence.filter({ project_id: projectId }),
      sr.entities.SystemSecurityPlan.filter({ project_id: projectId }),
      sr.entities.ProjectPOAM.filter({ project_id: projectId }),
      sr.entities.PolicyTemplate.filter({ project_id: projectId }),
      sr.entities.ScopingProfile.filter({ project_id: projectId }),
      sr.entities.Asset.filter({ project_id: projectId }),
      sr.entities.SPRSRecord.filter({ project_id: projectId }),
      sr.entities.AssessmentObjectiveLibrary.list('sort_order', 500),
      sr.entities.ObjectiveEvidenceLink.filter({ project_id: projectId }),
    ]);

    // ---- Data isolation: only records for THIS project's organization ----
    const isolationWarnings = [];
    const sameOrg = (arr, label) => arr.filter((r) => {
      if (orgId && r.organization_id && r.organization_id !== orgId) {
        isolationWarnings.push(`Excluded ${label} record ${r.id} — belongs to another organization`);
        return false;
      }
      return true;
    });
    const evidence = sameOrg(evidenceAll, 'evidence');
    const currentEvidence = evidence.filter((e) => (e.lifecycle_status || 'Current') === 'Current'
      && !['Archived', 'Superseded'].includes(e.review_status));
    const finalEvidence = currentEvidence.filter((e) => validEvidence(e) && String(e.file_uri || '').startsWith('mp/private/'));
    const policies = sameOrg(policiesAll, 'policy').filter((p) => !p.is_master_template);
    const approvedPolicies = policies.filter((p) => p.approval_status === 'Approved');
    const assets = sameOrg(assetsAll, 'asset');
    const ssp = sspList[0] || null;
    const scoping = scopingList[0] || null;
    const sprs = sprsList[0] || null;

    const date = new Date().toISOString().split('T')[0];
    const projName = sanitize(project.project_name, 'Project');
    const rootName = `${projName}_CMMC_Evidence_Package_${date}`;

    // ---- Build the file plan ----
    const files = []; // { path, name, kind, fetchUrl?, content?, meta }
    const indexRows = [];

    finalEvidence.forEach((e) => {
      const controls = (e.control_ids || []);
      const primary = controls[0] || '';
      const folder = familyFolder(primary);
      const ext = extFromUrl(e.file_name || e.original_file_name, 'pdf');
      const name = `${sanitize(primary || 'GEN', 'GEN')}_${sanitize(e.evidence_title, 'Evidence')}_${date}.${ext.replace(/[^a-z0-9]/gi, '')}`;
      files.push({
        path: `${folder}/${name}`, name, kind: 'evidence', privateEvidence: e,
        meta: {
          title: e.evidence_title, type: e.evidence_type, controls: controls.join('; '),
          owner: e.owner || e.uploaded_by || '', review_status: e.review_status,
          source: e.source_system || e.source_tool || '', evidence_date: e.evidence_date || '',
          expiration: e.expiration_date || '', has_file: true,
        },
      });
    });

    // Approved policies as markdown documents.
    approvedPolicies.forEach((p) => {
      const name = `${sanitize(p.policy_name, 'Policy')}_v${sanitize(p.version || '1', '1')}.md`;
      files.push({
        path: `02_Policies_and_Procedures/${name}`, name, kind: 'policy',
        content: `# ${p.policy_name}\n\nVersion: ${p.version || '1.0'}\nStatus: ${p.approval_status || 'Draft'}\nMapped Controls: ${(p.mapped_control_ids || []).join(', ') || '—'}\n\n---\n\n${stripHtml(p.policy_body) || '(no content)'}\n`,
        meta: { title: p.policy_name, type: 'Policy/Procedure', controls: (p.mapped_control_ids || []).join('; '), review_status: p.approval_status, has_file: true },
      });
    });

    // SSP as markdown.
    if (ssp) {
      const sspName = `System_Security_Plan_${projName}.md`;
      const sspBody = ssp.sections
        ? Object.entries(ssp.sections).map(([k, v]) => `## ${k}\n\n${stripHtml(v)}\n`).join('\n')
        : stripHtml(ssp.narrative || ssp.content || '');
      files.push({
        path: `01_SSP_and_Scope/${sspName}`, name: sspName, kind: 'ssp',
        content: `# System Security Plan — ${project.project_name}\n\nStatus: ${ssp.approval_status || 'Draft'}\n\n---\n\n${sspBody || '(SSP content not yet drafted)'}\n`,
        meta: { title: 'System Security Plan', type: 'SSP', controls: '', review_status: ssp.approval_status, has_file: true },
      });
    }

    // Build index rows.
    files.forEach((f) => {
      indexRows.push({
        package_path: f.path, file_name: f.name, title: f.meta.title || '', type: f.meta.type || '',
        mapped_controls: f.meta.controls || '', owner: f.meta.owner || '', review_status: f.meta.review_status || '',
        source_system: f.meta.source || '', evidence_date: f.meta.evidence_date || '', expiration_date: f.meta.expiration || '',
        file_present: f.meta.has_file ? 'Yes' : 'No (missing file)',
      });
    });

    // ---- Completeness check and strict final-package blockers ----
    const warnings = [];
    const controlsWithEvidence = new Set();
    finalEvidence.forEach((e) => (e.control_ids || []).forEach((c) => controlsWithEvidence.add(c)));
    const controlsNoEvidence = assessments.filter((a) => !controlsWithEvidence.has(a.control_id));
    const evNotAccepted = currentEvidence.filter((e) => !validEvidence(e));
    const evNoFile = currentEvidence.filter((e) => !e.file_uri && !e.file_url);
    const canonical = canonicalSummary(project, assessments, objectiveLibrary, objectiveLinks, evidence);
    const openHighRisk = poams.filter((p) => ['High', 'Critical'].includes(p.risk_rating) && !['Closed', 'Accepted Risk'].includes(p.status));
    const policiesApproved = policies.length > 0 && approvedPolicies.length === policies.length;
    const sprsUploaded = (sprs?.evidence_item_ids || []).length > 0;
    const hardBlockers = [];
    if (!canonical.integrity_ok) hardBlockers.push('Canonical requirement/objective integrity failed.');
    if (!canonical.assessment_ready) hardBlockers.push('Every applicable requirement must be MET from valid final evidence.');
    if (canonical.implementation_percent !== 100) hardBlockers.push('Every applicable requirement must be implementation-complete.');
    if (currentEvidence.length === 0 || finalEvidence.length !== currentEvidence.length) hardBlockers.push('Every current evidence item must be Accepted, unexpired, hash-backed, and stored in canonical private storage.');
    if (!validApprovedScope(scoping)) hardBlockers.push('Assessment scope must be Approved and complete.');
    if (!validFinalInventory(project, assets)) hardBlockers.push('Asset inventory must be Finalized and complete.');
    if (!ssp || ssp.approval_status !== 'Approved') hardBlockers.push('SSP must be Approved.');
    if (!policiesApproved) hardBlockers.push('Every current project policy must be Approved.');
    if (openHighRisk.length) hardBlockers.push('Open high/critical-risk POA&M items must be resolved.');
    if (!sprsUploaded) hardBlockers.push('SPRS/PIEE artifacts must be uploaded.');

    if (!canonical.integrity_ok) warnings.push(`Canonical assessment integrity failed: ${canonical.integrity_issues.join(' ')}`);
    if (!canonical.assessment_ready) warnings.push(`Assessment readiness is ${canonical.readiness_percent == null ? 'unavailable' : `${canonical.readiness_percent}%`} (${canonical.requirements_met}/${canonical.requirements_total} requirements MET).`);
    if (currentEvidence.length === 0) warnings.push('No current evidence items exist for this project.');
    if (controlsNoEvidence.length) warnings.push(`${controlsNoEvidence.length} control(s) have no linked evidence.`);
    if (evNotAccepted.length) warnings.push(`${evNotAccepted.length} evidence item(s) are not yet Accepted (still Draft / Needs Review / Rejected / Expired).`);
    if (evNoFile.length) warnings.push(`${evNotAccepted.length ? '' : ''}${evNoFile.length} evidence item(s) have no attached file and will be marked MISSING in the package.`);
    if (!ssp || ssp.approval_status !== 'Approved') warnings.push('SSP is not yet Approved.');
    if (!policiesApproved) warnings.push('One or more current project policies are missing or not Approved.');
    if (!validFinalInventory(project, assets)) warnings.push('Asset inventory is not Finalized and complete.');
    if (!sprsUploaded) warnings.push('SPRS/PIEE artifacts are not uploaded.');
    if (openHighRisk.length) warnings.push(`${openHighRisk.length} open high/critical-risk POA&M item(s) remain.`);
    if (!validApprovedScope(scoping)) warnings.push('Assessment scope is not Approved and complete.');
    isolationWarnings.forEach((w) => warnings.push(w));

    const completeness = {
      controls_total: assessments.length,
      canonical_integrity_ok: canonical.integrity_ok,
      canonical_integrity_issues: canonical.integrity_issues,
      requirements_met: canonical.requirements_met,
      readiness_percent: canonical.readiness_percent,
      implementation_percent: canonical.implementation_percent,
      objectives_total: canonical.objectives_total,
      valid_final_evidence: canonical.valid_final_evidence,
      assessment_ready: canonical.assessment_ready,
      controls_with_evidence: assessments.length - controlsNoEvidence.length,
      evidence_total: currentEvidence.length,
      evidence_accepted: finalEvidence.length,
      policies_included: approvedPolicies.length,
      ssp_approved: ssp?.approval_status === 'Approved',
      open_high_risk_poam: openHighRisk.length,
    };

    // ---- Preview short-circuit ----
    const previewPayload = {
      project_name: project.project_name, root_folder_name: rootName,
      files: files.map((f) => ({ path: f.path, name: f.name, kind: f.kind, review_status: f.meta.review_status, has_file: f.meta.has_file })),
      estimated_file_count: files.length, warnings, hard_blockers: hardBlockers,
      blocked: hardBlockers.length > 0, completeness, isolation_warnings: isolationWarnings,
    };
    if (previewOnly) return Response.json(previewPayload);
    if (hardBlockers.length > 0) {
      return Response.json({ ...previewPayload, error: 'Final C3PAO evidence package is blocked by failed readiness checks.' }, { status: 409 });
    }

    // ---- Build the ZIP ----
    const zip = new JSZip();
    const root = zip.folder(rootName);

    root.file('00_Read_Me/README.md', buildReadme({ project, org, date, user, warnings, completeness }));

    const indexCols = ['package_path', 'file_name', 'title', 'type', 'mapped_controls', 'owner', 'review_status', 'source_system', 'evidence_date', 'expiration_date', 'file_present'];
    const indexCsv = indexCols.join(',') + '\n' + indexRows.map((r) => indexCols.map((c) => csvCell(r[c])).join(',')).join('\n');
    root.file('00_Read_Me/Evidence_Index.csv', indexCsv);

    root.file('00_Read_Me/Completeness_Report.md', buildCompletenessReport({ completeness, warnings, controlsNoEvidence }));

    let placedFiles = 0;
    for (const f of files) {
      try {
        if (f.content != null) { root.file(f.path, f.content); placedFiles++; }
        else if (f.privateEvidence) {
          root.file(f.path, await fetchVerifiedPrivate(sr, f.privateEvidence));
          placedFiles++;
        } else { throw new Error(`Package file ${f.path} has no verified source.`); }
      } catch (err) {
        return Response.json({ error: `Package generation stopped: ${err.message}`, blocked: true }, { status: 409 });
      }
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const zipFile = new File([zipBlob], `${rootName}.zip`, { type: 'application/zip' });
    const zipUp = await sr.integrations.Core.UploadFile({ file: zipFile });

    const exportRecord = await sr.entities.ReportExport.create({
      organization_id: orgId,
      project_id: projectId,
      report_type: 'C3PAO Evidence Package',
      report_title: `C3PAO Evidence Package — ${project.project_name}`,
      generated_by: user.full_name || user.email || 'System',
      generated_date: new Date().toISOString(),
      file_url: zipUp.file_url,
      report_status: 'Generated',
      notes: warnings.length ? `${warnings.length} completeness warning(s) at export.` : 'No warnings.',
    });

    return Response.json({
      ...previewPayload, blocked: false, placed_file_count: placedFiles,
      zip_file_url: zipUp.file_url, report_export: exportRecord,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function buildReadme({ project, org, date, user, warnings, completeness }) {
  let r = `# CMMC Evidence Package — ${project.project_name}\n\n`;
  r += `> **${BRAND.confidential}**\n\n`;
  r += `**Organization:** ${org?.organization_name || '—'}\n\n`;
  r += `**Project:** ${project.project_name}\n\n`;
  r += `**Target Level:** ${project.target_cmmc_level || '—'}\n\n`;
  r += `**Assessment Path:** ${project.assessment_path || '—'}\n\n`;
  r += `**Generated:** ${date} by ${user.full_name || user.email || 'System'}\n\n---\n\n`;
  r += `## Folder Structure\n\n`;
  r += `- **00_Read_Me** — this file, the evidence index, and the completeness report\n`;
  r += `- **01_SSP_and_Scope** — System Security Plan\n`;
  r += `- **02_Policies_and_Procedures** — project policies and procedures\n`;
  r += `- **03_Evidence** — evidence files organized by NIST SP 800-171 control family\n\n`;
  r += `## Contents Summary\n\n`;
  r += `- Assessment ready: ${completeness.assessment_ready ? 'Yes' : 'No'}\n`;
  r += `- Requirements MET: ${completeness.requirements_met} / ${completeness.controls_total}\n`;
  r += `- Canonical readiness: ${completeness.readiness_percent == null ? 'Unavailable (integrity failure)' : `${completeness.readiness_percent}%`}\n`;
  r += `- Implementation progress: ${completeness.implementation_percent == null ? 'Unavailable' : `${completeness.implementation_percent}%`}\n`;
  r += `- Valid final evidence: ${completeness.valid_final_evidence}\n`;
  r += `- Controls with evidence: ${completeness.controls_with_evidence} / ${completeness.controls_total}\n`;
  r += `- Evidence items: ${completeness.evidence_total} (${completeness.evidence_accepted} Accepted)\n`;
  r += `- Policies included: ${completeness.policies_included}\n`;
  r += `- SSP approved: ${completeness.ssp_approved ? 'Yes' : 'No'}\n\n`;
  if (warnings.length) {
    r += `## ⚠️ Completeness Warnings\n\n${warnings.map((w) => `- ${w}`).join('\n')}\n\n`;
    r += `> This package may be incomplete. Review the Completeness Report before relying on it for assessment.\n\n`;
  }
  r += `---\n\n*${BRAND.disclaimer}*\n`;
  return r;
}

function buildCompletenessReport({ completeness, warnings, controlsNoEvidence }) {
  let c = `# Completeness Report\n\n`;
  c += `> **${BRAND.confidential}**\n\n`;
  c += `## Coverage\n\n`;
  c += `| Metric | Value |\n|---|---|\n`;
  c += `| Canonical integrity | ${completeness.canonical_integrity_ok ? 'Pass' : 'Fail'} |\n`;
  c += `| Assessment ready | ${completeness.assessment_ready ? 'Yes' : 'No'} |\n`;
  c += `| Requirements MET | ${completeness.requirements_met} / ${completeness.controls_total} |\n`;
  c += `| Canonical readiness | ${completeness.readiness_percent == null ? 'Unavailable' : `${completeness.readiness_percent}%`} |\n`;
  c += `| Implementation progress | ${completeness.implementation_percent == null ? 'Unavailable' : `${completeness.implementation_percent}%`} |\n`;
  c += `| Valid final evidence | ${completeness.valid_final_evidence} |\n`;
  c += `| Controls total | ${completeness.controls_total} |\n`;
  c += `| Controls with evidence | ${completeness.controls_with_evidence} |\n`;
  c += `| Evidence items | ${completeness.evidence_total} |\n`;
  c += `| Evidence accepted | ${completeness.evidence_accepted} |\n`;
  c += `| Policies included | ${completeness.policies_included} |\n`;
  c += `| SSP approved | ${completeness.ssp_approved ? 'Yes' : 'No'} |\n`;
  c += `| Open high/critical POA&M | ${completeness.open_high_risk_poam} |\n\n`;
  if (controlsNoEvidence.length) {
    c += `## Controls Missing Evidence (${controlsNoEvidence.length})\n\n`;
    c += controlsNoEvidence.map((a) => `- ${a.control_id}${a.control_title ? ` — ${a.control_title}` : ''}`).join('\n') + '\n\n';
  }
  c += `## Warnings (${warnings.length})\n\n${warnings.length ? warnings.map((w) => `- ${w}`).join('\n') : '- None'}\n\n`;
  c += `---\n\n*${BRAND.disclaimer}*\n`;
  return c;
}