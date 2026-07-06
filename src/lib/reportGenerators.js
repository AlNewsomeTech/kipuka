// User-triggered report builders. Each returns nothing; it generates a PDF/CSV
// download client-side. No automation, no external calls.
import { base44 } from '@/api/base44Client';
import { createReportPdf, BRAND, stripHtml, safeFileName } from '@/lib/reportBranding';

function pct(done, total) { return total ? Math.round((done / total) * 100) : 0; }

async function logExport(project, report_type, report_title, generatedBy) {
  await base44.entities.ReportExport.create({
    organization_id: project.organization_id,
    project_id: project.id,
    report_type,
    report_title,
    generated_by: generatedBy || '',
    generated_date: new Date().toISOString(),
    report_status: 'Generated',
  }).catch(() => {});
}

function downloadCsv(rows, filename) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = rows.map((r) => r.map(esc).join(',')).join('\r\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// 1. Executive Readiness Report
export async function generateExecutiveReadiness({ project, org, assessments, poams, evidence, generatedBy }) {
  const total = assessments.length;
  const implemented = assessments.filter((a) => a.status === 'Implemented').length;
  const readiness = pct(implemented, total);
  const openPoams = poams.filter((p) => !['Closed', 'Accepted Risk'].includes(p.status));
  const blockers = assessments.filter((a) => a.status === 'Not Implemented' && ['High', 'Critical'].includes(a.risk_rating));

  const r = createReportPdf({ title: 'Executive Readiness Report', project, org, generatedBy });
  r.heading('Assessment Overview');
  r.label('Target CMMC Level', project.target_cmmc_level);
  r.label('Assessment Path', project.assessment_path);
  r.label('Overall Readiness', `${readiness}% (${implemented} of ${total} controls implemented)`);
  r.label('Project Status', project.project_status);

  r.heading('Major Blockers');
  if (blockers.length === 0) r.text('No high or critical not-implemented controls.');
  else blockers.forEach((b) => r.text(`• ${b.control_id} — ${b.control_title} (${b.risk_rating})`));

  r.heading('Open POA&M Summary');
  r.label('Open Items', openPoams.length);
  r.label('High/Critical Open', openPoams.filter((p) => ['High', 'Critical'].includes(p.risk_rating)).length);

  r.heading('Evidence Summary');
  r.label('Total Evidence Items', evidence.length);
  r.label('Accepted', evidence.filter((e) => e.review_status === 'Accepted').length);
  r.label('Needs Review / Draft', evidence.filter((e) => ['Draft', 'Needs Review'].includes(e.review_status)).length);

  r.heading('Recommended Next Steps');
  const steps = [];
  if (blockers.length) steps.push('Remediate high/critical not-implemented controls listed above.');
  if (openPoams.length) steps.push('Drive open POA&M items to closure with owners and due dates.');
  if (evidence.filter((e) => ['Draft', 'Needs Review'].includes(e.review_status)).length) steps.push('Complete review of draft/pending evidence.');
  if (readiness < 100) steps.push('Continue control implementation toward 100% readiness.');
  if (!steps.length) steps.push('Prepare for assessment submission and final package generation.');
  steps.forEach((s) => r.text(`• ${s}`));

  r.disclaimerNote(BRAND.disclaimer);
  r.save(`${safeFileName(project.project_name)}_Executive_Readiness.pdf`);
  await logExport(project, 'Executive Readiness Report', 'Executive Readiness Report', generatedBy);
}

// 2. Gap Assessment Report
export async function generateGapAssessment({ project, org, assessments, evidence, poams, generatedBy }) {
  const by = (s) => assessments.filter((a) => a.status === s);
  const evByControl = {};
  evidence.forEach((e) => (e.control_ids || []).forEach((c) => (evByControl[c] = true)));
  const evidenceGaps = assessments.filter((a) => !evByControl[a.control_id]);
  const highRisk = assessments.filter((a) => ['High', 'Critical'].includes(a.risk_rating) && a.status !== 'Implemented');

  const r = createReportPdf({ title: 'Gap Assessment Report', project, org, generatedBy });
  r.heading('Control Implementation Status');
  r.label('Implemented', by('Implemented').length);
  r.label('Partially Implemented', by('Partially Implemented').length);
  r.label('Not Implemented', by('Not Implemented').length);
  r.label('Not Applicable', by('Not Applicable').length);
  r.label('Not Started', by('Not Started').length);

  r.heading('Partially Implemented Controls');
  by('Partially Implemented').forEach((a) => r.text(`• ${a.control_id} — ${a.control_title}`));
  if (!by('Partially Implemented').length) r.text('None.');

  r.heading('Not Implemented Controls');
  by('Not Implemented').forEach((a) => r.text(`• ${a.control_id} — ${a.control_title} (${a.risk_rating})`));
  if (!by('Not Implemented').length) r.text('None.');

  r.heading('Evidence Gaps');
  evidenceGaps.forEach((a) => r.text(`• ${a.control_id} — ${a.control_title}`));
  if (!evidenceGaps.length) r.text('Every tracked control has at least one piece of evidence.');

  r.heading('High-Risk Findings');
  highRisk.forEach((a) => r.text(`• ${a.control_id} — ${a.control_title} (${a.risk_rating}, ${a.status})`));
  if (!highRisk.length) r.text('No high-risk open findings.');

  r.heading('Remediation Summary');
  r.label('Open POA&M Items', poams.filter((p) => !['Closed', 'Accepted Risk'].includes(p.status)).length);
  poams.filter((p) => !['Closed', 'Accepted Risk'].includes(p.status)).slice(0, 30).forEach((p) =>
    r.text(`• ${p.poam_title} — ${p.status}${p.target_completion_date ? ` (due ${p.target_completion_date})` : ''}`));

  r.disclaimerNote(BRAND.disclaimer);
  r.save(`${safeFileName(project.project_name)}_Gap_Assessment.pdf`);
  await logExport(project, 'Gap Assessment Report', 'Gap Assessment Report', generatedBy);
}

// 3. Evidence Index (CSV)
export async function generateEvidenceIndex({ project, evidence, generatedBy }) {
  const rows = [['Evidence Title', 'Type', 'Linked Controls', 'Owner', 'Evidence Date', 'Expiration Date', 'Review Status']];
  evidence.forEach((e) => rows.push([
    e.evidence_title, e.evidence_type, (e.control_ids || []).join('; '),
    e.owner || '', e.evidence_date || '', e.expiration_date || '', e.review_status || '',
  ]));
  downloadCsv(rows, `${safeFileName(project.project_name)}_Evidence_Index.csv`);
  await logExport(project, 'Evidence Index', 'Evidence Index', generatedBy);
}

// 4. Policy Package (PDF listing approved policies)
export async function generatePolicyPackage({ project, org, policies, generatedBy }) {
  const r = createReportPdf({ title: 'Policy Package', project, org, generatedBy });
  const approved = policies.filter((p) => p.approval_status === 'Approved');
  r.heading('Policy Register');
  r.label('Total Project Policies', policies.length);
  r.label('Approved Policies', approved.length);
  r.space();
  policies.forEach((p) => {
    r.ensure(60);
    r.text(p.policy_name, { bold: true, size: 11 });
    r.label('Status', p.approval_status);
    r.label('Mapped Controls', (p.mapped_control_ids || []).join(', ') || '—');
    r.label('Review Date', p.review_date || '—');
    r.space(6);
  });
  r.disclaimerNote(BRAND.disclaimer);
  r.save(`${safeFileName(project.project_name)}_Policy_Package.pdf`);
  await logExport(project, 'Policy Package', 'Policy Package', generatedBy);
}

// 5. C3PAO Handoff Package (Premium) — comprehensive PDF
export async function generateC3PAOHandoff({ project, org, scoping, assets, ssp, assessments, evidence, poams, policies, generatedBy }) {
  const r = createReportPdf({ title: 'C3PAO Handoff Package', project, org, generatedBy });

  r.heading('Executive Summary');
  const implemented = assessments.filter((a) => a.status === 'Implemented').length;
  r.text(`${org?.organization_name || 'The organization'} is pursuing ${project.target_cmmc_level} via ${project.assessment_path}. ${implemented} of ${assessments.length} in-scope controls are implemented. This package consolidates scope, assets, SSP, POA&M, evidence, controls, and policies for C3PAO review.`);

  r.heading('Scope Summary');
  if (scoping) {
    r.label('Handles FCI', scoping.handles_fci ? 'Yes' : 'No');
    r.label('Handles CUI', scoping.handles_cui ? 'Yes' : 'No');
    r.label('Environment', scoping.environment_type);
    r.text(stripHtml(scoping.boundary_summary) || 'Boundary summary not documented.');
  } else r.text('No scoping profile recorded.');

  r.heading('Asset Inventory');
  r.label('Total Assets', assets.length);
  r.label('In-Scope Assets', assets.filter((a) => a.in_scope).length);
  assets.slice(0, 40).forEach((a) => r.text(`• ${a.asset_name} — ${a.asset_type} (${a.scope_category})`));

  r.heading('System Security Plan');
  if (ssp) { r.label('SSP Title', ssp.ssp_title); r.label('Version', ssp.version); r.label('Status', ssp.approval_status); }
  else r.text('No SSP generated yet.');

  r.heading('POA&M');
  r.label('Open Items', poams.filter((p) => !['Closed', 'Accepted Risk'].includes(p.status)).length);
  poams.slice(0, 40).forEach((p) => r.text(`• ${p.poam_title} — ${p.status} (${p.risk_rating})`));

  r.heading('Evidence Index');
  r.label('Total Evidence', evidence.length);
  evidence.slice(0, 60).forEach((e) => r.text(`• ${e.evidence_title} [${e.evidence_type}] → ${(e.control_ids || []).join(', ') || '—'}`));

  r.heading('Control Implementation Matrix');
  assessments.forEach((a) => r.text(`• ${a.control_id} — ${a.status} / evidence: ${a.evidence_status}`));

  r.heading('Policies');
  policies.forEach((p) => r.text(`• ${p.policy_name} — ${p.approval_status}`));

  r.heading('SPRS / PIEE Confirmation');
  r.text('Confirm SPRS score entry and PIEE affirmation via the SPRS / PIEE module before submission.');

  r.heading('Open Risks');
  assessments.filter((a) => ['High', 'Critical'].includes(a.risk_rating) && a.status !== 'Implemented')
    .forEach((a) => r.text(`• ${a.control_id} — ${a.risk_rating} (${a.status})`));

  r.heading('Contact Sheet');
  r.label('Project Owner', `${project.project_owner_name || '—'} (${project.project_owner_email || '—'})`);
  r.label('Affirming Official', `${project.affirming_official_name || '—'} (${project.affirming_official_email || '—'})`);
  r.label('Prepared By', `${BRAND.company} — ${BRAND.product}`);

  r.disclaimerNote(BRAND.poamDisclaimer + ' ' + BRAND.disclaimer);
  r.save(`${safeFileName(project.project_name)}_C3PAO_Handoff.pdf`);
  await logExport(project, 'C3PAO Handoff Package', 'C3PAO Handoff Package', generatedBy);
}

// Mock Assessment Report (PDF) — C3PAO-style verdict summary.
export async function generateMockAssessmentReport({ project, org, session, objectives, generatedBy }) {
  const met = objectives.filter((o) => o.verdict === 'Met');
  const notMet = objectives.filter((o) => o.verdict === 'Not Met');
  const na = objectives.filter((o) => o.verdict === 'Not Applicable');

  const r = createReportPdf({ title: 'Mock Assessment Report', project, org, generatedBy });
  r.heading('Assessment Session');
  r.label('Session', session.session_name || 'Mock Assessment');
  r.label('Scope', session.scope_level);
  r.label('Run By', session.run_by || generatedBy || '—');
  r.label('Date', session.session_date || new Date().toLocaleDateString());
  r.label('Overall Verdict', session.overall_verdict);
  r.label('Completion', `${session.completion_pct || 0}%`);

  r.heading('Objective Results');
  r.label('Objectives Assessed', met.length + notMet.length + na.length + ' of ' + objectives.length);
  r.label('Met', met.length);
  r.label('Not Met', notMet.length);
  r.label('Not Applicable', na.length);

  // Failed objectives grouped by control with remediation hints.
  const byControl = {};
  notMet.forEach((o) => (byControl[o.control_id] ||= { title: o.control_title, items: [] }).items.push(o));
  r.heading('Failed Objectives & Remediation Hints');
  const controls = Object.keys(byControl).sort();
  if (!controls.length) r.text('No failed objectives recorded. This does not by itself indicate a passing assessment.');
  controls.forEach((cid) => {
    r.ensure(50);
    r.text(`${cid} — ${byControl[cid].title || ''}`, { bold: true, size: 11 });
    byControl[cid].items.forEach((o) => {
      r.text(`• ${o.objective_id}: ${o.objective_text}`);
      if (o.justification) r.text(`   Justification: ${stripHtml(o.justification)}`, { size: 9 });
      if (o.assessor_notes) r.text(`   Assessor notes: ${stripHtml(o.assessor_notes)}`, { size: 9 });
    });
    r.text('   Remediation hint: implement the objective above, capture supporting evidence, and create a POA&M item to track closure.', { size: 9 });
    r.space(4);
  });

  r.heading('Not Applicable Objectives');
  if (!na.length) r.text('None.');
  na.forEach((o) => r.text(`• ${o.objective_id} (${o.control_id}) — ${stripHtml(o.justification) || 'No justification recorded.'}`));

  r.disclaimerNote('This is a self-run mock assessment for readiness planning only. It is not an official C3PAO assessment. ' + BRAND.disclaimer);
  r.save(`${safeFileName(project.project_name)}_Mock_Assessment_Report.pdf`);
  await logExport(project, 'Mock Assessment Report', 'Mock Assessment Report', generatedBy);
}

// POA&M CSV export
export async function generatePoamCsv({ project, poams, generatedBy }) {
  const rows = [['Title', 'Control', 'Risk', 'Status', 'Owner', 'Target Date', 'Actual Date', 'Gap', 'Remediation']];
  poams.forEach((p) => rows.push([
    p.poam_title, p.control_id || '', p.risk_rating, p.status, p.responsible_owner || '',
    p.target_completion_date || '', p.actual_completion_date || '',
    stripHtml(p.gap_statement), stripHtml(p.remediation_plan),
  ]));
  downloadCsv(rows, `${safeFileName(project.project_name)}_POAM.csv`);
  await logExport(project, 'POA&M Export', 'POA&M Spreadsheet Export', generatedBy);
}

// POA&M PDF export
export async function generatePoamPdf({ project, org, poams, generatedBy }) {
  const r = createReportPdf({ title: 'Plan of Action & Milestones (POA&M)', project, org, generatedBy });
  r.disclaimerNote(BRAND.poamDisclaimer);
  r.space();
  poams.forEach((p) => {
    r.ensure(90);
    r.text(p.poam_title, { bold: true, size: 11 });
    r.label('Control', p.control_id || '—');
    r.label('Risk', p.risk_rating);
    r.label('Status', p.status);
    r.label('Owner', p.responsible_owner || '—');
    r.label('Target Date', p.target_completion_date || '—');
    r.text('Gap: ' + (stripHtml(p.gap_statement) || '—'));
    r.text('Remediation: ' + (stripHtml(p.remediation_plan) || '—'));
    r.space(8);
  });
  if (!poams.length) r.text('No POA&M items recorded.');
  r.save(`${safeFileName(project.project_name)}_POAM.pdf`);
  await logExport(project, 'POA&M Export', 'POA&M PDF Export', generatedBy);
}

// Load an image URL into a data URL so jsPDF can embed it.
async function toDataUrl(url) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve) => { const fr = new FileReader(); fr.onload = () => resolve(fr.result); fr.readAsDataURL(blob); });
  } catch { return null; }
}

