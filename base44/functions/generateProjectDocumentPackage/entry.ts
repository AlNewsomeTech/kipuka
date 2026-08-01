import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import JSZip from 'npm:jszip@3.10.1';

// PHASE 4E — PROJECT DOCUMENT PACKAGE EXPORT
// Builds a deterministic Project-based ZIP. Ready mode includes only current
// Approved/Published documents and fails closed on unresolved applicability,
// stale/missing required documents, missing hashes, or file hash mismatches.

const ALLOWED_KEYS = ['project_id', 'mode'];
const PACKAGE_ROLES = ['Organization Owner', 'Organization Admin', 'Compliance Manager', 'Pac-Sec Admin', 'Pac-Sec Support'];
const MIME = 'application/zip';

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function stableStringify(value: any): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}
function safe(value: any, fallback = 'Item') {
  const v = String(value || fallback).normalize('NFKD').replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^[_\.]+|[_\.]+$/g, '');
  return (v || fallback).slice(0, 120);
}
function csv(value: any) {
  const s = Array.isArray(value) ? value.join('; ') : String(value == null ? '' : value);
  return `"${s.replace(/"/g, '""')}"`;
}
function csvFile(headers: string[], rows: any[][]) {
  return [headers.map(csv).join(','), ...rows.map((r) => r.map(csv).join(','))].join('\r\n') + '\r\n';
}
async function fetchVerified(sr: any, fileUri: string, expectedHash: string) {
  const signed = await sr.integrations.Core.CreateFileSignedUrl({ file_uri: fileUri });
  const response = await fetch(signed.signed_url);
  if (!response.ok) throw new Error('Document file could not be fetched.');
  const bytes = new Uint8Array(await response.arrayBuffer());
  if ((await sha256Hex(bytes)) !== expectedHash) throw new Error('Document file hash mismatch.');
  return bytes;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const unknown = Object.keys(body).filter((k) => !ALLOWED_KEYS.includes(k));
    if (unknown.length) return Response.json({ error: `Unexpected fields: ${unknown.join(', ')}` }, { status: 400 });
    const projectId = body.project_id;
    const mode = body.mode === 'Ready' ? 'Ready' : 'Draft';
    if (!projectId) return Response.json({ error: 'project_id is required.' }, { status: 400 });

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
      if (caller.role !== 'technician' && !PACKAGE_ROLES.includes(orgRole || '')) {
        return Response.json({ error: 'Your role is not authorized to export document packages.' }, { status: 403 });
      }
    }

    const project = await sr.entities.Project.get(projectId).catch(() => null);
    if (!project || (!isAdmin && project.organization_id !== callerOrg)) return Response.json({ error: 'Project not found' }, { status: 404 });
    const organization = await sr.entities.Organization.get(project.organization_id).catch(() => null);
    if (!organization) return Response.json({ error: 'Project organization not found.' }, { status: 409 });

    const [templates, docs, decisions, priorPackages] = await Promise.all([
      sr.entities.DocumentTemplate.filter({ active: true }, null, 500).catch(() => []),
      sr.entities.ProjectDocument.filter({ project_id: projectId }, '-generated_date', 500).catch(() => []),
      sr.entities.DocumentApplicabilityDecision.filter({ project_id: projectId }, '-created_date', 500).catch(() => []),
      sr.entities.ProjectDocumentPackage.filter({ project_id: projectId, package_mode: mode }, '-generated_date', 500).catch(() => []),
    ]);
    const applicable = templates.filter((t: any) => t.cmmc_levels?.includes(project.target_cmmc_level));
    const activeDecisions = decisions.filter((d: any) => d.status !== 'Superseded');
    const decisionByKey = new Map<string, any>();
    for (const d of activeDecisions) {
      if (!decisionByKey.has(d.template_key) || (d.decision_version || 0) > (decisionByKey.get(d.template_key).decision_version || 0)) {
        decisionByKey.set(d.template_key, d);
      }
    }
    const activeDocs = docs.filter((d: any) => !['Superseded', 'Archived'].includes(d.status));
    const docByKey = new Map<string, any>();
    for (const d of activeDocs) {
      const current = docByKey.get(d.template_key);
      if (!current || new Date(d.generated_date || 0) > new Date(current.generated_date || 0)) docByKey.set(d.template_key, d);
    }

    const blockers: string[] = [];
    const warnings: string[] = [];
    for (const template of applicable) {
      const decision = decisionByKey.get(template.template_key);
      const doc = docByKey.get(template.template_key);
      if (!decision) {
        blockers.push(`${template.title}: no applicability decision`);
        continue;
      }
      if (decision.status !== 'Approved' || decision.decision === 'Needs Scoping Decision') {
        blockers.push(`${template.title}: applicability is not approved`);
        continue;
      }
      if (decision.decision === 'Out of Scope') continue;
      if (decision.decision === 'Recommended' && !doc) {
        warnings.push(`${template.title}: recommended document has not been generated`);
        continue;
      }
      if (!doc) blockers.push(`${template.title}: ${decision.decision} document is missing`);
      else if (!['Approved', 'Published'].includes(doc.status)) blockers.push(`${template.title}: current document is ${doc.status}`);
      else if (doc.stale) blockers.push(`${template.title}: approved document is stale`);
      else if ((doc.missing_fields || []).length || (doc.unresolved_fields || []).length || (doc.missing_approval_fields || []).length) {
        blockers.push(`${template.title}: document contains unresolved fields`);
      }
    }
    if (mode === 'Ready' && blockers.length) {
      return Response.json({ error: 'Ready package blocked.', blockers, warnings }, { status: 409 });
    }

    const selectedDocs = [...docByKey.values()].filter((d: any) => {
      if (mode === 'Ready') return ['Approved', 'Published'].includes(d.status) && !d.stale;
      return !['Archived', 'Superseded'].includes(d.status);
    });
    const zip = new JSZip();
    const hashEntries: any[] = [];
    const documentRows: any[][] = [];
    for (const doc of selectedDocs.sort((a: any, b: any) => String(a.title).localeCompare(String(b.title)))) {
      if (!doc.file_uri || !/^[a-f0-9]{64}$/.test(doc.output_sha256 || '')) {
        if (mode === 'Ready') return Response.json({ error: `${doc.title}: file URI or SHA-256 is missing.` }, { status: 409 });
        warnings.push(`${doc.title}: omitted because file URI or hash is missing`);
        continue;
      }
      let bytes: Uint8Array;
      try { bytes = await fetchVerified(sr, doc.file_uri, doc.output_sha256); }
      catch (e) {
        if (mode === 'Ready') return Response.json({ error: `${doc.title}: ${e.message}` }, { status: 409 });
        warnings.push(`${doc.title}: omitted because ${e.message}`);
        continue;
      }
      const typeFolder = safe(doc.document_type || 'Other');
      const path = `02_Current_Documents/${typeFolder}/${safe(doc.file_name || doc.title + '.docx')}`;
      zip.file(path, bytes);
      hashEntries.push({ path, sha256: doc.output_sha256, project_document_id: doc.id, status: doc.status, version: doc.document_version });
      documentRows.push([doc.document_id, doc.title, doc.document_type, doc.document_version, doc.status, doc.effective_date, doc.next_review_date, doc.output_sha256, path]);
    }

    const decisionRows = applicable.map((template: any) => {
      const d = decisionByKey.get(template.template_key);
      return [template.document_id, template.title, d?.decision || 'Needs Scoping Decision', d?.status || 'Missing',
        d?.justification || '', d?.supporting_evidence_ids || [], d?.reassessment_trigger || '', d?.reviewer_name || '', d?.approved_date || '', d?.decision_sha256 || ''];
    });
    const gapRows = applicable.map((template: any) => {
      const d = decisionByKey.get(template.template_key);
      const doc = docByKey.get(template.template_key);
      return [template.document_id, template.title, d?.decision || 'Missing', doc?.status || 'Missing',
        doc?.stale ? 'Yes' : 'No', doc?.missing_fields || [], doc?.unresolved_fields || [],
        blockers.filter((b) => b.startsWith(template.title + ':')).join('; ')];
    });

    const indexCsv = csvFile(['Document ID', 'Title', 'Type', 'Version', 'Status', 'Effective Date', 'Next Review', 'SHA-256', 'Package Path'], documentRows);
    const applicabilityCsv = csvFile(['Document ID', 'Title', 'Decision', 'Decision Status', 'Justification', 'Evidence IDs', 'Reassessment Trigger', 'Reviewer', 'Approved Date', 'Decision SHA-256'], decisionRows);
    const gapCsv = csvFile(['Document ID', 'Title', 'Applicability', 'Document Status', 'Stale', 'Missing Fields', 'Unresolved Fields', 'Blocker'], gapRows);
    zip.file('01_Document_Index/Document_Index.csv', indexCsv);
    zip.file('03_Applicability/Applicability_Decision_Register.csv', applicabilityCsv);
    zip.file('05_Reports/Missing_Information_and_Stale_Documents.csv', gapCsv);

    hashEntries.push(
      { path: '01_Document_Index/Document_Index.csv', sha256: await sha256Hex(new TextEncoder().encode(indexCsv)) },
      { path: '03_Applicability/Applicability_Decision_Register.csv', sha256: await sha256Hex(new TextEncoder().encode(applicabilityCsv)) },
      { path: '05_Reports/Missing_Information_and_Stale_Documents.csv', sha256: await sha256Hex(new TextEncoder().encode(gapCsv)) },
    );
    const generatedDate = new Date().toISOString();
    const readme = [
      `${organization.legal_name || organization.organization_name || 'Organization'} — ${project.project_name}`,
      `Canonical Document Package (${mode})`, '',
      'This package was generated from versioned ProjectDocument records.',
      'Ready mode contains only current Approved or Published documents.',
      'Verify each listed file against 04_Integrity/sha256-manifest.json.',
      blockers.length ? `BLOCKERS: ${blockers.join(' | ')}` : 'BLOCKERS: None',
      warnings.length ? `WARNINGS: ${warnings.join(' | ')}` : 'WARNINGS: None',
    ].join('\r\n');
    zip.file('00_Read_Me/README.txt', readme);
    hashEntries.push({ path: '00_Read_Me/README.txt', sha256: await sha256Hex(new TextEncoder().encode(readme)) });

    const sourceState = {
      project: { id: project.id, updated_date: project.updated_date || '' },
      templates: applicable.map((t: any) => ({ id: t.id, key: t.template_key, version: t.template_version, sha256: t.normalized_sha256 })).sort((a: any, b: any) => a.key.localeCompare(b.key)),
      documents: selectedDocs.map((d: any) => ({ id: d.id, sha256: d.output_sha256, status: d.status, updated_date: d.updated_date || '' })).sort((a: any, b: any) => a.id.localeCompare(b.id)),
      decisions: [...decisionByKey.values()].map((d: any) => ({ id: d.id, sha256: d.decision_sha256, status: d.status })).sort((a: any, b: any) => a.id.localeCompare(b.id)),
    };
    const sourceStateSha = await sha256Hex(new TextEncoder().encode(stableStringify(sourceState)));
    const manifest = {
      schema_version: '1.0', package_mode: mode, project_id: project.id,
      organization_id: project.organization_id, generated_date: generatedDate,
      source_state_sha256: sourceStateSha, files: hashEntries.sort((a, b) => a.path.localeCompare(b.path)),
    };
    const manifestText = JSON.stringify(manifest, null, 2);
    const manifestSha = await sha256Hex(new TextEncoder().encode(manifestText));
    zip.file('04_Integrity/sha256-manifest.json', manifestText);

    const bytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
    const outputSha = await sha256Hex(bytes);
    const today = generatedDate.slice(0, 10);
    const nextVersion = Math.max(0, ...priorPackages.map((p: any) => Number(p.package_version || 0))) + 1;
    const fileName = `${safe(organization.short_name || organization.organization_name || organization.legal_name, 'Organization')}_Document_Package_${mode}_v${nextVersion}_${today}.zip`;
    const uploaded = await sr.integrations.Core.UploadPrivateFile({ file: new File([bytes], fileName, { type: MIME }) });
    if (!uploaded?.file_uri) return Response.json({ error: 'Package upload failed.' }, { status: 502 });
    try { await fetchVerified(sr, uploaded.file_uri, outputSha); }
    catch (e) { return Response.json({ error: `Uploaded package failed verification: ${e.message}` }, { status: 502 }); }

    const priorActive = priorPackages.find((p: any) => p.status === 'Generated');
    const actor = caller.full_name || caller.email || 'System';
    const record = await sr.entities.ProjectDocumentPackage.create({
      organization_id: project.organization_id, project_id: project.id,
      package_name: `${project.project_name} — ${mode} Document Package`, package_mode: mode,
      package_version: nextVersion, file_name: fileName, file_uri: uploaded.file_uri,
      output_sha256: outputSha, manifest_sha256: manifestSha, source_state_sha256: sourceStateSha,
      included_document_ids: hashEntries.filter((e) => e.project_document_id).map((e) => e.project_document_id),
      included_document_count: hashEntries.filter((e) => e.project_document_id).length,
      applicability_decision_count: decisionByKey.size, blockers, warnings, status: 'Generated',
      generated_by: actor, generated_by_email: caller.email || '', generated_date: generatedDate,
      supersedes_package_id: priorActive?.id || '',
    });
    if (priorActive) await sr.entities.ProjectDocumentPackage.update(priorActive.id, { status: 'Superseded', superseded_by_package_id: record.id }).catch(() => {});
    const signed = await sr.integrations.Core.CreateFileSignedUrl({ file_uri: uploaded.file_uri });
    return Response.json({ package: record, download_url: signed.signed_url, blockers, warnings });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
