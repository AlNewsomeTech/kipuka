// Auto-completion rules for the workflow checklist: derive "done" from real
// project activity so users don't have to manually tick steps the data already
// proves. Conservative by design — a step only auto-completes on a solid signal.
// Manual checkmarks still work and are OR-merged with these (a step is complete
// if the user checked it OR the data proves it).
import { isMetStatus } from '@/lib/sprsScoring';

// All controls in the given families are MET (and at least one exists).
function familiesDone(assessments, families) {
  const fams = new Set(families);
  const inFam = assessments.filter((a) => fams.has((a.domain || '').toUpperCase()) ||
    fams.has(String(a.control_id || '').split('.')[0].toUpperCase()));
  if (!inFam.length) return false;
  return inFam.every((a) => isMetStatus(a.status) || a.status === 'Not Applicable');
}

function hasExport(exports, ...types) {
  return (exports || []).some((e) => types.includes(e.report_type));
}

// Returns { [stepKey]: true } for every step provably complete from live data.
export function deriveAutoChecklist({ project, scoping, assessments = [], evidence = [], poams = [], ssps = [], sprs = null, exports = [], assets = [] }) {
  const auto = {};
  const set = (k, v) => { if (v) auto[k] = true; };

  // Phase 1 — setup
  set('create_project', true);
  set('identify_ao', !!project?.affirming_official_name);
  set('select_cmmc_path', !!project?.assessment_path && !!project?.target_cmmc_level);

  // Phase 2 — preliminary scope
  set('confirm_fci_cui', scoping != null && (scoping.handles_fci != null || scoping.handles_cui != null));
  set('draft_boundary', !!scoping?.boundary_summary);
  set('identify_known_systems', !!scoping?.included_systems_summary);

  // Phase 3 — implementation (families fully met)
  set('config_identity', familiesDone(assessments, ['AC', 'IA']));
  set('config_endpoint', familiesDone(assessments, ['SI']));
  set('config_cloud', familiesDone(assessments, ['SC', 'CM']));

  // Phase 4 — evidence
  set('capture_screenshots', evidence.some((e) => e.evidence_type === 'Screenshot'));
  set('upload_evidence', evidence.length > 0);
  set('map_evidence', evidence.some((e) => (e.control_ids || []).length > 0));
  set('review_evidence', evidence.some((e) => e.review_status === 'Accepted'));

  // Phase 5 — validation
  set('link_poam_gaps', poams.some((p) => !!p.control_id));
  set('mark_ready_for_docs', assessments.some((a) =>
    ['Ready for Documentation', 'Ready for Assessment', 'Evidence Accepted'].includes(a.status)));
  set('review_impl_status', assessments.length > 0 && assessments.some((a) => isMetStatus(a.status)));

  // Phase 6 — final inventory
  set('hardware_inventory', assets.length > 0);
  set('confirm_out_of_scope', assets.some((a) => (a.scope_category || '').startsWith('Out-of-Scope')));
  set('finalize_cui_boundary', !!scoping?.boundary_summary && assets.some((a) => a.in_scope));

  // Phase 7 — final documentation (proven by generated artifacts)
  set('gen_final_ssp', ssps.length > 0);
  set('gen_final_poam', hasExport(exports, 'POA&M Export'));
  set('gen_final_evidence_index', hasExport(exports, 'Evidence Index'));
  set('gen_final_readiness_report', hasExport(exports, 'Executive Readiness Report', 'Gap Assessment Report'));
  set('gen_handoff_package', hasExport(exports, 'C3PAO Handoff Package', 'C3PAO Evidence Package'));

  // Phase 8 — SPRS / PIEE
  set('prepare_sprs_entry', !!sprs);
  set('track_ao_affirmation', !!sprs?.affirmed_date);
  set('record_cmmc_uid', !!sprs?.cmmc_uid);

  return auto;
}

// OR-merge manual checkmarks with auto-derived completion.
export function mergeChecklist(manual = {}, auto = {}) {
  const merged = { ...auto };
  Object.entries(manual).forEach(([k, v]) => { merged[k] = v || !!auto[k]; });
  return merged;
}
