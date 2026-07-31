// Plain-English scoping questionnaire that routes a company to CMMC Level 1 (FCI
// only) or Level 2 (CUI). Pure data + logic. Answers are keyed by `key` and each
// value is exactly true ("Yes"), false ("No"), or null ("Not sure"). The answers
// are persisted onto the ScopingProfile server-side (wizard_answers preserves
// "Not sure") — this module only drives the on-screen recommendation.
//
// The authoritative track is always re-derived on the server; nothing here is
// trusted by the backend.

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

export const CUI_SIGNAL_KEYS = ['dfars_7012', 'dfars_7019_7020', 'dfars_7021', 'receives_cui', 'controlled_technical'];
export const FCI_SIGNAL_KEYS = ['far_52204_21', 'fci_only'];

// answers: map of key → true | false | null. Only an explicit `true` is a
// signal; `null` ("Not sure") stays unknown and is never read as a No.
// Returns { track, rationale, handles_fci, handles_cui, conflict }.
export function determineTrack(answers = {}) {
  const cuiSignals = CUI_SIGNAL_KEYS.some((k) => answers[k] === true);
  const fciSignals = FCI_SIGNAL_KEYS.some((k) => answers[k] === true);
  const conflict = cuiSignals && answers.fci_only === true;

  if (conflict) {
    return {
      track: 'Undetermined',
      conflict: true,
      rationale: 'Your answers contradict each other: you selected FCI-only, but you also indicated CUI is in scope. Review your answers, or contact Pac-Sec for a scoping review, before continuing.',
      handles_fci: true,
      handles_cui: true,
    };
  }

  if (cuiSignals) {
    return {
      track: 'Level 2',
      conflict: false,
      rationale: 'Your answers indicate CUI is (or will be) in scope — DFARS CUI clauses and/or handling of controlled technical or export-controlled information. This typically requires CMMC Level 2 (NIST SP 800-171, 110 requirements).',
      handles_fci: true,
      handles_cui: true,
    };
  }

  if (fciSignals) {
    return {
      track: 'Level 1',
      conflict: false,
      rationale: 'Your answers indicate you handle Federal Contract Information (FCI) but not CUI. This aligns with CMMC Level 1 (15 FAR 52.204-21 requirements, self-assessed).',
      handles_fci: true,
      handles_cui: false,
    };
  }

  // Undetermined is never silently downgraded to Level 1.
  return {
    track: 'Undetermined',
    conflict: false,
    rationale: 'Your answers do not clearly establish whether FCI or CUI is in scope. A scoping review is needed before a track can be selected — review your answers, or contact Pac-Sec.',
    handles_fci: false,
    handles_cui: false,
  };
}

export const SCOPING_DISCLAIMER =
  'This questionnaire provides a recommended starting track only. Final CMMC applicability depends on your specific contract requirements, the data you handle, and DoD direction. Validate with your contracting officer, prime contractor, or a qualified CMMC advisor.';