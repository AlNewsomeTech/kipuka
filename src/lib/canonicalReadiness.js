// Canonical CMMC readiness engine.
//
// Regulatory basis: 32 CFR 170.24(b)-(c). A requirement is MET only when
// every applicable assessment objective is satisfied based on final evidence.
// N/A is equivalent to MET only when the scope determination is documented.
// POA&M records track remediation; they never convert NOT MET to MET.

export const CMMC_TOTALS = Object.freeze({
  'Level 1': Object.freeze({ requirements: 15, objectives: 59 }),
  'Level 2': Object.freeze({ requirements: 110, objectives: 320 }),
});

const IMPLEMENTED_STATUSES = new Set([
  'Implemented Pending Evidence',
  'Evidence Uploaded',
  'Evidence Needs Review',
  'Evidence Accepted',
  'Ready for Documentation',
  'Implemented',
  'Ready for Assessment',
]);

const CLOSED_POAM_STATUSES = new Set(['Closed']);

export function expectedCmmcTotals(targetLevel) {
  return CMMC_TOTALS[targetLevel] || null;
}

export function validNotApplicable(assessment) {
  return assessment?.status === 'Not Applicable'
    && Boolean(String(assessment.not_applicable_justification || '').trim())
    && Boolean(String(assessment.not_applicable_scope_evidence || '').trim())
    && Boolean(String(assessment.not_applicable_confirmed_by || '').trim())
    && Boolean(String(assessment.not_applicable_confirmed_date || '').trim());
}

export function validFinalEvidence(evidence, asOf = new Date()) {
  if (!evidence || evidence.review_status !== 'Accepted') return false;
  if (!String(evidence.file_url || '').trim()) return false;
  if (!String(evidence.hash_value || '').trim()) return false;
  if (evidence.expiration_date) {
    const expiry = new Date(`${evidence.expiration_date}T23:59:59.999Z`);
    if (!Number.isNaN(expiry.getTime()) && expiry.getTime() < asOf.getTime()) return false;
  }
  return true;
}

function duplicateKeys(rows, keyOf) {
  const seen = new Set();
  const duplicates = new Set();
  rows.forEach((row) => {
    const key = keyOf(row);
    if (!key) return;
    if (seen.has(key)) duplicates.add(key);
    seen.add(key);
  });
  return [...duplicates];
}

function percent(numerator, denominator) {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;
}

function shortId(controlId = '') {
  const match = String(controlId).match(/3\.\d{1,2}\.\d{1,2}/);
  return match ? match[0] : null;
}

export const SPRS_POINT_VALUES = Object.freeze({
  '3.1.1': 5, '3.1.2': 5, '3.1.3': 1, '3.1.4': 1, '3.1.5': 3, '3.1.6': 1, '3.1.7': 1,
  '3.1.8': 1, '3.1.9': 1, '3.1.10': 1, '3.1.11': 1, '3.1.12': 5, '3.1.13': 5, '3.1.14': 1,
  '3.1.15': 1, '3.1.16': 5, '3.1.17': 5, '3.1.18': 5, '3.1.19': 3, '3.1.20': 1, '3.1.21': 1,
  '3.1.22': 1, '3.2.1': 5, '3.2.2': 5, '3.2.3': 1, '3.3.1': 5, '3.3.2': 3, '3.3.3': 1,
  '3.3.4': 1, '3.3.5': 5, '3.3.6': 1, '3.3.7': 1, '3.3.8': 1, '3.3.9': 1, '3.4.1': 5,
  '3.4.2': 5, '3.4.3': 1, '3.4.4': 1, '3.4.5': 5, '3.4.6': 5, '3.4.7': 5, '3.4.8': 5,
  '3.4.9': 1, '3.5.1': 5, '3.5.2': 5, '3.5.3': 5, '3.5.4': 1, '3.5.5': 1, '3.5.6': 1,
  '3.5.7': 1, '3.5.8': 1, '3.5.9': 1, '3.5.10': 5, '3.5.11': 1, '3.6.1': 5, '3.6.2': 5,
  '3.6.3': 1, '3.7.1': 3, '3.7.2': 5, '3.7.3': 1, '3.7.4': 1, '3.7.5': 5, '3.7.6': 1,
  '3.8.1': 3, '3.8.2': 3, '3.8.3': 5, '3.8.4': 1, '3.8.5': 1, '3.8.6': 1, '3.8.7': 5,
  '3.8.8': 3, '3.8.9': 1, '3.9.1': 3, '3.9.2': 5, '3.10.1': 5, '3.10.2': 5, '3.10.3': 1,
  '3.10.4': 1, '3.10.5': 1, '3.10.6': 1, '3.11.1': 3, '3.11.2': 5, '3.11.3': 1, '3.12.1': 5,
  '3.12.2': 3, '3.12.3': 5, '3.12.4': 3, '3.13.1': 5, '3.13.2': 5, '3.13.3': 1, '3.13.4': 1,
  '3.13.5': 5, '3.13.6': 5, '3.13.7': 1, '3.13.8': 3, '3.13.9': 1, '3.13.10': 1, '3.13.11': 5,
  '3.13.12': 1, '3.13.13': 1, '3.13.14': 1, '3.13.15': 5, '3.13.16': 1, '3.14.1': 5,
  '3.14.2': 5, '3.14.3': 5, '3.14.4': 5, '3.14.5': 3, '3.14.6': 5, '3.14.7': 3,
});

