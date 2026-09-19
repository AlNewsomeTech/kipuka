import { base44 } from '@/api/base44Client';
import { BRAND, getReportBranding, safeFileName } from '@/lib/reportBranding';
import { SSP_SECTIONS } from '@/lib/sspSections';
import { createSspDocxDocument } from '@/lib/sspDocxDocument';
import { cleanSspDraftText } from '@/lib/sspDraftText';

export async function generateSspDocx({ project, org, ssp, statements = [], generatedBy, diagrams = [], poams = [], assessments = [] }) {
  const belongs = (row) => row.project_id === project.id && (!row.organization_id || row.organization_id === project.organization_id);
  if (!ssp || !belongs(ssp) || statements.some((row) => !belongs(row) || (row.ssp_id && row.ssp_id !== ssp.id))) throw new Error('The SSP export sources do not match this project.');
  const doc = createSspDocxDocument(BRAND.confidential);
  const branding = getReportBranding();
  doc.text(branding.wordmark || BRAND.product, 'Title');
  doc.text(BRAND.company);
  doc.text(ssp.ssp_title || 'System Security Plan', 'Title');
  doc.text('DRAFT — Editable working document');
  doc.text(`Organization: ${org?.organization_name || 'Not recorded'}`);
  doc.text(`Project: ${project.project_name}`);
  doc.text(`Version: ${ssp.version || '1.0'}`);
  doc.text(`Generated: ${new Date().toLocaleString()}${generatedBy ? ` by ${generatedBy}` : ''}`);
  for (const section of SSP_SECTIONS) {
    doc.text(section.label, 'Heading1');
    doc.html(cleanSspDraftText(ssp[section.key]) || '<p>Not documented.</p>');
  }
  const projectDiagrams = diagrams.filter((row) => belongs(row) && row.image_url);
  if (projectDiagrams.length) {
    doc.text('Network & Data Flow Diagrams', 'Heading1');
    for (const diagram of projectDiagrams) {
      const title = diagram.title || diagram.diagram_type || 'Project diagram';
      doc.text(title, 'Heading2');
      await doc.image(diagram.image_url, title);
    }
  }
  doc.text('Control Implementation Statements', 'Heading1');
  if (!statements.length) doc.text('No individual control statements have been saved.');
  const assessmentByControl = new Map(assessments.filter(belongs).map((row) => [row.control_id, row]));
  const projectPoams = poams.filter(belongs);
  for (const statement of [...statements].sort((a, b) => a.control_id.localeCompare(b.control_id, undefined, { numeric: true }))) {
    doc.text(`${statement.control_id} — ${statement.control_title || ''}`, 'Heading2');
    doc.html(cleanSspDraftText(statement.implementation_statement) || '<p>Not documented.</p>');
    const assessment = assessmentByControl.get(statement.control_id);
    if (['Not Implemented', 'Partially Implemented', 'Gap Identified'].includes(assessment?.status)) {
      const linked = projectPoams.filter((row) => row.control_id === statement.control_id);
      doc.text(linked.length ? `POA&M cross-reference: ${linked.map((row) => row.poam_title).join('; ')}` : 'Control is not fully met — a POA&M item should be linked in the POA&M module.');
    }
  }
  doc.text('Revision History', 'Heading1');
  doc.html(ssp.revision_history || `<p>Version ${ssp.version || '1.0'}</p>`);
  doc.text('Review Status', 'Heading1');
  doc.text(`Source SSP status: ${ssp.approval_status || 'Draft'}. This download is a working draft, not a final export.`);
  if (ssp.approved_by) doc.text(`Source approved by: ${ssp.approved_by}`);
  if (ssp.approved_date) doc.text(`Source approval date: ${ssp.approved_date}`);
  doc.text(BRAND.disclaimer);
  const blob = await doc.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeFileName(project.project_name)}_SSP_Draft.docx`;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  await base44.entities.ReportExport.create({
    organization_id: project.organization_id, project_id: project.id,
    report_type: 'SSP Export', report_title: `${ssp.ssp_title || 'System Security Plan'} — Draft Word document`,
    generated_by: generatedBy || '', generated_date: new Date().toISOString(), report_status: 'Generated',
  }).catch(() => {});
}