// Generates a clean, branded PDF summarizing a project's current CMMC status,
// open POA&M items, and latest SPRS score. User-triggered only.
import { base44 } from '@/api/base44Client';
import { createReportPdf, safeFileName, BRAND } from '@/lib/reportBranding';

const CLOSED_POAM = ['Closed', 'Accepted Risk'];

export async function generateProjectStatusReport({ project, org, generatedBy }) {
  const [assessments, poams, sprsList, evidence] = await Promise.all([
    base44.entities.ControlAssessment.filter({ project_id: project.id }).catch(() => []),
    base44.entities.ProjectPOAM.filter({ project_id: project.id }).catch(() => []),
    base44.entities.SPRSRecord.filter({ project_id: project.id }).catch(() => []),
    base44.entities.ProjectEvidence.filter({ project_id: project.id }).catch(() => []),
  ]);

  const total = assessments.length;
  const implemented = assessments.filter((a) => a.status === 'Implemented').length;
  const partial = assessments.filter((a) => a.status === 'Partially Implemented').length;
  const notImplemented = assessments.filter((a) => a.status === 'Not Implemented').length;
  const readiness = total ? Math.round((implemented / total) * 100) : Math.round(project.current_readiness_score || 0);

  const evByControl = {};
  evidence.forEach((e) => (e.control_ids || []).forEach((c) => (evByControl[c] = true)));
  const needEvidence = assessments.filter((a) => !evByControl[a.control_id]).length;

  const openPoams = poams
    .filter((p) => !CLOSED_POAM.includes(p.status))
    .sort((a, b) => {
      const order = { Critical: 0, High: 1, Moderate: 2, Low: 3 };
      return (order[a.risk_rating] ?? 4) - (order[b.risk_rating] ?? 4);
    });
  const highRisk = openPoams.filter((p) => ['High', 'Critical'].includes(p.risk_rating)).length;

  const sprs = sprsList[0] || null;

  const pdf = createReportPdf({
    title: 'CMMC Status Report',
    project, org, generatedBy,
  });

  // ---- CMMC readiness summary ----
  pdf.heading('CMMC Readiness Summary');
  pdf.label('Target CMMC Level', project.target_cmmc_level);
  pdf.label('Assessment Path', project.assessment_path);
  pdf.label('Project Status', project.project_status);
  pdf.label('Overall Readiness', `${readiness}%`);
  pdf.space(6);
  pdf.label('Controls Implemented', total ? `${implemented} of ${total}` : '—');
  pdf.label('Partially Implemented', partial);
  pdf.label('Not Implemented', notImplemented);
  pdf.label('Controls Needing Evidence', needEvidence);

  // ---- Open POA&M items ----
  pdf.heading(`Open POA&M Items (${openPoams.length} open, ${highRisk} high-risk)`);
  if (openPoams.length === 0) {
    pdf.text('No open POA&M items. All plan-of-action items are closed or accepted.');
  } else {
    openPoams.forEach((p, i) => {
      pdf.ensure(60);
      pdf.text(`${i + 1}. ${p.poam_title || 'Untitled POA&M'}`, { bold: true });
      pdf.label('   Control', p.control_id || '—');
      pdf.label('   Risk', p.risk_rating || '—');
      pdf.label('   Owner', p.responsible_owner || '—');
      pdf.label('   Status', p.status || '—');
      pdf.label('   Target Date', p.target_completion_date || '—');
      pdf.space(4);
    });
    pdf.disclaimerNote(BRAND.poamDisclaimer);
  }

  // ---- Latest SPRS ----
  pdf.heading('Latest SPRS Score');
  if (!sprs) {
    pdf.text('No SPRS record has been created for this project yet.');
  } else {
    pdf.label('Assessment Type', sprs.assessment_type);
    pdf.label('Assessment Score', sprs.assessment_score ?? 'Not entered');
    pdf.label('CMMC Status', sprs.cmmc_status);
    pdf.label('CMMC UID', sprs.cmmc_uid || '—');
    pdf.label('PIEE Account Status', sprs.piee_account_status);
    pdf.label('SPRS Access Status', sprs.sprs_access_status);
    pdf.label('Submitted Date', sprs.submitted_date || 'Not submitted');
    pdf.label('Affirmed Date', sprs.affirmed_date || 'Not affirmed');
    pdf.label('Expiration Date', sprs.expiration_date || '—');
    pdf.label('Affirming Official', sprs.affirming_official_name || '—');
  }

  pdf.save(`${safeFileName(project.project_name)}_CMMC_Status_Report.pdf`);
}