// Left project-navigation module definitions and onboarding checklist steps.
import {
  LayoutDashboard, Crosshair, Boxes, ClipboardCheck, ListChecks, FileStack,
  AlertTriangle, ScrollText, BadgeCheck, BarChart3,
} from 'lucide-react';

// Modules rendered in the per-project left navigation.
// `read` = visible to read-only roles (Auditor Viewer) too.
export const PROJECT_MODULES = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, read: true },
  { key: 'scoping', label: 'Scoping', icon: Crosshair, read: false },
  { key: 'inventory', label: 'Asset Inventory', icon: Boxes, read: false },
  { key: 'assessment', label: 'Assessment', icon: ClipboardCheck, read: false },
  { key: 'evidence', label: 'Evidence', icon: ListChecks, read: true },
  { key: 'ssp', label: 'SSP', icon: FileStack, read: true, darkhorizon: true },
  { key: 'poam', label: 'POA&M', icon: AlertTriangle, read: true },
  { key: 'policies', label: 'Policies', icon: ScrollText, read: false, darkhorizon: true },
  { key: 'sprs', label: 'SPRS / PIEE', icon: BadgeCheck, read: false },
  { key: 'reports', label: 'Reports', icon: BarChart3, read: true, darkhorizon: true },
];

export function moduleByKey(key) {
  return PROJECT_MODULES.find((m) => m.key === key) || PROJECT_MODULES[0];
}

// Onboarding checklist steps shown on the project dashboard.
// `tierGated` steps only appear/complete when the org tier includes the handoff feature.
export const ONBOARDING_STEPS = [
  { key: 'confirm_org', label: 'Confirm organization profile' },
  { key: 'level_determination', label: 'Complete level determination' },
  { key: 'cui_fci_scoping', label: 'Complete CUI/FCI scoping' },
  { key: 'asset_inventory', label: 'Complete asset inventory' },
  { key: 'control_assessment', label: 'Complete control assessment' },
  { key: 'upload_evidence', label: 'Upload evidence' },
  { key: 'build_ssp', label: 'Build SSP' },
  { key: 'build_poam', label: 'Build POA&M' },
  { key: 'review_policies', label: 'Review policies' },
  { key: 'sprs_entry', label: 'Prepare SPRS entry' },
  { key: 'readiness_report', label: 'Generate readiness report' },
  { key: 'handoff_package', label: 'Generate handoff package', tierGated: true },
];