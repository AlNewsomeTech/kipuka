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

// ---- Compatibility bridge: legacy FEATURES.* and limits resolved from plan_tier ----
// plan_tier is the single source of truth. These map the newer plan tiers onto
// the legacy feature keys and limits so older call sites keep working.
import { planHasFeature, PLAN_FEATURES, planLimits, trialActive } from '@/lib/planTiers';

// Which legacy FEATURES key maps to which plan feature (or null = always allowed at any paid tier).
const LEGACY_TO_PLAN = {
  [FEATURES.L1_WORKFLOW]: PLAN_FEATURES.L1_WORKFLOW,
  [FEATURES.L2_WORKFLOW]: PLAN_FEATURES.L2_WORKFLOW,
  [FEATURES.EVIDENCE_VAULT_BASIC]: PLAN_FEATURES.EVIDENCE_VAULT,
  [FEATURES.EVIDENCE_VAULT_FULL]: PLAN_FEATURES.L2_WORKFLOW,
  [FEATURES.POLICY_LIBRARY_BASIC]: PLAN_FEATURES.EVIDENCE_VAULT,
  [FEATURES.SSP_EXPORT_BASIC]: PLAN_FEATURES.DOC_GENERATION,
  [FEATURES.SSP_BUILDER_FULL]: PLAN_FEATURES.L2_WORKFLOW,
  [FEATURES.POAM_TRACKER]: PLAN_FEATURES.L1_WORKFLOW,
  [FEATURES.PIEE_WALKTHROUGH]: PLAN_FEATURES.SPRS_PIEE,
  [FEATURES.CONTROL_LIBRARY]: PLAN_FEATURES.L2_WORKFLOW,
  [FEATURES.ASSET_INVENTORY]: PLAN_FEATURES.L2_WORKFLOW,
  [FEATURES.SPRS_TRACKING]: PLAN_FEATURES.L2_WORKFLOW,
  [FEATURES.C3PAO_HANDOFF]: PLAN_FEATURES.C3PAO_EXPORT,
  [FEATURES.EVIDENCE_QUALITY_REVIEW]: PLAN_FEATURES.EVIDENCE_REVIEW,
  [FEATURES.EXECUTIVE_DASHBOARD]: PLAN_FEATURES.ADVANCED_POAM_REPORTS,
  [FEATURES.CUI_SCOPING]: PLAN_FEATURES.L2_WORKFLOW,
  [FEATURES.ADVANCED_REPORTS]: PLAN_FEATURES.ADVANCED_POAM_REPORTS,
  [FEATURES.POLICY_PACKAGE_EXPORTS]: PLAN_FEATURES.DOC_GENERATION,
  [FEATURES.PACSEC_REVIEW]: PLAN_FEATURES.ACOLYTE_AVAILABILITY,
  [FEATURES.PACSEC_SUPPORT_DASHBOARD]: PLAN_FEATURES.ACOLYTE_AVAILABILITY,
  [FEATURES.MANAGED_TRACKING]: PLAN_FEATURES.ACOLYTE_AVAILABILITY,
};

// Resolve a legacy FEATURES.* check against an org's plan_tier (+ trial).
export function legacyFeatureAllowed(org, legacyFeature) {
  if (!org) return false;
  if (trialActive(org)) return true;
  const planFeature = LEGACY_TO_PLAN[legacyFeature];
  if (!planFeature) return true; // unmapped legacy feature: allow at any tier
  return planHasFeature(org, planFeature);
}

// Resolve a limit (seat_limit, storage_limit_gb, project_limit, exports_per_month)
// from the org's plan_tier.
export function planLimitFor(org, key) {
  return planLimits(org?.plan_tier)[key];
}