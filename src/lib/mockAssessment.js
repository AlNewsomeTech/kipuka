// Mock assessment helpers: build the objective worklist for a project and
// compute session stats. Uses the existing NIST 800-171A objective map.
import { objectivesForControl, normalizeRequirementNumber } from '@/lib/assessmentObjectives';

// Build a flat objective worklist from the project's tracked control assessments.
// Each entry carries the control context so the UI can group and record verdicts.
export function buildObjectiveWorklist(assessments) {
  const list = [];
  (assessments || []).forEach((a) => {
    const objs = objectivesForControl(a.control_id, a.control_title);
    objs.forEach((o) => {
      list.push({
        control_id: a.control_id,
        control_title: a.control_title || '',
        domain: a.domain || 'Other',
        cmmc_level: a.cmmc_level || 'Level 1',
        objective_id: o.id,
        objective_text: o.text,
        evidence_types: o.evidence || [],
        ssp_statement: a.ssp_statement || '',
      });
    });
  });
  return list;
}

// Evidence linked to a control (by control_ids array on ProjectEvidence).
export function evidenceForControl(evidence, controlId) {
  const num = normalizeRequirementNumber(controlId);
  return (evidence || []).filter((e) =>
    (e.control_ids || []).some((c) => c === controlId || normalizeRequirementNumber(c) === num)
  );
}

// Compute session roll-up stats from recorded objective verdicts.
export function computeSessionStats(objectives) {
  const total = objectives.length;
  const met = objectives.filter((o) => o.verdict === 'Met').length;
  const notMet = objectives.filter((o) => o.verdict === 'Not Met').length;
  const na = objectives.filter((o) => o.verdict === 'Not Applicable').length;
  const assessed = met + notMet + na;
  const completion_pct = total ? Math.round((assessed / total) * 100) : 0;

  let overall_verdict = 'Not Determined';
  if (assessed > 0) {
    if (notMet === 0 && completion_pct === 100) overall_verdict = 'Likely Pass';
    else if (notMet === 0) overall_verdict = 'Conditional';
    else overall_verdict = 'Not Ready';
  }

  return {
    objectives_total: total,
    objectives_met: met,
    objectives_not_met: notMet,
    objectives_na: na,
    completion_pct,
    overall_verdict,
    status: completion_pct === 100 ? 'Complete' : 'In Progress',
  };
}

// Group failed objectives by control for the report + remediation hints.
export function failedByControl(objectives) {
  const map = {};
  objectives.filter((o) => o.verdict === 'Not Met').forEach((o) => {
    (map[o.control_id] ||= { control_id: o.control_id, control_title: o.control_title, domain: o.domain, objectives: [] })
      .objectives.push(o);
  });
  return Object.values(map).sort((a, b) => a.control_id.localeCompare(b.control_id));
}

export const VERDICTS = ['Met', 'Not Met', 'Not Applicable'];
export const OVERALL_STYLE = {
  'Likely Pass': 'bg-green-50 text-green-700 border-green-200',
  'Conditional': 'bg-amber-50 text-amber-700 border-amber-200',
  'Not Ready': 'bg-red-50 text-red-700 border-red-200',
  'Not Determined': 'bg-slate-100 text-slate-600 border-slate-200',
};