// SSP PDF export — C3PAO assembly with embedded diagrams + POA&M cross-refs.
export async function generateSspPdf({ project, org, ssp, statements, generatedBy, diagrams = [], poams = [], assessments = [] }) {
  const r = createReportPdf({ title: ssp?.ssp_title || 'System Security Plan', project, org, generatedBy });
  const sections = [
    ['System Name', ssp?.system_name], ['System Description', ssp?.system_description],
    ['System Purpose', ssp?.system_purpose], ['Authorization Boundary', ssp?.authorization_boundary],
    ['Environment', ssp?.environment_description], ['CUI Description', ssp?.cui_description],
    ['FCI Description', ssp?.fci_description], ['User Population', ssp?.user_population],
    ['Asset Summary', ssp?.asset_summary], ['Network Summary', ssp?.network_summary],
    ['Cloud Services', ssp?.cloud_services_summary], ['External Service Providers', ssp?.external_service_provider_summary],
    ['Roles & Responsibilities', ssp?.roles_and_responsibilities], ['Inherited Controls', ssp?.inherited_controls_summary],
    ['Shared Responsibility', ssp?.shared_responsibility_summary], ['Control Implementation Summary', ssp?.control_implementation_summary],
    ['Linked POA&M Summary', ssp?.linked_poam_summary],
  ];
  sections.forEach(([label, val]) => { r.heading(label); r.text(val || '<em>Not documented.</em>'); });

  // Embed exported network + data flow diagram images into the scoping section.
  const withImg = diagrams.filter((d) => d.image_url);
  if (withImg.length) {
    r.heading('Network & Data Flow Diagrams');
    for (const d of withImg) {
      r.text(d.title || d.diagram_type, { bold: true });
      const data = await toDataUrl(d.image_url);
      if (data) r.image(data); else r.text('(Diagram image could not be embedded — see the Diagrams module.)');
    }
  }

  // POA&M cross-reference map for NOT MET controls.
  const poamByControl = {};
  poams.forEach((p) => { if (p.control_id) (poamByControl[p.control_id] ||= []).push(p); });
  const notMet = new Set(assessments.filter((a) => ['Not Implemented', 'Partially Implemented', 'Gap Identified'].includes(a.status)).map((a) => a.control_id));

  r.heading('Control Implementation Statements');
  statements.forEach((s) => {
    r.ensure(50);
    r.text(`${s.control_id} — ${s.control_title || ''}`, { bold: true });
    r.text(s.implementation_statement || '—');
    if (notMet.has(s.control_id) && poamByControl[s.control_id]) {
      r.text(`POA&M cross-reference: ${poamByControl[s.control_id].map((p) => p.poam_title).join('; ')}`, { size: 9 });
    } else if (notMet.has(s.control_id)) {
      r.text('Control is NOT fully met — a POA&M item should be linked in the POA&M module.', { size: 9 });
    }
    r.space(4);
  });

  r.heading('Revision History');
  r.text(ssp?.revision_history || `v${ssp?.version || '1.0'} — Generated ${new Date().toLocaleDateString()}`);

  r.heading('Approval');
  r.label('Status', ssp?.approval_status || 'Draft');
  r.label('Approved By', ssp?.approved_by || '—');
  r.label('Approved Date', ssp?.approved_date || '—');

  r.disclaimerNote(BRAND.disclaimer);
  r.save(`${safeFileName(project.project_name)}_SSP.pdf`);
  await logExport(project, 'SSP Export', ssp?.ssp_title || 'System Security Plan', generatedBy);
}