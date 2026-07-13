// Platform capability tiers (plan_tier on Organization). Pure data + helpers.
// IMPORTANT: tier names and copy describe PLATFORM capabilities only. They never
// imply Pac-Sec managed services or consultant labor are included.

export const PLAN_TIERS = ['L1_Essentials', 'L1_Complete', 'L2_Professional', 'L2_Premium', 'Enterprise'];

// Platform feature keys gated by plan tier.
export const PLAN_FEATURES = {
  L1_WORKFLOW: 'l1_workflow',
  EVIDENCE_VAULT: 'evidence_vault',
  DASHBOARD: 'dashboard',
  SPRS_PIEE: 'sprs_piee',
  DOC_GENERATION: 'doc_generation',        // full document package generation + export
  L2_WORKFLOW: 'l2_workflow',              // scoping, assets, SSP builder, POA&M, policy library, SPRS tracker
  MOCK_ASSESSMENT: 'mock_assessment',
  C3PAO_EXPORT: 'c3pao_export',
  EVIDENCE_REVIEW: 'evidence_review',
  ADVANCED_POAM_REPORTS: 'advanced_poam_reports',
  MULTI_PROJECT: 'multi_project',
  ACOLYTE_AVAILABILITY: 'acolyte_availability',
};

const F = PLAN_FEATURES;

const L1_ESSENTIALS = [F.L1_WORKFLOW, F.EVIDENCE_VAULT, F.DASHBOARD, F.SPRS_PIEE];
const L1_COMPLETE = [...L1_ESSENTIALS, F.DOC_GENERATION];
const L2_PROFESSIONAL = [...L1_COMPLETE, F.L2_WORKFLOW];
const L2_PREMIUM = [
  ...L2_PROFESSIONAL, F.MOCK_ASSESSMENT, F.C3PAO_EXPORT, F.EVIDENCE_REVIEW,
  F.ADVANCED_POAM_REPORTS, F.MULTI_PROJECT, F.ACOLYTE_AVAILABILITY,
];
const ENTERPRISE = [...L2_PREMIUM];

export const PLAN_CONFIG = {
  L1_Essentials: {
    label: 'L1 Essentials',
    blurb: 'Guided Level 1 implementation, evidence vault with naming, dashboard, and the SPRS/PIEE walkthrough.',
    features: L1_ESSENTIALS,
    badge: 'bg-slate-100 text-slate-700',
  },
  L1_Complete: {
    label: 'L1 Complete',
    blurb: 'Everything in L1 Essentials plus full document package generation and export.',
    features: L1_COMPLETE,
    badge: 'bg-blue-100 text-blue-700',
  },
  L2_Professional: {
    label: 'L2 Professional',
    blurb: 'Full Level 2 workflow: scoping, assets, SSP builder, POA&M, policy library, and SPRS tracker.',
    features: L2_PROFESSIONAL,
    badge: 'bg-indigo-100 text-indigo-700',
  },
  L2_Premium: {
    label: 'L2 Premium',
    blurb: 'Everything in L2 Professional plus mock assessment mode, the C3PAO evidence export package, evidence review workflow, advanced POA&M reporting, multi-project support, and ACOLYTE Operations availability.',
    features: L2_PREMIUM,
    badge: 'bg-purple-100 text-purple-700',
  },
  Enterprise: {
    label: 'Enterprise',
    blurb: 'All platform capabilities, provisioned for larger programs.',
    features: ENTERPRISE,
    badge: 'bg-green-100 text-green-700',
  },
};

// The recommended tier a locked feature belongs to (first tier that includes it).
export const FEATURE_TIER = {};
PLAN_TIERS.forEach((t) => {
  PLAN_CONFIG[t].features.forEach((f) => {
    if (!FEATURE_TIER[f]) FEATURE_TIER[f] = t;
  });
});

export function planConfig(tier) {
  return PLAN_CONFIG[tier] || PLAN_CONFIG.L1_Essentials;
}

// Default seat / project / storage / export limits per plan tier. A null value
// means unlimited (Enterprise). Admins can override per-org after creation.
export const PLAN_LIMITS = {
  L1_Essentials: { seat_limit: 5, project_limit: 1, storage_limit_gb: 5, exports_per_month: 10 },
  L1_Complete: { seat_limit: 5, project_limit: 1, storage_limit_gb: 10, exports_per_month: 25 },
  L2_Professional: { seat_limit: 10, project_limit: 3, storage_limit_gb: 25, exports_per_month: 50 },
  L2_Premium: { seat_limit: 25, project_limit: 10, storage_limit_gb: 100, exports_per_month: 200 },
  Enterprise: { seat_limit: null, project_limit: null, storage_limit_gb: null, exports_per_month: null },
};

export function planLimits(tier) {
  return PLAN_LIMITS[tier] || PLAN_LIMITS.L1_Essentials;
}

// A 14-day full-featured trial unlocks every platform feature until it expires.
export function trialActive(org) {
  if (!org?.trial_full_access) return false;
  if (!org?.trial_ends_date) return true;
  return new Date(org.trial_ends_date) >= new Date(new Date().toDateString());
}

export function planHasFeature(org, feature) {
  if (!org) return false;
  if (trialActive(org)) return true;
  return planConfig(org.plan_tier).features.includes(feature);
}

// Which tier the user must reach for a feature (for upgrade copy).
export function tierLabelForFeature(feature) {
  const t = FEATURE_TIER[feature];
  return t ? PLAN_CONFIG[t].label : 'a higher tier';
}