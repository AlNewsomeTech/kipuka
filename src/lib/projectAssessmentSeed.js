import { base44 } from '@/api/base44Client';
import { CANONICAL_DATASET_KEY } from '@/lib/doNextEngine';

// Seed the canonical ControlAssessment rows for a brand-new project from the
// authoritative ControlLibrary, so the Control Implementation integrity check
// passes (every requirement tracked, none missing). This mirrors the
// per-project seeding the one-time canonical project-model migration did for
// the original projects — new projects created after that migration otherwise
// start with 0 assessment rows and fail the integrity gate.
//
// Safe to re-run: skips when assessments already exist. Never throws — returns
// { ok, seeded, reason }.
export async function seedProjectAssessments(project, targetLevel) {
  const projectId = project?.id;
  const level = targetLevel || project?.target_cmmc_level;
  if (!projectId) return { ok: false, seeded: 0, reason: 'Project id missing.' };
  if (level !== 'Level 1' && level !== 'Level 2') {
    return { ok: false, seeded: 0, reason: `Unsupported target level "${level || 'Unknown'}".` };
  }
  try {
    const [library, existing] = await Promise.all([
      base44.entities.ControlLibrary.filter({
        active: true,
        authoritative: true,
        dataset_key: CANONICAL_DATASET_KEY,
      }).catch(() => []),
      base44.entities.ControlAssessment.filter({ project_id: projectId }).catch(() => []),
    ]);
    if (existing.length) return { ok: true, seeded: existing.length, reason: 'Assessments already exist.' };
    const inScope = library.filter((c) => c.cmmc_level === level);
    if (!inScope.length) return { ok: false, seeded: 0, reason: 'No authoritative library rows found.' };
    const rows = inScope.map((c) => ({
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
    await base44.entities.ControlAssessment.bulkCreate(rows);
    return { ok: true, seeded: rows.length, reason: '' };
  } catch (e) {
    return { ok: false, seeded: 0, reason: e?.message || 'unknown error' };
  }
}