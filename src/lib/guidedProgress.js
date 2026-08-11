// Load/save per-user guided walkthrough progress (resume support). Item 2.
import { base44 } from '@/api/base44Client';

export async function loadGuidedProgress(projectId, controlId) {
  const rows = await base44.entities.GuidedProgress
    .filter({ project_id: projectId, control_id: controlId }, '-updated_date', 1)
    .catch(() => []);
  return rows[0] || null;
}

const saveQueues = new Map();

export async function saveGuidedProgress(existing, { projectId, organizationId, controlId, patch }) {
  const key = `${projectId}:${controlId}`;
  const previous = saveQueues.get(key) || Promise.resolve();
  const queued = previous.catch(() => {}).then(async () => {
    // A stale tab may not know another session already created progress. Resolve
    // the latest row again before creating, and serialize rapid local saves.
    const current = existing?.id ? existing : await loadGuidedProgress(projectId, controlId);
    if (current?.id) {
      return base44.entities.GuidedProgress.update(current.id, patch);
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
  });
  saveQueues.set(key, queued);
  try {
    return await queued;
  } finally {
    if (saveQueues.get(key) === queued) saveQueues.delete(key);
  }
}