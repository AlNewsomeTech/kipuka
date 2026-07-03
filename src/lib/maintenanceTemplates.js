// Template task sets for the CMMC maintenance module. User-triggered creation only.
function due(daysFromNow) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}

export const MAINTENANCE_CATEGORIES = [
  'Monthly Review', 'Quarterly Review', 'Annual Review', 'Evidence Refresh',
  'SSP Review', 'POA&M Review', 'Policy Review', 'SPRS Affirmation',
  'User Access Review', 'Vulnerability Review', 'Incident Response Review',
];

export const MAINTENANCE_STATUSES = ['Not Started', 'In Progress', 'Complete', 'Overdue', 'Deferred'];

// Each template set returns an array of task drafts (no project/org ids yet).
export const TEMPLATE_SETS = {
  monthly: {
    label: 'Monthly Task Set',
    tasks: [
      { task_title: 'Review user access and disable inactive accounts', task_category: 'User Access Review', due_date: due(30) },
      { task_title: 'Verify endpoint protection and patch status', task_category: 'Vulnerability Review', due_date: due(30) },
      { task_title: 'Refresh time-sensitive evidence (logs, configs)', task_category: 'Evidence Refresh', due_date: due(30) },
      { task_title: 'Review audit logs for anomalies', task_category: 'Monthly Review', due_date: due(30) },
    ],
  },
  quarterly: {
    label: 'Quarterly Task Set',
    tasks: [
      { task_title: 'Review and update POA&M items', task_category: 'POA&M Review', due_date: due(90) },
      { task_title: 'Validate SSP still reflects the environment', task_category: 'SSP Review', due_date: due(90) },
      { task_title: 'Run vulnerability scan and review findings', task_category: 'Vulnerability Review', due_date: due(90) },
      { task_title: 'Test incident response procedures', task_category: 'Incident Response Review', due_date: due(90) },
    ],
  },
  annual: {
    label: 'Annual Task Set',
    tasks: [
      { task_title: 'Full policy review and re-approval', task_category: 'Policy Review', due_date: due(365) },
      { task_title: 'Complete SPRS affirmation renewal', task_category: 'SPRS Affirmation', due_date: due(365) },
      { task_title: 'Comprehensive control re-assessment', task_category: 'Annual Review', due_date: due(365) },
      { task_title: 'Refresh all standing evidence', task_category: 'Evidence Refresh', due_date: due(365) },
      { task_title: 'Annual security awareness training review', task_category: 'Annual Review', due_date: due(365) },
    ],
  },
};

export function isMaintenanceOverdue(t) {
  if (!t.due_date || ['Complete', 'Deferred'].includes(t.status)) return false;
  return new Date(t.due_date) < new Date(new Date().toDateString());
}