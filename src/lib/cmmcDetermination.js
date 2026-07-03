// Pure logic for recommending a CMMC level & assessment path from the
// Step 2 contract/data answers. No side effects.

export const DETERMINATION_DISCLAIMER =
  'Final CMMC applicability depends on contract requirements, data handled, DoD direction, and official requirements. Validate with the contracting officer, prime contractor, legal counsel, or qualified CMMC advisor.';

// answers: object of booleans matching CMMCLevelDetermination fields.
export function recommendCmmc(answers = {}) {
  const {
    handles_fci,
    handles_cui,
    has_dfars_252_204_7012,
    has_dfars_252_204_7020,
    contract_mentions_cmmc_l1,
    contract_mentions_cmmc_l2,
    expected_future_cui,
  } = answers;

  const cuiSignals = handles_cui || expected_future_cui || has_dfars_252_204_7012 ||
    has_dfars_252_204_7020 || contract_mentions_cmmc_l2;

  // C3PAO signal: DFARS 7020 or explicit L2 contract mention typically points to a
  // third-party (C3PAO) Level 2 assessment.
  const c3paoSignal = has_dfars_252_204_7020 || contract_mentions_cmmc_l2;

  let level = 'Needs Review';
  let path = 'Needs Review';
  let rationale = '';

  if (cuiSignals) {
    level = 'Level 2';
    if (c3paoSignal) {
      path = 'Level 2 C3PAO';
      rationale = 'CUI-related requirements and third-party assessment signals (DFARS 252.204-7020 or a CMMC Level 2 contract reference) suggest a Level 2 C3PAO assessment may be required.';
    } else {
      path = 'Level 2 Self-Assessment';
      rationale = 'CUI is handled or expected, which typically requires CMMC Level 2. A self-assessment path is a reasonable starting point pending contract confirmation.';
    }
  } else if (handles_fci || contract_mentions_cmmc_l1) {
    level = 'Level 1';
    path = 'Level 1 Self-Assessment';
    rationale = 'FCI is handled with no indication of CUI, which typically aligns with CMMC Level 1 (self-assessment).';
  } else {
    level = 'Needs Review';
    path = 'Needs Review';
    rationale = 'Answers are unclear or indicate no in-scope federal data. A scoping review is recommended before selecting a path.';
  }

  return { recommended_level: level, recommended_assessment_path: path, rationale };
}

// Maps a chosen project path to the Project entity's target level & assessment path.
export const PATH_TO_PROJECT = {
  'CMMC Level 1 Self-Assessment': {
    project_type: 'CMMC Level 1',
    target_cmmc_level: 'Level 1',
    assessment_path: 'Level 1 Self-Assessment',
  },
  'CMMC Level 2 Self-Assessment': {
    project_type: 'CMMC Level 2 Self-Assessment',
    target_cmmc_level: 'Level 2',
    assessment_path: 'Level 2 Self-Assessment',
  },
  'CMMC Level 2 C3PAO Readiness': {
    project_type: 'CMMC Level 2 C3PAO Readiness',
    target_cmmc_level: 'Level 2',
    assessment_path: 'Level 2 C3PAO Assessment',
  },
  'CMMC Maintenance': {
    project_type: 'CMMC Maintenance',
    target_cmmc_level: 'Unknown',
    assessment_path: 'Unknown',
  },
  'Not sure, needs Pac-Sec review': {
    project_type: 'Other',
    target_cmmc_level: 'Unknown',
    assessment_path: 'Unknown',
  },
};

export const PROJECT_PATH_OPTIONS = [
  { value: 'CMMC Level 1 Self-Assessment', label: 'CMMC Level 1 Self-Assessment', desc: 'FCI-only, self-attested Level 1.' },
  { value: 'CMMC Level 2 Self-Assessment', label: 'CMMC Level 2 Self-Assessment', desc: 'CUI in scope, self-assessed Level 2.' },
  { value: 'CMMC Level 2 C3PAO Readiness', label: 'CMMC Level 2 C3PAO Readiness', desc: 'Prepare for a third-party (C3PAO) Level 2 assessment.' },
  { value: 'CMMC Maintenance', label: 'CMMC Maintenance', desc: 'Ongoing upkeep of an existing certification/posture.' },
  { value: 'Not sure, needs Pac-Sec review', label: 'Not sure — needs Pac-Sec review', desc: 'Flag for a Pac-Sec scoping review.' },
];