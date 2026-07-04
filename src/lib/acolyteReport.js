// ACOLYTE executive report PDF generator. Reuses the shared branded PDF helper
// but stamps ACOLYTE service identity and "Prepared by Pacific Global Security Group".
import { createReportPdf, safeFileName } from '@/lib/reportBranding';
import { ACOLYTE_BRAND } from '@/lib/acolyte';

const SECTIONS = [
  ['executive_summary', 'Executive Summary'],
  ['readiness_status_summary', 'Cyber Readiness Status'],
  ['major_risks', 'Current Major Risks'],
  ['open_high_priority_findings', 'Open High-Priority Findings'],
  ['completed_actions', 'Completed Actions'],
  ['remediation_progress', 'Remediation Progress'],
  ['incident_readiness_summary', 'Incident Readiness'],
  ['compliance_alignment_summary', 'Compliance Alignment'],
  ['leadership_decisions_needed', 'Leadership Decisions Needed'],
  ['next_recommended_actions', 'Next Recommended Actions'],
];

export function generateAcolyteReportPdf({ report, project, org, generatedBy, demo = false }) {
  const pdf = createReportPdf({
    title: report.report_title || 'Executive Cyber Report',
    project, org, generatedBy: generatedBy || report.prepared_by, poweredBy: false,
  });
  const { doc, state } = pdf;

  // ACOLYTE service identity line.
  doc.setFontSize(10); doc.setFont(undefined, 'bold'); doc.setTextColor(15, 30, 60);
  doc.text('ACOLYTE — Managed Cyber Readiness & Security Operations', 48, state.y);
  state.y += 14;
  doc.setFont(undefined, 'normal'); doc.setTextColor(80); doc.setFontSize(9);
  doc.text(ACOLYTE_BRAND.preparedBy, 48, state.y); state.y += 12;
  if (report.report_period_start || report.report_period_end) {
    doc.text(`Reporting period: ${report.report_period_start || '—'} to ${report.report_period_end || '—'}`, 48, state.y);
    state.y += 12;
  }
  doc.setTextColor(0);

  if (demo) {
    pdf.disclaimerNote('DEMO ONLY — Sample ACOLYTE data. Not for submission, affirmation, or external distribution.');
  }
  pdf.space(6);

  SECTIONS.forEach(([key, label]) => {
    pdf.heading(label);
    pdf.text(report[key] || '—');
  });

  pdf.disclaimerNote(ACOLYTE_BRAND.reportDisclaimer);
  pdf.save(`${safeFileName(report.report_title || 'ACOLYTE_Executive_Report')}${demo ? '_DEMO' : ''}.pdf`);
}