// Shared readiness pre-check logic for gating FINAL document generation.
// Draft generation is never gated; only final outputs surface these warnings.
// All checks are advisory (warnings, not hard blocks) so users may continue anyway.

// Compute a set of readiness signals from already-loaded project data.
// Pass in whatever is available; missing arrays default to empty and read as "not ready".
export function computeReadiness({ assessments = [], evidence = [], poams = [], assets = [], scoping = null, sprs = null, project = null } = {}) {
  const total = assessments.length;
  const implemented = assessments.filter((a) =>
    ['Implemented', 'Ready for Documentation', 'Ready for Assessment'].includes(a.status)
  ).length;
  const reviewed = assessments.filter((a) =>
    ['Ready for Documentation', 'Ready for Assessment'].includes(a.status)
  ).length;

  const evTotal = evidence.length;
  const evAccepted = evidence.filter((e) => e.review_status === 'Accepted').length;
  const evReviewed = evidence.filter((e) => e.review_status !== 'Draft' && e.review_status !== 'Needs Review').length;

  const closed = ['Closed', 'Accepted Risk'];
  const openHighRiskPoam = poams.filter((p) => ['High', 'Critical'].includes(p.risk_rating) && !closed.includes(p.status)).length;

  // Controls with a gap (Not Implemented / Gap Identified) but no linked POA&M.
  const gapControls = assessments.filter((a) => ['Not Implemented', 'Gap Identified'].includes(a.status));
  const poamControlIds = new Set(poams.map((p) => p.control_id).filter(Boolean));
  const unlinkedGaps = gapControls.filter((a) => !poamControlIds.has(a.control_id)).length;

  // Inventory is "finalized" when the project marks it so; scope is finalized when the profile is Approved.
  const inventoryFinalized = project?.inventory_status === 'Finalized';
  const scopeFinalized = scoping?.scope_status === 'Approved';

  const controlPct = total ? Math.round((implemented / total) * 100) : 0;
  const reviewPct = total ? Math.round((reviewed / total) * 100) : 0;
  const evidenceAcceptPct = evTotal ? Math.round((evAccepted / evTotal) * 100) : 0;

  return {
    total, implemented, reviewed, controlPct, reviewPct,
    evTotal, evAccepted, evReviewed, evidenceAcceptPct,
    openHighRiskPoam, unlinkedGaps,
    inventoryFinalized, scopeFinalized,
    sprsStatus: sprs?.cmmc_status || sprs?.assessment_type || 'Not Started',
    missingInventory: !inventoryFinalized,
    missingScopeValidation: !scopeFinalized,
  };
}

// Build the SSP pre-check list (question + passed boolean).
export function sspPrechecks(r) {
  return [
    { label: 'Are controls reviewed?', pass: r.total > 0 && r.reviewed >= r.total },
    { label: 'Are implementation statements complete?', pass: r.total > 0 && r.implemented >= r.total },
    { label: 'Is evidence uploaded?', pass: r.evTotal > 0 },
    { label: 'Is evidence reviewed?', pass: r.evTotal > 0 && r.evReviewed >= r.evTotal },
    { label: 'Are POA&M gaps linked?', pass: r.unlinkedGaps === 0 },
    { label: 'Is final scope validated?', pass: r.scopeFinalized },
    { label: 'Is asset inventory complete enough?', pass: r.inventoryFinalized },
  ];
}

// Build the handoff-package pre-check list.
export function handoffPrechecks(r, { sspApproved, policiesApproved, evidenceIndexReviewed, sprsUploaded } = {}) {
  return [
    { label: 'Scope approved', pass: r.scopeFinalized },
    { label: 'Asset inventory finalized', pass: r.inventoryFinalized },
    { label: 'SSP approved', pass: !!sspApproved },
    { label: 'POA&M reviewed', pass: r.unlinkedGaps === 0 },
    { label: 'Evidence index reviewed', pass: !!evidenceIndexReviewed },
    { label: 'Policies approved', pass: !!policiesApproved },
    { label: 'SPRS/PIEE artifacts uploaded', pass: !!sprsUploaded },
    { label: 'High-risk blockers reviewed', pass: r.openHighRiskPoam === 0 },
  ];
}

export function allPass(checks) {
  return checks.every((c) => c.pass);
}

export const FINAL_DOC_WARNING =
  'Final documentation may be incomplete because implementation, evidence, control validation, or final inventory is not complete. Generate a draft only, or continue anyway with a warning.';