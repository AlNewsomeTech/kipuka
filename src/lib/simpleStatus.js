// Item 3 — Simple 4-status layer for client/guided views.
// The full 13-status ControlAssessment taxonomy stays untouched underneath;
// this only MAPS it to four buckets for display and writes back real statuses.

import { isMetStatus, isInProgressStatus } from '@/lib/sprsScoring';
import { isImplementedStatus, validNotApplicable } from '@/lib/canonicalReadiness';

// The four client-facing buckets.
export const SIMPLE_STATUS = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  DONE: 'Done',
  STUCK: 'Stuck',
};

// Map any of the 13 real statuses to one of the four simple buckets.
export function toSimpleStatus(value) {
  const assessment = value && typeof value === 'object' ? value : null;
  const realStatus = assessment?.status || value;
  if (!realStatus || realStatus === 'Not Started' || realStatus === 'Not Implemented') {
    return SIMPLE_STATUS.NOT_STARTED;
  }
  if (realStatus === 'Gap Identified' || realStatus === 'POA&M Linked') {
    return SIMPLE_STATUS.STUCK;
  }
  // N/A is Done only when the complete, independently approved decision is
  // present on the assessment. A status string alone can never prove approval.
  if (realStatus === 'Not Applicable') {
    return assessment && validNotApplicable(assessment)
      ? SIMPLE_STATUS.DONE
      : SIMPLE_STATUS.IN_PROGRESS;
  }
  // Done = the control's implementation workflow is complete (implemented /
  // evidence uploaded / verified). This is progress display only — it never
  // feeds SPRS scoring or assessment MET findings.
  if (isMetStatus(realStatus) || isImplementedStatus(realStatus)) return SIMPLE_STATUS.DONE;
  if (isInProgressStatus(realStatus)) return SIMPLE_STATUS.IN_PROGRESS;
  return SIMPLE_STATUS.IN_PROGRESS;
}

// Visual tone for each simple bucket.
export const SIMPLE_STATUS_TONE = {
  'Not Started': { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  'In Progress': { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  'Done': { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  'Stuck': { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
};

// The real status the VERIFY step writes when a user completes guided implementation.
// This is progress only. Canonical readiness still requires objective findings and accepted evidence.
export const GUIDED_DONE_STATUS = 'Ready for Documentation';

// The real status the "I'm stuck" action sets.
export const GUIDED_STUCK_STATUS = 'Gap Identified';

// Is this control considered done (for do-next queue filtering)?
export function isSimpleDone(value) {
  return toSimpleStatus(value) === SIMPLE_STATUS.DONE;
}