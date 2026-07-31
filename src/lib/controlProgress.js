import { base44 } from '@/api/base44Client';
import {
  resolveProjectIdForClient,
  assessmentToConsultantStatus,
  consultantToAssessmentStatus,
} from '@/lib/clientProject';

// Compatibility adapter for the residual consultant control components.
// ControlAssessment (keyed by project_id + control_id) is the single system of
// record. This module reads and writes ONLY ControlAssessment; it never touches
// the retired ControlProgress model.
export const PROGRESS_FIELDS = [
  'status', 'assigned_owner', 'control_narrative', 'reviewer_notes',
  'ready_for_assessment', 'evidence_count', 'screenshot_count', 'export_count',
];

const DEFAULT_PROGRESS = {
  status: 'Not Started',
  assigned_owner: '',
  control_narrative: '',
  reviewer_notes: '',
  ready_for_assessment: false,
  evidence_count: 0,
  screenshot_count: 0,
  export_count: 0,
};

// Assessment statuses that mean the control is ready to be assessed.
const READY_STATUSES = [
  'Ready for Assessment',
  'Ready for Documentation',
  'Implemented',
  'Evidence Accepted',
  'Not Applicable',
];

// Project-scoped assessment row → the legacy consultant compatibility shape.
function assessmentToCompatRow(row) {
  return {
    id: row.id,
    _assessmentId: row.id,
    control_id: row.control_id,
    status: assessmentToConsultantStatus(row.status),
    assigned_owner: row.responsible_owner || '',
    control_narrative: row.implementation_summary || '',
    reviewer_notes: row.assessor_notes || '',
    ready_for_assessment: READY_STATUSES.includes(row.status),
    evidence_count: 0,
    screenshot_count: 0,
    export_count: 0,
  };
}

// Load every canonical assessment for the client's project, keyed by control_id.
export async function loadProgressMap(clientId) {
  if (!clientId) return {};
  const projectId = await resolveProjectIdForClient(clientId);
  if (!projectId) return {};
  const rows = await base44.entities.ControlAssessment.filter({ project_id: projectId });
  const map = {};
  rows.forEach((row) => { map[row.control_id] = assessmentToCompatRow(row); });
  return map;
}

// Merge a control definition with this project's assessment (or defaults).
export function mergeControl(control, progressRow) {
  return {
    ...control,
    ...DEFAULT_PROGRESS,
    ...(progressRow
      ? PROGRESS_FIELDS.reduce((acc, f) => {
          if (progressRow[f] !== undefined && progressRow[f] !== null) acc[f] = progressRow[f];
          return acc;
        }, {})
      : {}),
    // Identifier of the backing ControlAssessment row.
    _progressId: progressRow?._assessmentId || progressRow?.id || null,
  };
}

// Update the existing canonical assessment for this client's project + control.
// Never creates a row and never swallows a write failure.
export async function saveProgress(clientId, controlId, level, data) {
  const projectId = await resolveProjectIdForClient(clientId);
  if (!projectId) {
    throw new Error(`No project is linked to this client, so control ${controlId} cannot be saved.`);
  }

  const rows = await base44.entities.ControlAssessment.filter({
    project_id: projectId,
    control_id: controlId,
  });
  if (rows.length === 0) {
    throw new Error(`No assessment exists for control ${controlId} in this project.`);
  }
  if (rows.length > 1) {
    throw new Error(`Multiple assessments exist for control ${controlId} in this project.`);
  }
  const existing = rows[0];

  const payload = {};
  const wantsStatus = data.status !== undefined || data.ready_for_assessment !== undefined;
  if (wantsStatus) {
    const consultantStatus = data.status !== undefined
      ? data.status
      : assessmentToConsultantStatus(existing.status);
    payload.status = consultantToAssessmentStatus(consultantStatus, data.ready_for_assessment === true);
  }
  if (data.assigned_owner !== undefined) payload.responsible_owner = data.assigned_owner;
  if (data.control_narrative !== undefined) payload.implementation_summary = data.control_narrative;
  if (data.reviewer_notes !== undefined) payload.assessor_notes = data.reviewer_notes;
  // Legacy count fields (evidence_count, screenshot_count, export_count) are
  // intentionally ignored — they are derived elsewhere, not stored here.

  return base44.entities.ControlAssessment.update(existing.id, payload);
}