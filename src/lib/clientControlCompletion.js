import { base44 } from '@/api/base44Client';
import { resolveProjectIdForClient } from '@/lib/clientProject';
import { loadProgressMap } from '@/lib/controlProgress';

// ControlAssessment statuses that count a control as "done" (Level 1 flow — the
// control pages write these). Mirrors the done-status list used on the dashboards.
const ASSESSMENT_DONE = ['Ready for Assessment', 'Ready for Documentation', 'Implemented', 'Evidence Accepted'];

// Assessment / progress statuses that mean work has started but the control is
// not yet done. Used so overview cards can distinguish "In Progress" from a
// truly untouched "Not Started".
const ASSESSMENT_STARTED = [
  'Implementation Planned', 'Implementation In Progress', 'Implemented Pending Evidence',
  'Evidence Uploaded', 'Evidence Needs Review', 'Needs Review', 'Partially Implemented',
  'Gap Identified', 'POA&M Linked',
];

// Build a set of completed control_ids for a client by merging BOTH sources of
// truth: ControlAssessment (Level 1 control pages) and the legacy ControlProgress
// (still written by the Level 2 board). A control counts as complete if either
// source marks it Complete / ready.
//
// Returns a Set of control_id strings.
export async function loadCompletedControlIds(clientId) {
  if (!clientId) return new Set();

  const projectId = await resolveProjectIdForClient(clientId);
  const [assessments, progressMap] = await Promise.all([
    projectId ? base44.entities.ControlAssessment.filter({ project_id: projectId }).catch(() => []) : Promise.resolve([]),
    loadProgressMap(clientId),
  ]);

  const done = new Set();
  assessments.forEach((a) => {
    if (a.control_id && ASSESSMENT_DONE.includes(a.status)) done.add(a.control_id);
  });
  Object.values(progressMap).forEach((p) => {
    if (p.control_id && (p.status === 'Complete' || p.ready_for_assessment)) done.add(p.control_id);
  });
  return done;
}

// Returns { done: Set, started: Set } — controls that are complete, and controls
// that have work in progress (not done). A control in `done` is never also in
// `started`. Lets overview cards show "In Progress" instead of a misleading
// "Not Started" for clients mid-implementation.
export async function loadControlProgressSets(clientId) {
  if (!clientId) return { done: new Set(), started: new Set() };

  const projectId = await resolveProjectIdForClient(clientId);
  const [assessments, progressMap] = await Promise.all([
    projectId ? base44.entities.ControlAssessment.filter({ project_id: projectId }).catch(() => []) : Promise.resolve([]),
    loadProgressMap(clientId),
  ]);

  const done = new Set();
  const started = new Set();
  assessments.forEach((a) => {
    if (!a.control_id) return;
    if (ASSESSMENT_DONE.includes(a.status)) done.add(a.control_id);
    else if (ASSESSMENT_STARTED.includes(a.status)) started.add(a.control_id);
  });
  Object.values(progressMap).forEach((p) => {
    if (!p.control_id) return;
    if (p.status === 'Complete' || p.ready_for_assessment) done.add(p.control_id);
    else if (p.status && p.status !== 'Not Started') started.add(p.control_id);
  });
  // A done control should not also be counted as merely started.
  done.forEach((id) => started.delete(id));
  return { done, started };
}