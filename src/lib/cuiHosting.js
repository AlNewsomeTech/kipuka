// CUI hosting architecture — shared logic for the onboarding gate, the project
// dashboard banner, the guided walkthrough callout, and the SSP/scope statement.
//
// FACT (DFARS 252.204-7012): Microsoft 365 Commercial cannot store, process, or
// transmit CUI. A CMMC Level 2 assessment cannot succeed with CUI in a commercial
// tenant. The compliant paths are: a FedRAMP Moderate (or equivalent) enclave such
// as PreVeil, a full Microsoft 365 GCC High migration, or another FedRAMP Moderate+
// authorized/equivalent environment.

export const CUI_HOSTING = {
  PREVEIL: 'preveil_enclave',
  GCC_HIGH: 'gcc_high',
  OTHER: 'other_fedramp',
  UNDECIDED: 'undecided',
};

// The factual banner shown wherever the decision surfaces.
export const CUI_HOSTING_BANNER =
  'Microsoft 365 Commercial alone cannot be used for CUI. A CMMC Level 2 assessment cannot succeed with CUI stored in a commercial tenant.';

// IT environments (CompanyProfile.it_environment / implementation stack) that CANNOT
// hold CUI on their own and therefore require a hosting decision.
const CUI_INCAPABLE_ENVIRONMENTS = new Set([
  'Microsoft 365 Commercial',
  'Google Workspace',
  'On-Premises',
  'Hybrid',
]);

// GCC / GCC High are already CUI-capable; auto-map and skip the step.
export function autoHostingForEnvironment(itEnvironment) {
  if (itEnvironment === 'Microsoft 365 GCC High') return CUI_HOSTING.GCC_HIGH;
  if (itEnvironment === 'Microsoft 365 GCC') return CUI_HOSTING.GCC_HIGH;
  return null;
}

// Does this environment need the "where will CUI live?" decision?
export function environmentNeedsCuiDecision(itEnvironment) {
  return CUI_INCAPABLE_ENVIRONMENTS.has(itEnvironment);
}

// Decision is required when CUI is handled, the environment can't hold CUI, and no
// (non-undecided) choice has been recorded yet.
export function cuiHostingRequired({ handlesCui, itEnvironment, currentHosting }) {
  if (!handlesCui) return false;
  if (!environmentNeedsCuiDecision(itEnvironment)) return false;
  return !currentHosting || currentHosting === CUI_HOSTING.UNDECIDED;
}

// The three presentable options (undecided is a state, not an offered option).
export const CUI_HOSTING_OPTIONS = [
  {
    key: CUI_HOSTING.PREVEIL,
    label: 'PreVeil encrypted enclave',
    tagline: 'Recommended for most small contractors',
    recommended: true,
    summary:
      'An end-to-end encrypted CUI enclave that overlays your existing environment — CUI never touches the commercial tenant.',
    bullets: [
      'Lowest cost — only CUI-touching users need licenses',
      'Deploys in days, not months',
      'FedRAMP Moderate equivalent, FIPS 140-2 validated',
      'Supports DFARS 252.204-7012 (c)-(g) incident reporting',
    ],
    partnerNote:
      "Available through Pac-Sec's PreVeil partnership at 15% off list pricing — contact Pac-Sec.",
  },
  {
    key: CUI_HOSTING.GCC_HIGH,
    label: 'Microsoft 365 GCC High',
    tagline: 'Full tenant migration',
    summary:
      'Migrate the whole tenant to GCC High for a single audit boundary. Required for some ITAR scenarios.',
    bullets: [
      'Single audit boundary across the tenant',
      'Required for some ITAR scenarios',
      'Typically $25k–$200k migration over 3–6 months',
      'Roughly 3× the licensing cost of commercial',
    ],
  },
  {
    key: CUI_HOSTING.OTHER,
    label: 'Another FedRAMP Moderate+ environment',
    tagline: 'Name your own',
    summary:
      'Another FedRAMP Moderate (or higher) authorized or equivalent environment. Name it in the notes.',
    bullets: [
      'Any FedRAMP Moderate (or higher) authorized/equivalent platform',
      'You provide the name and equivalency evidence',
    ],
    needsNotes: true,
  },
];

// Controls whose M365-Commercial guidance was corrected because they may involve CUI.
// The guided walkthrough shows a PreVeil callout for these when the enclave is chosen.
export const CUI_SENSITIVE_CONTROL_IDS = new Set([
  'SC.L2-3.13.8', 'SC.L2-3.13.11', 'SC.L2-3.13.16',
  'AC.L2-3.1.3', 'AC.L2-3.1.19', 'AC.L2-3.1.20',
  'MP.L2-3.8.1', 'MP.L2-3.8.2', 'MP.L2-3.8.3', 'MP.L2-3.8.6', 'MP.L2-3.8.9',
  'AC.L1-3.1.20', 'MP.L1-3.8.3',
]);

export function isCuiSensitiveControl(controlId) {
  return CUI_SENSITIVE_CONTROL_IDS.has(controlId);
}

export function hostingLabel(key) {
  const o = CUI_HOSTING_OPTIONS.find((x) => x.key === key);
  if (o) return o.label;
  if (key === CUI_HOSTING.UNDECIDED) return 'Undecided';
  return 'Not set';
}

// One-sentence CUI architecture statement for the SSP system description / scope.
export function cuiArchitectureStatement(hosting, notes = '') {
  switch (hosting) {
    case CUI_HOSTING.PREVEIL:
      return 'CUI is stored, processed, and transmitted exclusively within the PreVeil end-to-end encrypted enclave (FedRAMP Moderate equivalent, hosted on AWS GovCloud); the Microsoft 365 Commercial tenant is out of scope for CUI and handles FCI and general business data only.';
    case CUI_HOSTING.GCC_HIGH:
      return 'CUI is stored, processed, and transmitted within the organization\'s Microsoft 365 GCC High tenant (FedRAMP High), which forms the single CUI authorization boundary.';
    case CUI_HOSTING.OTHER:
      return `CUI is stored, processed, and transmitted exclusively within a FedRAMP Moderate (or higher) authorized/equivalent environment${notes ? ` (${notes})` : ''}; the commercial tenant is out of scope for CUI.`;
    default:
      return 'CUI hosting architecture has not yet been determined. The current environment cannot lawfully store, process, or transmit CUI — a compliant CUI enclave or GCC High tenant must be selected before assessment.';
  }
}