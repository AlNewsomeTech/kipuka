// Builds a Jira-import-ready CSV from CMMC control records.
// Jira's CSV importer maps columns to fields during import — these headers
// match Jira's common field names so mapping is one click.

// Maps Fulcrum control status -> a sensible Jira status label.
const STATUS_MAP = {
  'Not Started': 'To Do',
  'In Progress': 'In Progress',
  'Evidence Needed': 'In Progress',
  'Ready for Review': 'In Review',
  'Reviewed': 'In Review',
  'Complete': 'Done',
};

function csvCell(value) {
  const s = value == null ? '' : String(value);
  // Escape quotes and wrap fields containing commas, quotes, or newlines.
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// options: { projectKey, issueType, priority, assignee, includeGuidance, includeEvidence }
export function buildJiraCsv(controls, options = {}) {
  const {
    projectKey = '',
    issueType = 'Task',
    priority = 'Medium',
    assignee = '',
    includeGuidance = true,
    includeEvidence = true,
  } = options;

  const headers = [
    'Summary',
    'Issue Type',
    'Project Key',
    'Priority',
    'Assignee',
    'Status',
    'Labels',
    'Description',
  ];

  const rows = controls.map((c) => {
    const descParts = [];
    if (c.explanation) descParts.push(c.explanation);
    if (includeGuidance && c.implementation_guidance) {
      descParts.push(`Implementation Guidance:\n${c.implementation_guidance}`);
    }
    if (includeEvidence) {
      if (c.required_screenshots) descParts.push(`Required Screenshots:\n${c.required_screenshots}`);
      if (c.required_exports) descParts.push(`Required Exports:\n${c.required_exports}`);
      if (c.required_policies) descParts.push(`Required Policies:\n${c.required_policies}`);
    }

    return [
      `${c.control_id} — ${c.control_title}`,
      issueType,
      projectKey,
      priority,
      assignee,
      STATUS_MAP[c.status] || 'To Do',
      [c.level, c.control_family].filter(Boolean).map(l => l.replace(/\s+/g, '-')).join(' '),
      descParts.join('\n\n'),
    ].map(csvCell).join(',');
  });

  return [headers.map(csvCell).join(','), ...rows].join('\n');
}

export function downloadCsv(csv, fileName) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}