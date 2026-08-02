import { base44 } from '@/api/base44Client';
import { resolveProjectIdForClient } from '@/lib/clientProject';
import { isMetStatus, isInProgressStatus } from '@/lib/sprsScoring';
import { isImplementationComplete } from '@/lib/canonicalReadiness';

// Canonical client progress.
//
// Project is the assessment boundary and the only target-level authority.
// ControlAssessment is the only progress source. Nothing here reads the retired
// CMMCControl / legacy progress models, and nothing here writes any record.
//
// Authoritative requirement counts:
//   CMMC Level 1 = 15 requirements (FAR 52.204-21)
//   CMMC Level 2 = 110 requirements (NIST SP 800-171 Rev. 2)
// Level 2 is NOT Level 1 + Level 2 and must never be presented as 125.
export const LEVEL_1_REQUIREMENT_TOTAL = 15;
export const LEVEL_2_REQUIREMENT_TOTAL = 110;

// Only these two exact target levels have an authoritative denominator.
export function expectedTotalForLevel(targetLevel) {
  if (targetLevel === 'Level 1') return LEVEL_1_REQUIREMENT_TOTAL;
  if (targetLevel === 'Level 2') return LEVEL_2_REQUIREMENT_TOTAL;
  return null;
}

// A failed or structurally invalid read must never look like valid zero progress:
// integrityOk stays false and expectedTotal stays null so callers cannot render a
// percentage or claim "Not Started".
function unavailable(extra = {}) {
  return {
    projectId: null,
    project: null,
    assessments: [],
    done: new Set(),
    started: new Set(),
    expectedTotal: null,
    actualUniqueTotal: 0,
    integrityOk: false,
    integrityIssues: [],
    error: null,
    ...extra,
  };
}

// Resolve the client's Project, read only that project's ControlAssessment rows,
// and return a stable, validated progress object.
export async function loadCanonicalClientProgress(clientId) {
  if (!clientId) return unavailable({ error: 'No client selected.' });

  let projectId = null;
  try {
    projectId = await resolveProjectIdForClient(clientId);
  } catch (err) {
    return unavailable({ error: `The linked project could not be resolved: ${err?.message || 'read failed'}` });
  }
  if (!projectId) {
    return unavailable({ error: 'No project is linked to this client.' });
  }

  let project = null;
  try {
    const projects = await base44.entities.Project.filter({ id: projectId });
    project = projects[0] || null;
  } catch (err) {
    return unavailable({ projectId, error: `The linked project could not be read: ${err?.message || 'read failed'}` });
  }
  if (!project) {
    return unavailable({ projectId, error: 'The linked project could not be read.' });
  }

  let assessments = [];
  try {
    assessments = await base44.entities.ControlAssessment.filter({ project_id: projectId }, 'control_id', 500);
  } catch (err) {
    return unavailable({ projectId, project, error: `Control assessments could not be read: ${err?.message || 'read failed'}` });
  }

  const expectedTotal = expectedTotalForLevel(project.target_cmmc_level);
  const ids = assessments.map((a) => String(a.control_id || '').trim());
  const nonBlankIds = ids.filter(Boolean);
  const uniqueIds = new Set(nonBlankIds);
  const actualUniqueTotal = uniqueIds.size;

  const integrityIssues = [];
  if (!expectedTotal) {
    integrityIssues.push(`Project target level "${project.target_cmmc_level || 'Unknown'}" is not an authoritative CMMC level.`);
  }
  if (nonBlankIds.length !== ids.length) {
    integrityIssues.push(`${ids.length - nonBlankIds.length} control record(s) have a blank control ID.`);
  }
  if (actualUniqueTotal !== nonBlankIds.length) {
    integrityIssues.push('Duplicate control IDs exist in this project.');
  }
  if (expectedTotal && assessments.length !== expectedTotal) {
    integrityIssues.push(`Expected ${expectedTotal} control records, found ${assessments.length}.`);
  }
  if (expectedTotal && actualUniqueTotal !== expectedTotal) {
    integrityIssues.push(`Expected ${expectedTotal} unique control IDs, found ${actualUniqueTotal}.`);
  }
  if (assessments.some((a) => a.project_id !== projectId)) {
    integrityIssues.push('Some control records belong to a different project.');
  }

  const integrityOk = integrityIssues.length === 0;

  // Status vocabulary comes from the SPRS engine — never duplicated here.
  const done = new Set();
  const started = new Set();
  assessments.forEach((a) => {
    const id = String(a.control_id || '').trim();
    if (!id) return;
    if (isMetStatus(a.status) || isImplementationComplete(a)) done.add(id);
    else if (isInProgressStatus(a.status)) started.add(id);
  });
  done.forEach((id) => started.delete(id));

  return {
    projectId,
    project,
    assessments,
    done,
    started,
    expectedTotal,
    actualUniqueTotal,
    integrityOk,
    integrityIssues,
    error: null,
  };
}

// Compatibility export — canonical-only. Returns a Set of completed control IDs.
export async function loadCompletedControlIds(clientId) {
  const result = await loadCanonicalClientProgress(clientId);
  return result.done;
}

// Compatibility export — canonical-only. Returns { done: Set, started: Set }.
export async function loadControlProgressSets(clientId) {
  const result = await loadCanonicalClientProgress(clientId);
  return { done: result.done, started: result.started };
}