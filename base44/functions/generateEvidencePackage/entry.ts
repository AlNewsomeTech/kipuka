import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import JSZip from 'npm:jszip@3.10.1';

// ---------------------------------------------------------------------------
// Project-based C3PAO Evidence Package (ZIP) generator.
// Distinct from the legacy Client-based generatePackage function: this operates
// on the Phase 3+ project entity model (Project, ProjectEvidence, ControlAssessment,
// SystemSecurityPlan, ProjectPOAM, PolicyTemplate). It packs the ACTUAL evidence
// binary files organized by NIST control family, plus a README, completeness
// report, and evidence index CSV. Warnings only — never a hard block.
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
      if (!memberships.some((m) => m.status === 'Active')) {
        return Response.json({ error: 'Project not found' }, { status: 404 });
      }
    }

    const orgRecord = await sr.entities.Organization.get(orgId).catch(() => null);
    if (orgRecord?.fully_disabled === true
      || orgRecord?.subscription_status === 'Suspended'
      || orgRecord?.subscription_status === 'Cancelled'
      || orgRecord?.subscription_status === 'Past Due') {
      return Response.json({ error: 'Your organization\'s access is not active. Contact Pac-Sec support.' }, { status: 403 });
    }
    const subEnd = orgRecord?.subscription_end_date;
    if (subEnd && new Date(subEnd) < new Date(new Date().toDateString())) {
      return Response.json({ error: 'Your organization\'s subscription has ended. Contact Pac-Sec support to restore access.' }, { status: 403 });
    }

    const [org, assessments, evidenceAll, sspList, poams, policiesAll, scopingList] = await Promise.all([
      Promise.resolve(orgRecord),
      sr.entities.ControlAssessment.filter({ project_id: projectId }).catch(() => []),
      sr.entities.ProjectEvidence.filter({ project_id: projectId }).catch(() => []),
      sr.entities.SystemSecurityPlan.filter({ project_id: projectId }).catch(() => []),
      sr.entities.ProjectPOAM.filter({ project_id: projectId }).catch(() => []),
      sr.entities.PolicyTemplate.filter({ project_id: projectId }).catch(() => []),
      sr.entities.ScopingProfile.filter({ project_id: projectId }).catch(() => []),
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
    const policies = sameOrg(policiesAll, 'policy').filter((p) => !p.is_master_template);
    const ssp = sspList[0] || null;
    const scoping = scopingList[0] || null;

    const date = new Date().toISOString().split('T')[0];
    const projName = sanitize(project.project_name, 'Project');
    const rootName = `${projName}_CMMC_Evidence_Package_${date}`;

    // ---- Build the file plan ----
    const files = []; // { path, name, kind, fetchUrl?, content?, meta }
    const indexRows = [];

    evidence.forEach((e) => {
      const controls = (e.control_ids || []);
      const primary = controls[0] || '';
      const folder = familyFolder(primary);
      const ext = extFromUrl(e.file_url, 'pdf');
      const name = `${sanitize(primary || 'GEN', 'GEN')}_${sanitize(e.evidence_title, 'Evidence')}_${date}.${ext.replace(/[^a-z0-9]/gi, '')}`;
      files.push({
        path: `${folder}/${name}`, name, kind: 'evidence', fetchUrl: e.file_url,
        meta: {
          title: e.evidence_title, type: e.evidence_type, controls: controls.join('; '),
          owner: e.owner || e.uploaded_by || '', review_status: e.review_status,
          source: e.source_system || e.source_tool || '', evidence_date: e.evidence_date || '',
          expiration: e.expiration_date || '', has_file: !!e.file_url,
        },
      });
    });

    // Approved policies as markdown documents.
    policies.forEach((p) => {
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

    // ---- Completeness check (warnings, not blockers) ----
    const warnings = [];
    const controlsWithEvidence = new Set();
    evidence.forEach((e) => (e.control_ids || []).forEach((c) => controlsWithEvidence.add(c)));
    const controlsNoEvidence = assessments.filter((a) => !controlsWithEvidence.has(a.control_id));
    const evNotAccepted = evidence.filter((e) => e.review_status !== 'Accepted');
    const evNoFile = evidence.filter((e) => !e.file_url);
    const openHighRisk = poams.filter((p) => ['High', 'Critical'].includes(p.risk_rating) && !['Closed', 'Accepted Risk'].includes(p.status));

    if (evidence.length === 0) warnings.push('No evidence items exist for this project.');
    if (controlsNoEvidence.length) warnings.push(`${controlsNoEvidence.length} control(s) have no linked evidence.`);
    if (evNotAccepted.length) warnings.push(`${evNotAccepted.length} evidence item(s) are not yet Accepted (still Draft / Needs Review / Rejected / Expired).`);
    if (evNoFile.length) warnings.push(`${evNotAccepted.length ? '' : ''}${evNoFile.length} evidence item(s) have no attached file and will be marked MISSING in the package.`);
    if (!ssp || ssp.approval_status !== 'Approved') warnings.push('SSP is not yet Approved.');
    if (policies.length === 0) warnings.push('No project policies are included.');
    if (openHighRisk.length) warnings.push(`${openHighRisk.length} open high/critical-risk POA&M item(s) remain.`);
    if (scoping?.scope_status !== 'Approved') warnings.push('Assessment scope is not yet Approved.');
    isolationWarnings.forEach((w) => warnings.push(w));

    const completeness = {
      controls_total: assessments.length,
      controls_with_evidence: assessments.length - controlsNoEvidence.length,
      evidence_total: evidence.length,
      evidence_accepted: evidence.filter((e) => e.review_status === 'Accepted').length,
      policies_included: policies.length,
      ssp_approved: ssp?.approval_status === 'Approved',
      open_high_risk_poam: openHighRisk.length,
    };

    // ---- Preview short-circuit ----
    const previewPayload = {
      project_name: project.project_name, root_folder_name: rootName,
      files: files.map((f) => ({ path: f.path, name: f.name, kind: f.kind, review_status: f.meta.review_status, has_file: f.meta.has_file })),
      estimated_file_count: files.length, warnings, completeness, isolation_warnings: isolationWarnings,
    };
    if (previewOnly) return Response.json(previewPayload);

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
        else if (f.fetchUrl) {
          const resp = await fetch(f.fetchUrl);
          if (resp.ok) { root.file(f.path, await resp.arrayBuffer()); placedFiles++; }
          else { root.file(`${f.path}.MISSING.txt`, `Original file could not be retrieved.`); }
        } else { root.file(`${f.path}.MISSING.txt`, 'No file attached to this evidence record.'); }
      } catch (err) {
        root.file(`${f.path}.ERROR.txt`, `Failed to include file: ${err.message}`);
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