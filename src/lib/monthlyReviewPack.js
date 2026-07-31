// ACOLYTE Monthly Review Pack — one-click branded PDF.
//
// Reuses createReportPdf/BRAND (same machinery as every other Kipuka export)
// and pulls live data from the existing ACOLYTE + CMMC entities. Saves a
// ReportExport record (report_type 'ACOLYTE Monthly Review Pack') and downloads.
import { base44 } from '@/api/base44Client';
import { createReportPdf, safeFileName } from '@/lib/reportBranding';
import { ACOLYTE_BRAND, OPEN_FINDING_STATUSES, OPEN_REMEDIATION_STATUSES, isRemediationOverdue } from '@/lib/acolyte';
import { POSTURE_DOMAINS, scoreBand } from '@/lib/postureAssessment';
import { computeCanonicalReadiness } from '@/lib/canonicalReadiness';

const DAY = 24 * 60 * 60 * 1000;
const SEV_PRIORITY_ORDER = { Urgent: 4, High: 3, Medium: 2, Low: 1 };

function within(dateStr, days) {
  if (!dateStr) return false;
  return (Date.now() - new Date(dateStr).getTime()) <= days * DAY;
}

export async function generateMonthlyReviewPack({ project, org, generatedBy }) {
  const orgId = project?.organization_id;
  const projectId = project?.id;

  const [postureRows, findings, remediations, poams, sprsRecs, reviewNotes] = await Promise.all([
    base44.entities.PostureAssessment.filter({ organization_id: orgId }, '-created_date', 200).catch(() => []),
    base44.entities.CyberFinding.filter({ project_id: projectId }).catch(() => []),
    base44.entities.AcolyteRemediationItem.filter({ project_id: projectId }).catch(() => []),
    base44.entities.ProjectPOAM.filter({ project_id: projectId }).catch(() => []),
    base44.entities.SPRSRecord.filter({ project_id: projectId }).catch(() => []),
    base44.entities.SecurityReviewNote.filter({ project_id: projectId }, '-note_date', 5).catch(() => []),
  ]);

  const completed = postureRows.filter((p) => p.status === 'completed')
    .sort((a, b) => new Date(a.assessment_date || a.created_date) - new Date(b.assessment_date || b.created_date));
  const latest = completed[completed.length - 1] || null;
  const previous = completed[completed.length - 2] || null;
  const delta = latest && previous ? Math.round(latest.overall_score) - Math.round(previous.overall_score) : null;

  const pdf = createReportPdf({
    title: 'ACOLYTE Monthly Review Pack', project, org, generatedBy, poweredBy: false,
  });
  const { doc, state } = pdf;

  // ACOLYTE identity line.
  doc.setFontSize(10); doc.setFont(undefined, 'bold'); doc.setTextColor(15, 30, 60);
  doc.text('ACOLYTE — Managed Cyber Readiness & Security Operations', 48, state.y); state.y += 14;
  doc.setFont(undefined, 'normal'); doc.setTextColor(80); doc.setFontSize(9);
  doc.text(ACOLYTE_BRAND.preparedBy, 48, state.y); state.y += 12;
  const periodEnd = new Date();
  const periodStart = new Date(Date.now() - 30 * DAY);
  doc.text(`Reporting period: ${periodStart.toISOString().slice(0, 10)} to ${periodEnd.toISOString().slice(0, 10)}`, 48, state.y);
  state.y += 12; doc.setTextColor(0);
  pdf.space(6);

  // ---- Posture ----
  pdf.heading('Cyber Posture');
  if (latest) {
    const band = scoreBand(latest.overall_score);
    pdf.label('Current posture score', `${Math.round(latest.overall_score)}/100 (${band.label})`);
    pdf.label('Change vs previous', delta === null ? 'No prior assessment' : `${delta >= 0 ? '+' : ''}${delta}`);
    pdf.label('Assessed', latest.assessment_date || '—');
    pdf.space(4);
    doc.setFontSize(10); doc.setFont(undefined, 'bold'); doc.text('Per-domain scores', 48, state.y); state.y += 14;
    doc.setFont(undefined, 'normal');
    POSTURE_DOMAINS.forEach((d) => {
      const entry = latest.domain_scores?.[d.key];
      const na = entry && entry.applicable === 0;
      const scoreTxt = na ? 'N/A' : `${entry?.score ?? 0}%`;
      const weak = !na && (entry?.score ?? 0) < 55 ? '   ← weakest area' : '';
      pdf.label(`${d.label} (wt ${d.weight})`, `${scoreTxt}${weak}`);
    });
    // Trend as a table.
    pdf.space(4);
    doc.setFontSize(10); doc.setFont(undefined, 'bold'); doc.text('Posture trend', 48, state.y); state.y += 14;
    doc.setFont(undefined, 'normal');
    completed.slice(-6).forEach((a) => pdf.label(a.assessment_date || (a.created_date || '').slice(0, 10), `${Math.round(a.overall_score || 0)}/100`));
  } else {
    pdf.text('No posture assessment has been completed yet. Run a Cyber Posture Assessment to populate this section.');
  }

  // ---- Findings (30 days) ----
  pdf.heading('Findings — Last 30 Days');
  const openedF = findings.filter((f) => within(f.created_date, 30)).length;
  const closedF = findings.filter((f) => f.finding_status === 'Closed' && within(f.updated_date, 30)).length;
  const openF = findings.filter((f) => OPEN_FINDING_STATUSES.includes(f.finding_status)).length;
  pdf.label('Opened (30 days)', openedF);
  pdf.label('Closed (30 days)', closedF);
  pdf.label('Currently open', openF);

  // ---- Remediation velocity ----
  pdf.heading('Remediation Velocity');
  const openedR = remediations.filter((r) => within(r.created_date, 30)).length;
  const closedR = remediations.filter((r) => r.status === 'Complete' && within(r.updated_date, 30)).length;
  const overdueR = remediations.filter(isRemediationOverdue).length;
  const openR = remediations.filter((r) => OPEN_REMEDIATION_STATUSES.includes(r.status));
  pdf.label('Opened (30 days)', openedR);
  pdf.label('Closed (30 days)', closedR);
  pdf.label('Overdue', overdueR);
  pdf.label('Open total', openR.length);

  // ---- SPRS and readiness (canonical objective/evidence engine) ----
  pdf.heading('SPRS Score');
  const [assessments, objectiveLibrary, objectiveLinks, projectEvidence] = await Promise.all([
    base44.entities.ControlAssessment.filter({ project_id: projectId }).catch(() => []),
    base44.entities.AssessmentObjectiveLibrary.filter({ active: true, cmmc_level: project.target_cmmc_level }, 'sort_order', 500).catch(() => []),
    base44.entities.ObjectiveEvidenceLink.filter({ project_id: projectId }, 'objective_id', 500).catch(() => []),
    base44.entities.ProjectEvidence.filter({ project_id: projectId }).catch(() => []),
  ]);
  const canonical = computeCanonicalReadiness({
    project, assessments, objectiveLibrary, objectiveLinks, evidence: projectEvidence, poams,
  });
  pdf.label('Current SPRS score', canonical.integrity_ok ? canonical.sprs_current : 'Unavailable');
  pdf.label('Assessment readiness', canonical.integrity_ok ? `${canonical.readiness_pct}%` : 'Unavailable');
  pdf.label('Requirements MET', canonical.integrity_ok ? `${canonical.met} of ${canonical.expected_requirements}` : 'Unavailable');
  pdf.label('Implementation complete', canonical.integrity_ok ? `${canonical.implemented} of ${canonical.expected_requirements}` : 'Unavailable');

  // ---- Open POA&M summary ----
  pdf.heading('Open POA&M Summary');
  const openPoam = poams.filter((p) => !['Closed', 'Accepted Risk'].includes(p.status));
  const bySev = { Critical: 0, High: 0, Moderate: 0, Low: 0 };
  openPoam.forEach((p) => { if (bySev[p.risk_rating] !== undefined) bySev[p.risk_rating] += 1; });
  pdf.label('Open POA&M items', openPoam.length);
  Object.entries(bySev).forEach(([sev, n]) => pdf.label(`  ${sev}`, n));

  // ---- Top 5 next-period priorities ----
  pdf.heading('Top 5 Next-Period Priorities');
  const top5 = openR
    .slice()
    .sort((a, b) => (SEV_PRIORITY_ORDER[b.priority] || 0) - (SEV_PRIORITY_ORDER[a.priority] || 0))
    .slice(0, 5);
  if (top5.length === 0) {
    pdf.text('No open remediation items.');
  } else {
    top5.forEach((r, i) => {
      pdf.text(`${i + 1}. [${r.priority}] ${r.remediation_title}`, { bold: true });
      pdf.label('   Owner', r.owner || 'Unassigned');
      pdf.label('   Due', r.due_date || '—');
    });
  }

  // ---- Analyst notes (latest SecurityReviewNote) ----
  pdf.heading('Analyst Notes');
  const note = reviewNotes.find((n) => n.visibility !== 'Internal Only') || reviewNotes[0];
  if (note) {
    pdf.label('Note date', note.note_date || '—');
    pdf.label('Author', note.author || '—');
    pdf.text(note.title || '', { bold: true });
    pdf.text(note.body || '—');
  } else {
    pdf.text('No analyst review notes recorded for this period.');
  }

  pdf.disclaimerNote(ACOLYTE_BRAND.reportDisclaimer);

  // Save ReportExport record then download.
  const title = `ACOLYTE Monthly Review Pack — ${org?.organization_name || project?.project_name || ''}`.trim();
  await base44.entities.ReportExport.create({
    organization_id: orgId || '',
    project_id: projectId,
    report_type: 'ACOLYTE Monthly Review Pack',
    report_title: title,
    generated_by: generatedBy || '',
    generated_date: new Date().toISOString(),
    report_status: 'Generated',
  }).catch(() => {});

  pdf.save(`${safeFileName(title || 'ACOLYTE_Monthly_Review_Pack')}.pdf`);
  return { ok: true };
}