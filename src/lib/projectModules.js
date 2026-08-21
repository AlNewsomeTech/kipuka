// Left project-navigation module definitions and phase-based workflow checklist.
import {
  LayoutDashboard, Crosshair, Boxes, ClipboardCheck, ListChecks, FileStack,
  AlertTriangle, ScrollText, BadgeCheck, BarChart3, Wrench, ShieldHalf,
  Network, Share2, Siren, Gavel, Rocket, CloudCog,
} from 'lucide-react';

// Modules rendered in the per-project left navigation.
// Ordered to reflect the corrected CMMC workflow: implementation & evidence FIRST,
// heavy inventory and documentation LATER.
// `read` = visible to read-only roles (Auditor Viewer) too.
export const PROJECT_MODULES = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, read: true },
  { key: 'scoping', label: 'Preliminary Scope', icon: Crosshair, read: false },
  { key: 'assessment', label: 'Control Implementation', icon: ClipboardCheck, read: false },
  // Optional Microsoft Graph deployment — only visible when the organization
  // entitlement flag is true (filtered in ProjectNav). Default hidden.
  { key: 'microsoft', label: 'Microsoft 365 Deployment', icon: CloudCog, read: false, orgFlag: 'microsoft_graph_deployment_enabled' },
  { key: 'security-tooling', label: 'Security Tooling', icon: ShieldHalf, read: false },
  { key: 'evidence', label: 'Evidence', icon: ListChecks, read: true },
  { key: 'readiness', label: 'Evidence Readiness', icon: ClipboardCheck, read: true },
  { key: 'mock', label: 'Mock Assessment', icon: Gavel, read: true },
  { key: 'poam', label: 'POA&M', icon: AlertTriangle, read: true },
  { key: 'inventory', label: 'Final Inventory & Scope', icon: Boxes, read: false },
  { key: 'diagrams', label: 'Network & Data Flow', icon: Network, read: true },
  { key: 'srm', label: 'Shared Responsibility', icon: Share2, read: true },
  { key: 'incident', label: 'Incident Response', icon: Siren, read: true },
  { key: 'ssp', label: 'SSP', icon: FileStack, read: true },
  { key: 'policies', label: 'Policies', icon: ScrollText, read: false },
  { key: 'reports', label: 'Reports', icon: BarChart3, read: true },
  { key: 'sprs', label: 'SPRS / PIEE', icon: BadgeCheck, read: false },
  { key: 'maintenance', label: 'Maintenance', icon: Wrench, read: false },
];

export function moduleByKey(key) {
  return PROJECT_MODULES.find((m) => m.key === key) || PROJECT_MODULES[0];
}

// Simplified, grouped navigation for client-facing roles. Each entry points at an
// EXISTING module route — no new pages. Consultants still get the full PROJECT_MODULES
// list, and clients can flip to it with the "Advanced view" toggle.
export const CLIENT_NAV_GROUPS = [
  { key: 'dashboard', label: 'Guided Setup', icon: Rocket },
  { key: 'assessment', label: 'My Controls', icon: ClipboardCheck },
  { key: 'evidence', label: 'Evidence', icon: ListChecks },
  { key: 'poam', label: 'POA&M (Gaps)', icon: AlertTriangle },
  { key: 'policies', label: 'Policies', icon: ScrollText },
  { key: 'ssp', label: 'Documents', icon: FileStack },
  { key: 'mock', label: 'Mock Assessment', icon: Gavel },
  { key: 'sprs', label: 'SPRS / PIEE', icon: BadgeCheck },
];

