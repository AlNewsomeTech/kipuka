// Generates a clean, branded PDF summarizing a project's current CMMC status,
// open POA&M items, and latest SPRS score. User-triggered only.
import { base44 } from '@/api/base44Client';
import { createReportPdf, safeFileName, BRAND } from '@/lib/reportBranding';
import { computeCanonicalReadiness } from '@/lib/canonicalReadiness';

const CLOSED_POAM = ['Closed', 'Accepted Risk'];

export async function generateProjectStatusReport({ project, org, generatedBy }) {
  const [assessments, poams, sprsList, evidence, objectiveLibrary, objectiveLinks] = await Promise.all([
    base44.entities.ControlAssessment.filter({ project_id: project.id }).catch(() => []),
    base44.entities.ProjectPOAM.filter({ project_id: project.id }).catch(() => []),
    base44.entities.SPRSRecord.filter({ project_id: project.id }).catch(() => []),
    base44.entities.ProjectEvidence.filter({ project_id: project.id }).catch(() => []),
    base44.entities.AssessmentObjectiveLibrary.filter({ active: true, cmmc_level: project.target_cmmc_level }, 'sort_order', 500).catch(() => []),
    base44.entities.ObjectiveEvidenceLink.filter({ project_id: project.id }, 'objective_id', 500).catch(() => []),
  ]);

  const canonical = computeCanonicalReadiness({
    project, assessments, objectiveLibrary, objectiveLinks, evidence, poams,
  });
  const total = canonical.expected_requirements;
  const implemented = canonical.implemented;
  const met = canonical.met;
  const partial = assessments.filter((a) => a.status === 'Partially Implemented').length;
  const notImplemented = canonical.not_met + canonical.evidence_incomplete + canonical.not_assessed;
  const readiness = canonical.integrity_ok ? canonical.readiness_pct : null;
  const needEvidence = canonical.controls_needing_final_evidence;

  const openPoams = poams
    .filter((p) => !CLOSED_POAM.includes(p.status))
    .sort((a, b) => {
      const order = { Critical: 0, High: 1, Moderate: 2, Low: 3 };
      return (order[a.risk_rating] ?? 4) - (order[b.risk_rating] ?? 4);
    });
  const highRisk = openPoams.filter((p) => ['High', 'Critical'].includes(p.risk_rating)).length;

  const sprs = sprsList[0] || null;
  const canonicalSprs = canonical.integrity_ok && project.target_cmmc_level === 'Level 2'
    ? canonical.sprs_current
    : null;

  const pdf = createReportPdf({
    title: 'CMMC Status Report',
    project, org, generatedBy,
  });

  // ---- CMMC readiness summary ----
  pdf.heading('CMMC Readiness Summary');
  pdf.label('Target CMMC Level', project.target_cmmc_level);
  pdf.label('Assessment Path', project.assessment_path);
  pdf.label('Project Status', project.project_status);
  pdf.label('Assessment Readiness', readiness == null ? 'Unavailable — canonical data integrity issue' : `${readiness}%`);
  pdf.space(6);
  pdf.label('Requirements MET', canonical.integrity_ok ? `${met} of ${total}` : '—');
  pdf.label('Implementation Complete', canonical.integrity_ok ? `${implemented} of ${total}` : '—');
  pdf.label('Partially Implemented', partial);
  pdf.label('Not MET / Not Assessed', notImplemented);
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

  // ---- Canonical SPRS calculation and latest submitted record ----
  pdf.heading('SPRS Score');
  pdf.label('Canonical calculated score', canonicalSprs == null ? 'Unavailable' : canonicalSprs);
  pdf.label('Calculated from', 'Objective-level findings and final evidence');
  pdf.space(4);
  pdf.heading('Latest Submitted SPRS Record');
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