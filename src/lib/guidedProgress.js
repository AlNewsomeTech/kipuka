// Load/save per-user guided walkthrough progress (resume support). Item 2.
import { base44 } from '@/api/base44Client';

export async function loadGuidedProgress(projectId, controlId) {
  const rows = await base44.entities.GuidedProgress
    .filter({ project_id: projectId, control_id: controlId }, '-updated_date', 1)
    .catch(() => []);
  return rows[0] || null;
}

export async function saveGuidedProgress(existing, { projectId, organizationId, controlId, patch }) {
  if (existing?.id) {
    return base44.entities.GuidedProgress.update(existing.id, patch);
  }
  return base44.entities.GuidedProgress.create({
    organization_id: organizationId,
    project_id: projectId,
    control_id: controlId,
    current_step: 1,
    completed_steps: [],
    verify_checks: {},
    ...patch,
  });
}