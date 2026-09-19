import { base44 } from '@/api/base44Client';
import { CANONICAL_DATASET_KEY } from '@/lib/doNextEngine';

// Seed the canonical ControlAssessment rows for a brand-new project from the
// authoritative ControlLibrary, so the Control Implementation integrity check
// passes (every requirement tracked, none missing). This mirrors the
// per-project seeding the one-time canonical project-model migration did for
// the original projects — new projects created after that migration otherwise
// start with 0 assessment rows and fail the integrity gate.
//
// Re-runs add only missing requirements; existing progress is never overwritten.
// Critical reads fail closed. Returns { ok, seeded, reason }.
export async function seedProjectAssessments(project, targetLevel) {
  const projectId = project?.id;
  const level = targetLevel || project?.target_cmmc_level;
  if (!projectId || !project.organization_id) return { ok: false, seeded: 0, reason: 'Project or organization id missing.' };
  if (targetLevel && targetLevel !== project.target_cmmc_level) return { ok: false, seeded: 0, reason: 'Target level does not match the project.' };
  if (level !== 'Level 1' && level !== 'Level 2') {
    return { ok: false, seeded: 0, reason: `Unsupported target level "${level || 'Unknown'}".` };
  }
  try {
    const [library, existing] = await Promise.all([
      base44.entities.ControlLibrary.filter({
        active: true,
        authoritative: true,
        dataset_key: CANONICAL_DATASET_KEY,
        cmmc_level: level,
      }, 'control_id', 500),
      base44.entities.ControlAssessment.filter({ project_id: projectId }, 'control_id', 500),
    ]);
    const expected = level === 'Level 1' ? 15 : 110;
    const libraryIds = new Set(library.map(c => c.control_id));
    if (library.length !== expected || libraryIds.size !== expected || libraryIds.has('') || libraryIds.has(null) || libraryIds.has(undefined)) throw new Error(`Expected ${expected} unique authoritative requirements; found ${library.length}.`);
    const existingIds = new Set(existing.map(a => a.control_id));
    if (existingIds.size !== existing.length || existing.some(a => !libraryIds.has(a.control_id) || a.organization_id !== project.organization_id || a.cmmc_level !== level)) throw new Error('Existing assessment records need review; no records were changed.');
    const rows = library.filter(c => !existingIds.has(c.control_id)).map((c) => ({
      organization_id: project.organization_id || '',
      project_id: projectId,
      control_id: c.control_id,
      control_title: c.control_title || c.control_id,
      domain: c.domain || '',
      cmmc_level: c.cmmc_level,
      status: 'Not Started',
      evidence_status: 'No Evidence',
      risk_rating: 'Moderate',
    }));
    if (rows.length) await base44.entities.ControlAssessment.bulkCreate(rows);
    const saved = await base44.entities.ControlAssessment.filter({ project_id: projectId }, 'control_id', 500);
    if (saved.length !== expected || new Set(saved.map(a => a.control_id)).size !== expected || saved.some(a => !libraryIds.has(a.control_id) || a.organization_id !== project.organization_id || a.cmmc_level !== level)) throw new Error('Assessment initialization is incomplete; retry to add only missing requirements.');
    return { ok: true, seeded: rows.length, reason: '' };
  } catch (e) {
    return { ok: false, seeded: 0, reason: e?.message || 'unknown error' };
  }
}