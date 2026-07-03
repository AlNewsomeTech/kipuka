// Evidence index CSV export. Manual, user-triggered download.
function esc(v) {
  const s = (v ?? '').toString().replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return `"${s.replace(/"/g, '""')}"`;
}

export function exportEvidenceIndex(evidence, project) {
  const headers = [
    'Evidence Title', 'Type', 'Mapped Controls', 'Owner', 'Evidence Date',
    'Expiration Date', 'Review Status', 'Source System', 'Uploaded By', 'File Name', 'File URL',
  ];
  const rows = (evidence || []).map((e) => [
    e.evidence_title, e.evidence_type, (e.control_ids || []).join('; '), e.owner,
    e.evidence_date, e.expiration_date, e.review_status, e.source_system,
    e.uploaded_by, e.file_name, e.file_url,
  ].map(esc).join(','));

  const csv = [headers.map(esc).join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const name = (project?.project_name || 'project').replace(/[^a-z0-9]+/gi, '_');
  a.href = url;
  a.download = `evidence_index_${name}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}