// ACOLYTE module shared configuration: brand strings, enums, and badge styling.
// ACOLYTE is Pacific Global Security Group's managed cyber readiness and
// security operations support service, integrated inside Kipuka.

export const ACOLYTE_BRAND = {
  name: 'ACOLYTE',
  full: 'ACOLYTE Operations',
  company: 'Pacific Global Security Group',
  short: 'Pac-Sec',
  subtitle: 'Managed cyber readiness and security operations support by Pacific Global Security Group.',
  positioning:
    'Kipuka helps organizations organize and prove readiness. ACOLYTE helps them achieve and maintain readiness.',
  description:
    'ACOLYTE is Pac-Sec\u2019s managed cyber readiness and security operations support service for organizations that need disciplined cybersecurity oversight without building a full internal security department. ACOLYTE provides continuous posture review, vulnerability tracking, remediation coordination, incident response preparation, executive cyber reporting, and compliance-aligned operational support.',
  preparedBy: 'Prepared by Pacific Global Security Group',
  reportDisclaimer: 'Operational guidance only. Validate against applicable requirements.',
  confidential: 'CONFIDENTIAL & PROPRIETARY \u2014 Property of Pacific Global Security Group. Unauthorized distribution is prohibited.',
};

export const SERVICE_TIERS = ['ACOLYTE Watch', 'ACOLYTE Ready', 'ACOLYTE Shield', 'ACOLYTE CMMC', 'ACOLYTE CMMC Premium'];
export const SERVICE_STATUSES = ['Not Started', 'Active', 'Paused', 'Suspended', 'Complete'];
export const REVIEW_CADENCES = ['Monthly', 'Quarterly', 'Semiannual', 'Annual', 'On Demand'];
export const POSTURE_STATUSES = ['Good', 'Needs Attention', 'High Risk', 'Unknown'];
export const REVIEW_TYPES = ['Monthly Review', 'Quarterly Review', 'Annual Review', 'On Demand Review'];
export const REVIEW_STATUSES = ['Draft', 'In Review', 'Delivered', 'Archived'];
export const FINDING_CATEGORIES = ['Endpoint Security', 'Cloud Security', 'Identity and Access', 'Vulnerability', 'Logging and Monitoring', 'Incident Response', 'Backup and Recovery', 'User Awareness', 'Compliance Alignment', 'Other'];
export const SEVERITIES = ['Informational', 'Low', 'Moderate', 'High', 'Critical'];
export const FINDING_STATUSES = ['Open', 'In Progress', 'Pending Validation', 'Accepted Risk', 'Closed'];
export const REMEDIATION_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
export const REMEDIATION_STATUSES = ['Not Started', 'In Progress', 'Blocked', 'Pending Validation', 'Complete', 'Deferred'];
export const REPORT_STATUSES = ['Draft', 'Generated', 'Delivered', 'Archived'];

export const POSTURE_CARDS = [
  { key: 'endpoint_posture_status', label: 'Endpoint Posture', blurb: 'Patch, configuration, and protection state of managed endpoints.' },
  { key: 'cloud_posture_status', label: 'Cloud Posture', blurb: 'Configuration and hardening of cloud tenants and services.' },
  { key: 'identity_access_status', label: 'Identity and Access', blurb: 'Privileged access, MFA, and account governance.' },
  { key: 'vulnerability_status', label: 'Vulnerability Tracking', blurb: 'Known vulnerabilities and remediation coverage.' },
  { key: 'incident_readiness_status', label: 'Incident Readiness', blurb: 'Plan, contacts, escalation, and tabletop preparedness.' },
  { key: 'compliance_alignment_status', label: 'Compliance Alignment', blurb: 'Alignment with CMMC and contractual requirements.' },
];

// ---- Badge styling ----
const POSTURE_STYLES = {
  'Good': 'bg-green-50 text-green-700 border-green-200',
  'Needs Attention': 'bg-amber-50 text-amber-700 border-amber-200',
  'High Risk': 'bg-red-50 text-red-700 border-red-200',
  'Unknown': 'bg-slate-100 text-slate-600 border-slate-200',
};

const SEVERITY_STYLES = {
  'Critical': 'bg-red-50 text-red-700 border-red-200',
  'High': 'bg-orange-50 text-orange-600 border-orange-200',
  'Moderate': 'bg-amber-50 text-amber-700 border-amber-200',
  'Low': 'bg-blue-50 text-blue-700 border-blue-200',
  'Informational': 'bg-slate-100 text-slate-600 border-slate-200',
};

const PRIORITY_STYLES = {
  'Urgent': 'bg-red-50 text-red-700 border-red-200',
  'High': 'bg-orange-50 text-orange-600 border-orange-200',
  'Medium': 'bg-amber-50 text-amber-700 border-amber-200',
  'Low': 'bg-slate-100 text-slate-600 border-slate-200',
};

export function postureStyle(status) {
  return POSTURE_STYLES[status] || POSTURE_STYLES['Unknown'];
}
export function severityStyle(sev) {
  return SEVERITY_STYLES[sev] || SEVERITY_STYLES['Informational'];
}
export function priorityStyle(p) {
  return PRIORITY_STYLES[p] || PRIORITY_STYLES['Low'];
}

// Overall status derived from a readiness score.
export function overallStatusFromScore(score) {
  const s = Number(score) || 0;
  if (s >= 85) return 'Good';
  if (s >= 60) return 'Needs Attention';
  return 'High Risk';
}

export const OPEN_FINDING_STATUSES = ['Open', 'In Progress', 'Pending Validation'];
export const OPEN_REMEDIATION_STATUSES = ['Not Started', 'In Progress', 'Blocked', 'Pending Validation', 'Deferred'];

export function isRemediationOverdue(item) {
  if (!item?.due_date || ['Complete', 'Deferred'].includes(item.status)) return false;
  return new Date(item.due_date) < new Date(new Date().toDateString());
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}
export function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}