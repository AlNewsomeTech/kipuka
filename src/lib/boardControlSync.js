import { base44 } from '@/api/base44Client';
import { resolveProjectIdForClient } from '@/lib/clientProject';

// Maps a DeploymentTask board status onto a ControlAssessment status.
// null = don't change the control (e.g. Not Started shouldn't wipe existing work).
const TASK_TO_CONTROL_STATUS = {
  'Complete': 'Ready for Assessment',
  'Reviewed': 'Ready for Assessment',
  'Ready for Review': 'Implemented Pending Evidence',
  'Evidence Needed': 'Implemented Pending Evidence',
  'In Progress': 'Implementation In Progress',
  'Blocker': 'Gap Identified',
  'Not Started': null,
};

// When a board card with a related_control changes status (or is saved), push that
// status into the matching ControlAssessment so the dashboard/controls views agree.
// Board is the source of truth for that control's implementation state.
export async function syncTaskStatusToControl(task, status) {
  const controlId = task?.related_control;
  if (!controlId) return;

  const targetStatus = TASK_TO_CONTROL_STATUS[status];
  if (!targetStatus) return;

  const projectId = await resolveProjectIdForClient(task.client_id);
  if (!projectId) return;

  const existing = await base44.entities.ControlAssessment
    .filter({ project_id: projectId, control_id: controlId })
    .catch(() => []);

  const payload = {
    status: targetStatus,
    last_reviewed_date: new Date().toISOString().split('T')[0],
  };

  if (existing.length > 0) {
    await base44.entities.ControlAssessment.update(existing[0].id, payload).catch(() => {});
  } else {
    await base44.entities.ControlAssessment.create({
      project_id: projectId,
      control_id: controlId,
      ...payload,
    }).catch(() => {});
  }
}