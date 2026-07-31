import { validNotApplicable } from '@/lib/canonicalReadiness';

// SPRS (Supplier Performance Risk System) scoring engine.
//
// Single source of truth for control status = ControlAssessment records on the
// organization's active project. This module is PURE logic — no side effects.
//
// DoD Assessment Methodology (NIST SP 800-171 DoD Assessment Methodology v1.2.1):
//   - Perfect score = 110 (all 110 practices MET).
//   - Each NOT MET practice subtracts its point value (5, 3, or 1).
//   - Floor of the score is -203.
//   - Two practices have partial-credit rules:
//       * 3.5.3  (MFA):        full value 5. Partial credit if MFA is implemented
//                              for some but not all required access → subtract 3
//                              instead of 5.
//       * 3.13.11 (FIPS crypto): full value 3. Partial credit if FIPS-validated
//                              crypto is employed but not for all required uses
//                              → subtract 1 instead of 3.

// Official DoD point value for each NIST 800-171 practice (by short id, e.g. "3.1.1").
// Values sum to 110 across the 110 practices.
export const SPRS_POINT_VALUES = {
  '3.1.1': 5, '3.1.2': 5, '3.1.3': 1, '3.1.4': 1, '3.1.5': 3, '3.1.6': 1, '3.1.7': 1,
  '3.1.8': 1, '3.1.9': 1, '3.1.10': 1, '3.1.11': 1, '3.1.12': 5, '3.1.13': 5, '3.1.14': 1,
  '3.1.15': 1, '3.1.16': 5, '3.1.17': 5, '3.1.18': 5, '3.1.19': 3, '3.1.20': 1, '3.1.21': 1,
  '3.1.22': 1,
  '3.2.1': 5, '3.2.2': 5, '3.2.3': 1,
  '3.3.1': 5, '3.3.2': 3, '3.3.3': 1, '3.3.4': 1, '3.3.5': 5, '3.3.6': 1, '3.3.7': 1,
  '3.3.8': 1, '3.3.9': 1,
  '3.4.1': 5, '3.4.2': 5, '3.4.3': 1, '3.4.4': 1, '3.4.5': 5, '3.4.6': 5, '3.4.7': 5,
  '3.4.8': 5, '3.4.9': 1,
  '3.5.1': 5, '3.5.2': 5, '3.5.3': 5, '3.5.4': 1, '3.5.5': 1, '3.5.6': 1, '3.5.7': 1,
  '3.5.8': 1, '3.5.9': 1, '3.5.10': 5, '3.5.11': 1,
  '3.6.1': 5, '3.6.2': 5, '3.6.3': 1,
  '3.7.1': 3, '3.7.2': 5, '3.7.3': 1, '3.7.4': 1, '3.7.5': 5, '3.7.6': 1,
  '3.8.1': 3, '3.8.2': 3, '3.8.3': 5, '3.8.4': 1, '3.8.5': 1, '3.8.6': 1, '3.8.7': 5,
  '3.8.8': 3, '3.8.9': 1,
  '3.9.1': 3, '3.9.2': 5,
  '3.10.1': 5, '3.10.2': 5, '3.10.3': 1, '3.10.4': 1, '3.10.5': 1, '3.10.6': 1,
  '3.11.1': 3, '3.11.2': 5, '3.11.3': 1,
  '3.12.1': 5, '3.12.2': 3, '3.12.3': 5, '3.12.4': 3,
  '3.13.1': 5, '3.13.2': 5, '3.13.3': 1, '3.13.4': 1, '3.13.5': 5, '3.13.6': 5, '3.13.7': 1,
  '3.13.8': 3, '3.13.9': 1, '3.13.10': 1, '3.13.11': 5, '3.13.12': 1, '3.13.13': 1,
  '3.13.14': 1, '3.13.15': 5, '3.13.16': 1,
  '3.14.1': 5, '3.14.2': 5, '3.14.3': 5, '3.14.4': 5, '3.14.5': 5, '3.14.6': 5, '3.14.7': 3,
};

// Partial-credit practices: when partially implemented, use the reduced deduction.
const PARTIAL_CREDIT = {
  '3.5.3': 3,     // MFA partial → subtract 3 instead of 5
  '3.13.11': 3,  // non-FIPS encryption → subtract 3 instead of 5
};

export const SPRS_MAX = 110;
export const SPRS_FLOOR = -203;

// ControlAssessment statuses that receive no deduction. Under 32 CFR 170.24,
// a supported Not Applicable finding is equivalent to MET for scoring.
const MET_STATUSES = new Set(['Met']);

