// Subscription tier definitions, feature gating, and role permission matrix.
// Pure data + helpers — no side effects. Used across the SaaS layer.

export const TIERS = ['Trial', 'Starter L1', 'Professional L2', 'Premium L2 Readiness', 'Pac-Sec Managed'];

// Feature keys used to gate UI/actions across the app.
export const FEATURES = {
  L1_WORKFLOW: 'l1_workflow',
  L2_WORKFLOW: 'l2_workflow',
  EVIDENCE_VAULT_BASIC: 'evidence_vault_basic',
  EVIDENCE_VAULT_FULL: 'evidence_vault_full',
  POLICY_LIBRARY_BASIC: 'policy_library_basic',
  SSP_EXPORT_BASIC: 'ssp_export_basic',
  SSP_BUILDER_FULL: 'ssp_builder_full',
  POAM_TRACKER: 'poam_tracker',
  PIEE_WALKTHROUGH: 'piee_walkthrough',
  CONTROL_LIBRARY: 'control_library',
  ASSET_INVENTORY: 'asset_inventory',
  SPRS_TRACKING: 'sprs_tracking',
  C3PAO_HANDOFF: 'c3pao_handoff',
  EVIDENCE_QUALITY_REVIEW: 'evidence_quality_review',
  EXECUTIVE_DASHBOARD: 'executive_dashboard',
  CUI_SCOPING: 'cui_scoping',
  ADVANCED_REPORTS: 'advanced_reports',
  POLICY_PACKAGE_EXPORTS: 'policy_package_exports',
  PACSEC_REVIEW: 'pacsec_review',
  PACSEC_SUPPORT_DASHBOARD: 'pacsec_support_dashboard',
  MANAGED_TRACKING: 'managed_tracking',
};

const STARTER = [
  FEATURES.L1_WORKFLOW, FEATURES.EVIDENCE_VAULT_BASIC, FEATURES.POLICY_LIBRARY_BASIC,
  FEATURES.SSP_EXPORT_BASIC, FEATURES.POAM_TRACKER, FEATURES.PIEE_WALKTHROUGH,
];
const PROFESSIONAL = [
  ...STARTER, FEATURES.L2_WORKFLOW, FEATURES.EVIDENCE_VAULT_FULL, FEATURES.SSP_BUILDER_FULL,
  FEATURES.CONTROL_LIBRARY, FEATURES.ASSET_INVENTORY, FEATURES.SPRS_TRACKING,
];
const PREMIUM = [
  ...PROFESSIONAL, FEATURES.C3PAO_HANDOFF, FEATURES.EVIDENCE_QUALITY_REVIEW,
  FEATURES.EXECUTIVE_DASHBOARD, FEATURES.CUI_SCOPING, FEATURES.ADVANCED_REPORTS,
  FEATURES.POLICY_PACKAGE_EXPORTS,
];
const MANAGED = [
  ...PREMIUM, FEATURES.PACSEC_REVIEW, FEATURES.PACSEC_SUPPORT_DASHBOARD, FEATURES.MANAGED_TRACKING,
];

export const TIER_CONFIG = {
  'Trial': {
    label: 'Trial', features: PROFESSIONAL, seat_limit: 5, project_limit: 1,
    storage_limit_gb: 5, exports_per_month: 10, badge: 'bg-slate-100 text-slate-700',
  },
  'Starter L1': {
    label: 'Starter L1', features: STARTER, seat_limit: 5, project_limit: 1,
    storage_limit_gb: 5, exports_per_month: 10, badge: 'bg-blue-100 text-blue-700',
  },
  'Professional L2': {
    label: 'Professional L2', features: PROFESSIONAL, seat_limit: 10, project_limit: 3,
    storage_limit_gb: 25, exports_per_month: 50, badge: 'bg-indigo-100 text-indigo-700',
  },
  'Premium L2 Readiness': {
    label: 'Premium L2 Readiness', features: PREMIUM, seat_limit: 25, project_limit: 10,
    storage_limit_gb: 100, exports_per_month: 200, badge: 'bg-purple-100 text-purple-700',
  },
  'Pac-Sec Managed': {
    label: 'Pac-Sec Managed', features: MANAGED, seat_limit: null, project_limit: null,
    storage_limit_gb: null, exports_per_month: null, badge: 'bg-green-100 text-green-700',
  },
};

export function getTierConfig(tier) {
  return TIER_CONFIG[tier] || TIER_CONFIG['Trial'];
}

export function tierHasFeature(tier, feature) {
  return getTierConfig(tier).features.includes(feature);
}

// A "null" limit means unlimited (custom Pac-Sec Managed).
export function tierLimit(tier, key) {
  const cfg = getTierConfig(tier);
  return cfg[key];
}