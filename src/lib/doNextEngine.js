// Item 4 — Do-Next engine. Pure logic.
// Builds the prioritized guided queue: incomplete controls within the user's
// target level, ordered by SPRS point value descending, tie-broken by control
// family order (AC, AT, AU, CM, IA, IR, MA, MP, PS, PE, RA, CA, SC, SI).

import { pointValueFor, isMetStatus } from '@/lib/sprsScoring';

const FAMILY_ORDER = ['AC', 'AT', 'AU', 'CM', 'IA', 'IR', 'MA', 'MP', 'PS', 'PE', 'RA', 'CA', 'SC', 'SI'];

export function familyOf(controlId = '') {
  const m = String(controlId).match(/^([A-Z]{2})\./);
  return m ? m[1] : 'ZZ';
}

function familyRank(controlId) {
  const idx = FAMILY_ORDER.indexOf(familyOf(controlId));
  return idx === -1 ? 999 : idx;
}

// Rough time estimate badge from SPRS points (adjustable per ControlLibrary.estimated_minutes).
export function estimatedMinutes(libEntry, controlId) {
  if (libEntry?.estimated_minutes) return libEntry.estimated_minutes;
  const pts = pointValueFor(controlId);
  return pts >= 5 ? 30 : pts === 3 ? 20 : 15;
}

// Which library levels are in scope for the project's target level.
export function targetLevelsFor(project) {
  if (project?.target_cmmc_level === 'Level 2') return ['Level 1', 'Level 2'];
  if (project?.target_cmmc_level === 'Level 3') return ['Level 1', 'Level 2', 'Level 3'];
  return ['Level 1'];
}

// Build the full prioritized queue.
// library: ControlLibrary records (in-scope levels). assessments: ControlAssessment records.
// Returns array of { control_id, control_title, domain, points, minutes, status, libEntry, assessment }.
export function buildGuidedQueue(library, assessments, project) {
  const levels = targetLevelsFor(project);
  const asmtByControl = {};
  for (const a of assessments) asmtByControl[a.control_id] = a;

  const inScope = library.filter((c) => levels.includes(c.cmmc_level));

  const items = inScope.map((c) => {
    const a = asmtByControl[c.control_id];
    return {
      control_id: c.control_id,
      control_title: c.control_title,
      domain: c.domain,
      points: pointValueFor(c.control_id),
      minutes: estimatedMinutes(c, c.control_id),
      status: a?.status || 'Not Started',
      libEntry: c,
      assessment: a || null,
    };
  });

  items.sort((x, y) => (y.points - x.points) || (familyRank(x.control_id) - familyRank(y.control_id)) || x.control_id.localeCompare(y.control_id));
  return items;
}

// The single highest-priority incomplete control (for the "Continue implementation" hero button).
export function nextIncomplete(library, assessments, project) {
  const queue = buildGuidedQueue(library, assessments, project);
  return queue.find((it) => !isMetStatus(it.status)) || null;
}

// Progress counts for the hero strip: "X of Y controls done".
export function queueCounts(library, assessments, project) {
  const queue = buildGuidedQueue(library, assessments, project);
  const done = queue.filter((it) => isMetStatus(it.status)).length;
  return { done, total: queue.length };
}