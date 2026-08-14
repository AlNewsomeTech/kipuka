import { SCF_DATASET, scfReferencesFor } from '@/lib/scfCrossReferences';

function csvCell(value) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

export function buildScfCrossReferenceCsv({ project, library = [], assessments = [] }) {
  const assessmentByControl = new Map(assessments.map((row) => [row.control_id, row]));
  const rows = [[
    'Project',
    'CMMC Control ID',
    'CMMC Control Title',
    'CMMC Domain',
    'CMMC Implementation Status',
    'SCF Control ID',
    'SCF Control Title',
    'SCF Domain',
    'Mapping Use',
    'SCF Dataset Version',
    'SCF Source',
    'SCF Attribution',
  ]];

  for (const control of library) {
    const references = scfReferencesFor(control.control_id);
    const assessment = assessmentByControl.get(control.control_id);
    for (const reference of references) {
      rows.push([
        project?.project_name || '',
        control.control_id,
        control.control_title,
        control.domain,
        assessment?.status || 'Not Started',
        reference.scf_id,
        reference.scf_title,
        reference.scf_domain,
        'Cross-reference only; no automatic equivalence or status transfer',
        SCF_DATASET.version,
        SCF_DATASET.source_url,
        SCF_DATASET.attribution,
      ]);
    }
  }

  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
}

export function downloadScfCrossReferenceCsv(args) {
  const csv = buildScfCrossReferenceCsv(args);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const safeProjectName = String(args.project?.project_name || 'Kipuka')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${safeProjectName || 'Kipuka'}_CMMC_SCF_Cross_Reference_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