const PARTIAL_DEDUCTION = Object.freeze({ '3.5.3': 3, '3.13.11': 3 });

export function computeCanonicalReadiness({
  project = null,
  assessments = [],
  objectiveLibrary = [],
  objectiveLinks = [],
  evidence = [],
  poams = [],
  asOf = new Date(),
} = {}) {
  const targetLevel = project?.target_cmmc_level || null;
  const expected = expectedCmmcTotals(targetLevel);
  const issues = [];
  if (!project?.id) issues.push('Project is missing.');
  if (!expected) issues.push(`Project target level "${targetLevel || 'Unknown'}" is not authoritative.`);

  const projectAssessments = assessments.filter((row) => row.project_id === project?.id);
  const assessmentIds = projectAssessments.map((row) => String(row.control_id || '').trim());
  if (assessmentIds.some((id) => !id)) issues.push('One or more assessments have a blank control ID.');
  const duplicateControls = duplicateKeys(projectAssessments, (row) => String(row.control_id || '').trim());
  if (duplicateControls.length) issues.push(`Duplicate assessment rows: ${duplicateControls.join(', ')}.`);
  if (expected && projectAssessments.length !== expected.requirements) {
    issues.push(`Expected ${expected.requirements} assessment rows, found ${projectAssessments.length}.`);
  }

  const activeObjectives = objectiveLibrary.filter((row) => row.active === true && row.cmmc_level === targetLevel);
  const duplicateObjectives = duplicateKeys(activeObjectives, (row) => String(row.objective_key || `${row.control_id}|${row.objective_id}`));
  if (duplicateObjectives.length) issues.push('Duplicate authoritative objective rows exist.');
  if (expected && activeObjectives.length !== expected.objectives) {
    issues.push(`Expected ${expected.objectives} active objectives, found ${activeObjectives.length}.`);
  }

  const projectEvidence = evidence.filter((row) => row.project_id === project?.id);
  const evidenceById = new Map(projectEvidence.map((row) => [row.id, row]));
  const validEvidenceIds = new Set(projectEvidence.filter((row) => validFinalEvidence(row, asOf)).map((row) => row.id));
  const projectLinks = objectiveLinks.filter((row) => row.project_id === project?.id);
  const duplicateLinks = duplicateKeys(projectLinks, (row) => `${row.control_id}|${row.objective_id}`);
  if (duplicateLinks.length) issues.push('Duplicate objective finding rows exist.');

  const linksByObjective = new Map();
  projectLinks.forEach((row) => linksByObjective.set(`${row.control_id}|${row.objective_id}`, row));
  const objectivesByControl = new Map();
  activeObjectives.forEach((row) => {
    const key = String(row.control_id || '').trim();
    if (!objectivesByControl.has(key)) objectivesByControl.set(key, []);
    objectivesByControl.get(key).push(row);
  });

  const controls = projectAssessments.map((assessment) => {
    const controlId = String(assessment.control_id || '').trim();
    const objectives = objectivesByControl.get(controlId) || [];
    const na = validNotApplicable(assessment);
    const objectiveFindings = objectives.map((objective) => {
      const link = linksByObjective.get(`${controlId}|${objective.objective_id}`) || null;
      const finalEvidence = Boolean(link?.evidence_id && validEvidenceIds.has(link.evidence_id));
      let finding = 'Not Assessed';
      if (link?.status === 'Gap') finding = 'Not Met';
      else if (link?.status === 'Met' && finalEvidence) finding = 'Met';
      else if (link?.status === 'Met') finding = 'Evidence Incomplete';
      return { objective_id: objective.objective_id, finding, evidence_id: link?.evidence_id || null };
    });

    let finding = 'Not Assessed';
    if (na) finding = 'Met';
    else if (objectives.length && objectiveFindings.every((row) => row.finding === 'Met')) finding = 'Met';
    else if (objectiveFindings.some((row) => row.finding === 'Not Met')) finding = 'Not Met';
    else if (objectiveFindings.some((row) => row.finding === 'Evidence Incomplete')) finding = 'Evidence Incomplete';

    return {
      control_id: controlId,
      status: assessment.status || 'Not Started',
      finding,
      valid_not_applicable: na,
      implemented: IMPLEMENTED_STATUSES.has(assessment.status) || na,
      objective_total: objectives.length,
      objective_met: objectiveFindings.filter((row) => row.finding === 'Met').length,
      objective_not_met: objectiveFindings.filter((row) => row.finding === 'Not Met').length,
      objective_evidence_incomplete: objectiveFindings.filter((row) => row.finding === 'Evidence Incomplete').length,
      has_valid_final_evidence: projectEvidence.some((row) => validEvidenceIds.has(row.id) && (row.control_ids || []).includes(controlId)),
      assessment,
    };
  });

  const integrityOk = issues.length === 0;
  const met = controls.filter((row) => row.finding === 'Met').length;
  const notMet = controls.filter((row) => row.finding === 'Not Met').length;
  const evidenceIncomplete = controls.filter((row) => row.finding === 'Evidence Incomplete').length;
  const notAssessed = controls.length - met - notMet - evidenceIncomplete;
  const implemented = controls.filter((row) => row.implemented).length;
  const openPoams = poams.filter((row) => row.project_id === project?.id && !CLOSED_POAM_STATUSES.has(row.status));
  const missingPoam = controls.filter((row) => row.finding === 'Not Met' && !openPoams.some((poam) => poam.control_id === row.control_id)).length;

  let sprsCurrent = null;
  let sprsDeduction = null;
  if (targetLevel === 'Level 2' && integrityOk) {
    sprsDeduction = controls.reduce((sum, row) => {
      const sid = shortId(row.control_id);
      const full = SPRS_POINT_VALUES[sid] || 0;
      if (row.finding === 'Met') return sum;
      if (row.status === 'Partially Implemented' && PARTIAL_DEDUCTION[sid] != null) return sum + PARTIAL_DEDUCTION[sid];
      return sum + full;
    }, 0);
    sprsCurrent = Math.max(-203, 110 - sprsDeduction);
  }

  return {
    integrity_ok: integrityOk,
    integrity_issues: issues,
    target_level: targetLevel,
    expected_requirements: expected?.requirements || null,
    expected_objectives: expected?.objectives || null,
    assessment_rows: projectAssessments.length,
    objective_rows: activeObjectives.length,
    controls,
    met,
    not_met: notMet,
    evidence_incomplete: evidenceIncomplete,
    not_assessed: notAssessed,
    implemented,
    implementation_pct: integrityOk ? percent(implemented, expected.requirements) : null,
    readiness_pct: integrityOk ? percent(met, expected.requirements) : null,
    objective_met: controls.reduce((sum, row) => sum + row.objective_met, 0),
    objective_not_met: controls.reduce((sum, row) => sum + row.objective_not_met, 0),
    valid_evidence: validEvidenceIds.size,
    total_evidence: projectEvidence.length,
    controls_needing_final_evidence: controls.filter((row) => !row.has_valid_final_evidence && !row.valid_not_applicable).length,
    open_poams: openPoams.length,
    missing_poam_for_not_met: missingPoam,
    sprs_current: sprsCurrent,
    sprs_deduction: sprsDeduction,
  };
}

export function canonicalSprsView(readiness) {
  return {
    current: readiness?.sprs_current ?? -203,
    projected: readiness?.sprs_current ?? -203,
    met: readiness?.met || 0,
    notMet: (readiness?.not_met || 0) + (readiness?.evidence_incomplete || 0) + (readiness?.not_assessed || 0),
    inProgress: readiness?.evidence_incomplete || 0,
    total: readiness?.expected_requirements || 110,
    deductions: readiness?.sprs_deduction ?? 313,
    integrityOk: readiness?.integrity_ok === true,
  };
}