// Phase-based workflow checklist shown on the project dashboard.
// Documentation generation appears AFTER implementation, evidence, control
// validation, and final inventory — reflecting the corrected workflow order.
// `tierGated` steps only appear when the org tier includes the handoff feature.
export const WORKFLOW_PHASES = [
  {
    key: 'setup', title: 'Phase 1: Project Setup', steps: [
      { key: 'create_project', label: 'Create project' },
      { key: 'confirm_uei_cage', label: 'Confirm UEI / CAGE' },
      { key: 'identify_ao', label: 'Identify Affirming Official (AO)' },
      { key: 'select_cmmc_path', label: 'Select target CMMC path' },
    ],
  },
  {
    key: 'prelim_scope', title: 'Phase 2: Preliminary Scope', steps: [
      { key: 'confirm_fci_cui', label: 'Confirm FCI/CUI handling' },
      { key: 'draft_boundary', label: 'Draft preliminary boundary' },
      { key: 'identify_known_systems', label: 'Identify known systems' },
      { key: 'identify_external_providers', label: 'Identify known external providers' },
    ],
  },
  {
    key: 'implementation', title: 'Phase 3: Implementation', steps: [
      { key: 'config_identity', label: 'Configure identity/access controls' },
      { key: 'config_endpoint', label: 'Configure endpoint/security controls' },
      { key: 'config_cloud', label: 'Configure cloud controls' },
      { key: 'config_security_tooling', label: 'Configure Security Tooling' },
      { key: 'config_ninjaone', label: 'Configure RMM / device management (if used)' },
      { key: 'config_cortex', label: 'Configure EDR / endpoint protection (if used)' },
    ],
  },
  {
    key: 'evidence', title: 'Phase 4: Evidence', steps: [
      { key: 'capture_screenshots', label: 'Capture screenshots' },
      { key: 'export_reports', label: 'Export reports' },
      { key: 'upload_evidence', label: 'Upload evidence' },
      { key: 'name_evidence', label: 'Name evidence correctly' },
      { key: 'map_evidence', label: 'Map evidence to controls' },
      { key: 'review_evidence', label: 'Review evidence' },
    ],
  },
  {
    key: 'validation', title: 'Phase 5: Control Validation', steps: [
      { key: 'review_impl_status', label: 'Review implementation status' },
      { key: 'review_evidence_status', label: 'Review evidence status' },
      { key: 'link_poam_gaps', label: 'Link POA&M gaps' },
      { key: 'mark_ready_for_docs', label: 'Mark controls Ready for Documentation' },
    ],
  },
  {
    key: 'final_inventory', title: 'Phase 6: Final Inventory & Scope Validation', steps: [
      { key: 'intune_inventory', label: 'Complete device management inventory' },
      { key: 'hardware_inventory', label: 'Complete hardware inventory' },
      { key: 'confirm_endpoint_inventory', label: 'Confirm endpoint inventory' },
      { key: 'confirm_asset_ownership', label: 'Confirm asset ownership' },
      { key: 'finalize_cui_boundary', label: 'Finalize CUI boundary' },
      { key: 'confirm_out_of_scope', label: 'Confirm out-of-scope systems' },
    ],
  },
  {
    key: 'final_docs', title: 'Phase 7: Final Documentation', steps: [
      { key: 'gen_final_ssp', label: 'Generate final SSP' },
      { key: 'gen_final_poam', label: 'Generate final POA&M' },
      { key: 'gen_final_evidence_index', label: 'Generate final evidence index' },
      { key: 'gen_final_readiness_report', label: 'Generate final readiness report' },
      { key: 'gen_handoff_package', label: 'Generate handoff package', tierGated: true },
    ],
  },
  {
    key: 'sprs', title: 'Phase 8: SPRS / PIEE', steps: [
      { key: 'prepare_sprs_entry', label: 'Prepare SPRS entry' },
      { key: 'track_ao_affirmation', label: 'Track AO affirmation' },
      { key: 'record_cmmc_uid', label: 'Record CMMC UID' },
      { key: 'save_submission_evidence', label: 'Save submission evidence' },
    ],
  },
  {
    key: 'maintenance', title: 'Phase 9: Maintenance', steps: [
      { key: 'refresh_evidence', label: 'Refresh evidence' },
      { key: 'update_ssp', label: 'Update SSP' },
      { key: 'update_poam', label: 'Update POA&M' },
      { key: 'periodic_reviews', label: 'Complete periodic reviews' },
    ],
  },
];

// Flattened list retained for backward compatibility with any existing consumers.
export const ONBOARDING_STEPS = WORKFLOW_PHASES.flatMap((p) =>
  p.steps.map((s) => ({ ...s, phase: p.key }))
);