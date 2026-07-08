// Item 5 — maps dashboard "Next Recommended Steps" keys and workflow-phase
// checklist step keys to the module/route where that step is actually performed.
// Returns a path relative to /projects/:id, or a special guided-queue filter.

// Family filter tokens the guided queue understands (?family=AC,IA).
const STEP_TO_TARGET = {
  // Scope
  confirm_fci_cui: { module: 'scoping' },
  draft_boundary: { module: 'scoping' },
  identify_known_systems: { module: 'scoping' },
  identify_external_providers: { module: 'srm' },
  // Implementation → guided queue filtered to families
  config_identity: { guided: true, family: 'AC,IA' },
  config_endpoint: { guided: true, family: 'SI,SC' },
  config_cloud: { guided: true, family: 'SC,CM' },
  config_security_tooling: { module: 'security-tooling' },
  config_ninjaone: { module: 'security-tooling' },
  config_cortex: { module: 'security-tooling' },
  // Evidence
  capture_screenshots: { module: 'evidence' },
  export_reports: { module: 'evidence' },
  upload_evidence: { module: 'evidence' },
  name_evidence: { module: 'evidence' },
  map_evidence: { module: 'evidence' },
  review_evidence: { module: 'readiness' },
  // Validation
  review_impl_status: { module: 'assessment' },
  review_evidence_status: { module: 'readiness' },
  link_poam_gaps: { module: 'poam' },
  mark_ready_for_docs: { module: 'assessment' },
  // Final inventory
  intune_inventory: { module: 'inventory' },
  hardware_inventory: { module: 'inventory' },
  confirm_endpoint_inventory: { module: 'inventory' },
  confirm_asset_ownership: { module: 'inventory' },
  finalize_cui_boundary: { module: 'inventory' },
  confirm_out_of_scope: { module: 'inventory' },
  // Final docs
  gen_final_ssp: { module: 'ssp' },
  gen_final_poam: { module: 'poam' },
  gen_final_evidence_index: { module: 'evidence' },
  gen_final_readiness_report: { module: 'reports' },
  gen_handoff_package: { module: 'reports' },
  // SPRS
  prepare_sprs_entry: { module: 'sprs' },
  track_ao_affirmation: { module: 'sprs' },
  record_cmmc_uid: { module: 'sprs' },
  save_submission_evidence: { module: 'sprs' },
  // Setup
  create_project: { module: 'dashboard' },
  confirm_uei_cage: { module: 'dashboard' },
  identify_ao: { module: 'dashboard' },
  select_cmmc_path: { module: 'scoping' },
  // Maintenance
  refresh_evidence: { module: 'maintenance' },
  update_ssp: { module: 'ssp' },
  update_poam: { module: 'poam' },
  periodic_reviews: { module: 'maintenance' },
};

// Build a concrete route for a step key under a given project.
export function stepLink(projectId, stepKey) {
  const t = STEP_TO_TARGET[stepKey];
  if (!t) return `/projects/${projectId}`;
  if (t.guided) {
    return `/projects/${projectId}/guided${t.family ? `?family=${encodeURIComponent(t.family)}` : ''}`;
  }
  if (t.module === 'dashboard') return `/projects/${projectId}`;
  return `/projects/${projectId}/${t.module}`;
}