// Statuses that represent "in progress" — not yet MET, but moving toward it.
// Used for the projected score (assume these will complete).
const IN_PROGRESS_STATUSES = new Set([
  'Implementation Planned',
  'Implementation In Progress',
  'Implemented Pending Evidence',
  'Evidence Uploaded',
  'Evidence Needs Review',
  'Partially Implemented',
  'Needs Review',
]);

// Extract the short "3.x.y" id from a full control_id like "AC.L2-3.1.1" or "3.1.1".
export function shortId(controlId = '') {
  const m = String(controlId).match(/3\.\d{1,2}\.\d{1,2}/);
  return m ? m[0] : null;
}

export function pointValueFor(controlId) {
  const sid = shortId(controlId);
  return sid && SPRS_POINT_VALUES[sid] != null ? SPRS_POINT_VALUES[sid] : 0;
}

export function isMetStatus(status) {
  return MET_STATUSES.has(status);
}

function isMetAssessment(assessment) {
  return assessment?.finding === 'Met'
    || isMetStatus(assessment?.status)
    || validNotApplicable(assessment);
}

export function isInProgressStatus(status) {
  return IN_PROGRESS_STATUSES.has(status);
}

// Deduction for a single assessment given its status.
// Partial credit applies only when status is "Partially Implemented".
function deductionFor(sid, assessment) {
  const full = SPRS_POINT_VALUES[sid] || 0;
  if (isMetAssessment(assessment)) return 0;
  if (assessment?.status === 'Partially Implemented' && PARTIAL_CREDIT[sid] != null) {
    return PARTIAL_CREDIT[sid];
  }
  return full;
}

// assessments: array of ControlAssessment records (for the active project).
// Returns { current, projected, met, notMet, inProgress, total, deductions }.
//
// The score is computed against the full 110-practice baseline. Any of the 110
// practices without an assessment record (or with a Not Started / Not Implemented
// status) counts as NOT MET at full point value.
export function computeSprs(assessments = []) {
  // Map assessments by short id, keeping the most-advanced status if duplicated.
  const byId = {};
  for (const a of assessments) {
    const sid = shortId(a.control_id);
    if (!sid || SPRS_POINT_VALUES[sid] == null) continue;
    // Prefer a MET status over a non-met one if duplicates exist.
    if (!byId[sid] || (isMetAssessment(a) && !isMetAssessment(byId[sid]))) {
      byId[sid] = a;
    }
  }

  let currentDeduction = 0;
  let projectedDeduction = 0;
  let met = 0, notMet = 0, inProgress = 0;

  for (const sid of Object.keys(SPRS_POINT_VALUES)) {
    const a = byId[sid];
    const status = a?.status || 'Not Started';
    const d = deductionFor(sid, a);
    currentDeduction += d;

    if (isMetAssessment(a)) met += 1;
    else if (isInProgressStatus(status)) inProgress += 1;
    else notMet += 1;

    // Projected: assume in-progress controls will be MET (0 deduction).
    projectedDeduction += isInProgressStatus(status) ? 0 : d;
  }

  const current = Math.max(SPRS_FLOOR, SPRS_MAX - currentDeduction);
  const projected = Math.max(SPRS_FLOOR, SPRS_MAX - projectedDeduction);

  return {
    current,
    projected,
    met,
    notMet,
    inProgress,
    total: Object.keys(SPRS_POINT_VALUES).length,
    deductions: currentDeduction,
  };
}

// Return the highest-point NOT MET practices for the "next recommended actions"
// list. assessments = ControlAssessment records; library = optional map of
// short id → { control_id, control_title } for display.
export function nextRecommendedControls(assessments = [], limit = 5) {
  const byId = {};
  for (const a of assessments) {
    const sid = shortId(a.control_id);
    if (sid) byId[sid] = a;
  }
  const notMet = [];
  for (const sid of Object.keys(SPRS_POINT_VALUES)) {
    const a = byId[sid];
    const status = a?.status || 'Not Started';
    if (!isMetAssessment(a)) {
      notMet.push({
        short_id: sid,
        control_id: a?.control_id || sid,
        control_title: a?.control_title || '',
        status,
        points: SPRS_POINT_VALUES[sid],
        assessment: a || null,
      });
    }
  }
  notMet.sort((x, y) => y.points - x.points || x.short_id.localeCompare(y.short_id));
  return notMet.slice(0, limit);
}