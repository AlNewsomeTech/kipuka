// Shared control-status helpers. Single source of truth = ControlAssessment
// records on a project. Pure logic, no side effects.
import { isMetStatus, isInProgressStatus } from '@/lib/sprsScoring';

// The 14 NIST 800-171 / CMMC control families with their two-letter codes.
export const CONTROL_FAMILIES = [
  { code: 'AC', name: 'Access Control' },
  { code: 'AT', name: 'Awareness & Training' },
  { code: 'AU', name: 'Audit & Accountability' },
  { code: 'CM', name: 'Configuration Management' },
  { code: 'IA', name: 'Identification & Authentication' },
  { code: 'IR', name: 'Incident Response' },
  { code: 'MA', name: 'Maintenance' },
  { code: 'MP', name: 'Media Protection' },
  { code: 'PS', name: 'Personnel Security' },
  { code: 'PE', name: 'Physical Protection' },
  { code: 'RA', name: 'Risk Assessment' },
  { code: 'CA', name: 'Security Assessment' },
  { code: 'SC', name: 'System & Communications Protection' },
  { code: 'SI', name: 'System & Information Integrity' },
];

// Normalize any ControlAssessment status into one of four buckets for the donut.
// verified = met + evidence accepted, implemented = implemented pending evidence,
// in_progress = planned/in progress, not_started = everything else.
export function statusBucket(status) {
  if (status === 'Evidence Accepted' || status === 'Ready for Documentation' || status === 'Ready for Assessment' || status === 'Not Applicable') return 'verified';
  if (status === 'Implemented' || status === 'Implemented Pending Evidence' || status === 'Evidence Uploaded' || status === 'Evidence Needs Review') return 'implemented';
  if (isInProgressStatus(status)) return 'in_progress';
  return 'not_started';
}

export const BUCKET_META = {
  verified: { label: 'Verified', color: '#16a34a' },
  implemented: { label: 'Implemented', color: '#2563eb' },
  in_progress: { label: 'In Progress', color: '#d97706' },
  not_started: { label: 'Not Started', color: '#94a3b8' },
};

// Extract the family code from a control_id like "AC.L2-3.1.1".
export function familyCode(controlId = '') {
  const m = String(controlId).match(/^([A-Z]{2})\./);
  return m ? m[1] : '';
}

// Given assessments, return donut buckets counts.
export function bucketCounts(assessments = []) {
  const counts = { verified: 0, implemented: 0, in_progress: 0, not_started: 0 };
  for (const a of assessments) counts[statusBucket(a.status)] += 1;
  return counts;
}

// Given assessments, return per-family { code, name, total, met } for the bars.
export function familyProgress(assessments = []) {
  const map = {};
  for (const f of CONTROL_FAMILIES) map[f.code] = { ...f, total: 0, met: 0 };
  for (const a of assessments) {
    const code = familyCode(a.control_id);
    if (!map[code]) continue;
    map[code].total += 1;
    if (isMetStatus(a.status)) map[code].met += 1;
  }
  return CONTROL_FAMILIES.map((f) => map[f.code]).filter((f) => f.total > 0);
}

// Overall readiness percentage = MET / total assessments.
export function readinessPct(assessments = []) {
  if (!assessments.length) return 0;
  const met = assessments.filter((a) => isMetStatus(a.status)).length;
  return Math.round((met / assessments.length) * 100);
}