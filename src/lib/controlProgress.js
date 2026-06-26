import { base44 } from '@/api/base44Client';

// Per-client control progress fields that must NOT be read/written on the global
// CMMCControl definition (which is shared across all clients). These live on the
// ControlProgress entity keyed by client_id + control_id.
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

// Load all progress rows for a client and return a map keyed by control_id.
export async function loadProgressMap(clientId) {
  if (!clientId) return {};
  const rows = await base44.entities.ControlProgress.filter({ client_id: clientId }).catch(() => []);
  const map = {};
  rows.forEach(r => { map[r.control_id] = r; });
  return map;
}

// Merge a global control definition with this client's progress (or defaults).
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
    _progressId: progressRow?.id || null,
  };
}

// Upsert progress for a client+control. Returns the saved row.
export async function saveProgress(clientId, controlId, level, data) {
  const existing = await base44.entities.ControlProgress.filter({ client_id: clientId, control_id: controlId }).catch(() => []);
  const payload = PROGRESS_FIELDS.reduce((acc, f) => {
    if (data[f] !== undefined) acc[f] = data[f];
    return acc;
  }, {});
  if (existing.length > 0) {
    return base44.entities.ControlProgress.update(existing[0].id, payload);
  }
  return base44.entities.ControlProgress.create({ client_id: clientId, control_id: controlId, level: level || 'Level 1', ...payload });
}