// User-triggered SPRS/PIEE report builders. Client-side PDF generation only.
import { base44 } from '@/api/base44Client';
import { createReportPdf, BRAND, stripHtml, safeFileName } from '@/lib/reportBranding';
import { PIEE_STEPS } from '@/lib/sprsSteps';

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

// Client-facing step-by-step PIEE/SPRS instructions PDF.
export async function generateSprsInstructionsPdf({ project, org, record, generatedBy }) {
  const r = createReportPdf({ title: 'PIEE / SPRS Submission Instructions', project, org, generatedBy });

  r.heading('Your Registration Details');
  r.label('UEI', record?.uei || project.uei || '—');
  r.label('CAGE Code', record?.cage_code || project.primary_cage_code || '—');
  r.label('Assessment Type', record?.assessment_type || 'Unknown');
  r.label('Affirming Official', `${record?.affirming_official_name || project.affirming_official_name || '—'} (${record?.affirming_official_email || project.affirming_official_email || '—'})`);

  r.heading('Step-by-Step Instructions');
  PIEE_STEPS.forEach((s) => {
    r.ensure(50);
    r.text(s.title, { bold: true, size: 11 });
    r.text(s.detail);
    if (s.link) r.text(`Link: ${s.link}`);
    r.space(6);
  });

  r.heading('Important Notes');
  r.text('• SPRS submission and affirmation are performed by your organization; Pacific Global Security Group provides guidance and support.');
  r.text('• Keep screenshots of each step for your evidence package.');
  r.text('• Renew your affirmation annually to remain eligible for DoD awards.');

  r.disclaimerNote(BRAND.disclaimer);
  r.save(`${safeFileName(project.project_name)}_PIEE_SPRS_Instructions.pdf`);
  await logExport(project, 'SPRS Package', 'PIEE / SPRS Client Instructions', generatedBy);
}

// SPRS evidence package summarizing the record + linked evidence.
export async function generateSprsEvidencePackage({ project, org, record, evidence = [], generatedBy }) {
  const r = createReportPdf({ title: 'SPRS Evidence Package', project, org, generatedBy });

  r.heading('SPRS / PIEE Record');
  r.label('PIEE Account Status', record?.piee_account_status || 'Not Started');
  r.label('SPRS Role', record?.sprs_role || 'None');
  r.label('SPRS Access Status', record?.sprs_access_status || 'Not Started');
  r.label('Assessment Type', record?.assessment_type || 'Unknown');
  r.label('Assessment Score', record?.assessment_score ?? '—');
  r.label('CMMC UID', record?.cmmc_uid || '—');
  r.label('CMMC Status', record?.cmmc_status || 'Unknown');
  r.label('Submitted Date', record?.submitted_date || '—');
  r.label('Affirmed Date', record?.affirmed_date || '—');
  r.label('Expiration Date', record?.expiration_date || '—');
  r.label('Affirming Official', `${record?.affirming_official_name || '—'} (${record?.affirming_official_email || '—'})`);

  if (record?.notes) { r.heading('Notes'); r.text(stripHtml(record.notes)); }

  r.heading('Linked Evidence');
  const linked = evidence.filter((e) => (record?.evidence_item_ids || []).includes(e.id));
  if (!linked.length) r.text('No evidence items linked to this SPRS record.');
  else linked.forEach((e) => r.text(`• ${e.evidence_title} [${e.evidence_type}]${e.file_name ? ` — ${e.file_name}` : ''}`));

  r.disclaimerNote(BRAND.disclaimer);
  r.save(`${safeFileName(project.project_name)}_SPRS_Evidence_Package.pdf`);
  await logExport(project, 'SPRS Package', 'SPRS Evidence Package', generatedBy);
}