// Plain-English scoping questionnaire that routes a company to CMMC Level 1 (FCI
// only) or Level 2 (CUI). Pure data + logic. Answers are booleans keyed by `key`
// and are also persisted onto the ScopingProfile (wizard_answers + handles_fci/cui).

export const SCOPING_QUESTIONNAIRE = [
  {
    key: 'far_52204_21',
    question: 'Do your contracts include FAR clause 52.204-21 (Basic Safeguarding of Covered Contractor Information Systems)?',
    help: 'This clause appears in almost every federal contract and requires basic safeguarding of Federal Contract Information (FCI). If unsure, it is very likely yes.',
    signal: 'fci',
  },
  {
    key: 'dfars_7012',
    question: 'Do your contracts include DFARS 252.204-7012 (Safeguarding Covered Defense Information and Cyber Incident Reporting)?',
    help: 'This clause means you receive or create Controlled Unclassified Information (CUI) and must meet NIST SP 800-171.',
    signal: 'cui',
  },
  {
    key: 'dfars_7019_7020',
    question: 'Do your contracts include DFARS 252.204-7019 or 7020 (NIST SP 800-171 DoD Assessment Requirements)?',
    help: 'These require you to have a current self-assessment score posted in SPRS — a strong Level 2 signal.',
    signal: 'cui',
  },
  {
    key: 'dfars_7021',
    question: 'Do your contracts include DFARS 252.204-7021 (CMMC requirement)?',
    help: 'This clause explicitly requires a CMMC certification at a specified level.',
    signal: 'cui',
  },
  {
    key: 'receives_cui',
    question: 'Do you receive, create, store, or transmit CUI?',
    help: 'CUI examples: controlled technical information, engineering drawings, export-controlled data (ITAR/EAR), specifications, and other markings like "CUI" or "FOUO".',
    signal: 'cui',
  },
  {
    key: 'controlled_technical',
    question: 'Do you handle controlled technical information, export-controlled data, or ITAR-controlled drawings?',
    help: 'Technical drawings, blueprints, source code, or export-controlled documents provided by or for the DoD are CUI.',
    signal: 'cui',
  },
  {
    key: 'fci_only',
    question: 'Do you only handle Federal Contract Information (FCI) and never handle CUI?',
    help: 'FCI is information provided by or generated for the government under a contract that is not intended for public release, but is NOT CUI. FCI-only companies are Level 1.',
    signal: 'fci_only',
  },
];

// answers: map of key → boolean. Returns { track, rationale, handles_fci, handles_cui }.
export function determineTrack(answers = {}) {
  const cuiSignals =
    answers.dfars_7012 || answers.dfars_7019_7020 || answers.dfars_7021 ||
    answers.receives_cui || answers.controlled_technical;

  const fciSignals = answers.far_52204_21 || answers.fci_only;

  let track = 'Undetermined';
  let rationale = '';

  if (cuiSignals) {
    track = 'Level 2';
    rationale = 'Your answers indicate CUI is (or will be) in scope — DFARS CUI clauses and/or handling of controlled technical or export-controlled information. This typically requires CMMC Level 2 (NIST SP 800-171, 110 practices).';
  } else if (answers.fci_only || fciSignals) {
    track = 'Level 1';
    rationale = 'Your answers indicate you handle Federal Contract Information (FCI) but not CUI. This aligns with CMMC Level 1 (17 practices, self-assessed).';
  } else {
    track = 'Undetermined';
    rationale = 'Your answers do not clearly indicate FCI or CUI in scope. A scoping review is recommended before selecting a track. You can proceed and adjust later.';
  }

  return {
    track,
    rationale,
    handles_fci: !!fciSignals || track === 'Level 1' || track === 'Level 2',
    handles_cui: !!cuiSignals,
  };
}

export const SCOPING_DISCLAIMER =
  'This questionnaire provides a recommended starting track only. Final CMMC applicability depends on your specific contract requirements, the data you handle, and DoD direction. Validate with your contracting officer, prime contractor, or a qualified CMMC advisor.';