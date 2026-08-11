import { computeCanonicalReadiness, validFinalEvidence } from '@/lib/canonicalReadiness';
import { SCOPING_QUESTIONS } from '@/lib/scopingQuestions';

const VALID_SCOPE_ENVIRONMENT_TYPES = new Set(['Entire Enterprise', 'Enclave', 'Hybrid']);

// Shared readiness pre-check logic for gating FINAL document generation.
// Draft generation remains available. Anything labeled final or assessor-ready
// must pass these checks and fail closed when source data is incomplete.

export function validApprovedScope(scoping) {
  if (scoping?.scope_status !== 'Approved') return false;
  if (!String(scoping.scope_name || '').trim() || !VALID_SCOPE_ENVIRONMENT_TYPES.has(scoping.environment_type)) return false;
  if (!String(scoping.boundary_summary || '').trim() || !String(scoping.included_systems_summary || '').trim() || !String(scoping.data_flow_summary || '').trim()) return false;
  if (scoping.handles_fci && !String(scoping.fci_description || '').trim()) return false;
  if (scoping.handles_cui && !String(scoping.cui_description || '').trim()) return false;
  return SCOPING_QUESTIONS.every((q) => String((scoping.wizard_answers || {})[q.key] || '').trim());
}

export function validFinalInventory(project, assets = []) {
  if (project?.inventory_status !== 'Finalized' || assets.length === 0) return false;
  return assets.every((asset) => String(asset.owner || '').trim()
    && asset.scope_category && asset.scope_category !== 'Unknown'
    && asset.status && asset.status !== 'Unknown'
    && (asset.scope_category !== 'CUI Asset' || asset.stores_cui || asset.processes_cui || asset.transmits_cui || asset.handles_cui));
}

export function validIndependentDocumentApproval(record) {
  if (record?.approval_status !== 'Approved') return false;
  const reviewHash = String(record.review_source_sha256 || '');
  const approvalHash = String(record.approval_source_sha256 || '');
  const requesterId = String(record.review_requested_by_user_id || '');
  const requesterEmail = String(record.review_requested_by_email || '').toLowerCase();
  const reviewerId = String(record.reviewed_by_user_id || '');
  const reviewerEmail = String(record.reviewed_by_email || '').toLowerCase();
  const independentlyReviewed = reviewerId && requesterId
    ? reviewerId !== requesterId
    : reviewerEmail && requesterEmail && reviewerEmail !== requesterEmail;
  return /^[a-f0-9]{64}$/i.test(reviewHash)
    && reviewHash === approvalHash
    && independentlyReviewed
    && !!record.review_request_id
    && !!record.approval_record_id
    && !!record.reviewed_date
    && !!record.approved_date;
}

export function validApprovedSsp(ssp) {
  return !!ssp && validIndependentDocumentApproval(ssp);
}

export function validApprovedPolicies(policies = []) {
  const current = policies.filter((policy) => !policy.is_master_template && policy.approval_status !== 'Archived');
  return current.length > 0 && current.every(validIndependentDocumentApproval);
}

// Compute a set of readiness signals from already-loaded project data.
// Pass in whatever is available; missing arrays default to empty and read as "not ready".
export function computeReadiness({ assessments = [], objectiveLibrary = [], objectiveLinks = [], evidence = [], poams = [], assets = [], scoping = null, sprs = null, project = null } = {}) {
  const canonical = computeCanonicalReadiness({
    project, assessments, objectiveLibrary, objectiveLinks, evidence, poams,
  });
  const total = canonical.expected_requirements || 0;
  const implemented = canonical.implemented;
  const reviewed = canonical.met;

  const currentEvidence = evidence.filter((e) => (e.lifecycle_status || 'Current') === 'Current'
    && !['Archived', 'Superseded'].includes(e.review_status));
  const evTotal = currentEvidence.length;
  const evAccepted = currentEvidence.filter((e) => e.review_status === 'Accepted').length;
  const evValidFinal = currentEvidence.filter((e) => validFinalEvidence(e)).length;
  const evReviewed = currentEvidence.filter((e) => e.review_status !== 'Draft' && e.review_status !== 'Needs Review').length;

  const closed = ['Closed', 'Accepted Risk'];
  const openHighRiskPoam = poams.filter((p) => ['High', 'Critical'].includes(p.risk_rating) && !closed.includes(p.status)).length;

  // Controls with a gap (Not Implemented / Gap Identified) but no linked POA&M.
  const gapControls = assessments.filter((a) => ['Not Implemented', 'Gap Identified'].includes(a.status));
  const poamControlIds = new Set(poams.map((p) => p.control_id).filter(Boolean));
  const unlinkedGaps = gapControls.filter((a) => !poamControlIds.has(a.control_id)).length;

  // Final states are valid only when their source records pass the same completeness rules as the editor.
  const inventoryFinalized = validFinalInventory(project, assets);
  const scopeFinalized = validApprovedScope(scoping);

  const controlPct = canonical.integrity_ok ? canonical.implementation_pct : null;
  const reviewPct = canonical.integrity_ok ? canonical.readiness_pct : null;
  const evidenceAcceptPct = evTotal ? Math.round((evAccepted / evTotal) * 100) : 0;

  return {
    total, implemented, reviewed, controlPct, reviewPct,
    canonicalIntegrityOk: canonical.integrity_ok,
    canonicalIntegrityIssues: canonical.integrity_issues,
    met: canonical.met,
    notMet: canonical.not_met,
    evidenceIncomplete: canonical.evidence_incomplete,
    notAssessed: canonical.not_assessed,
    evTotal, evAccepted, evValidFinal, evReviewed, evidenceAcceptPct,
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
    { label: 'Is the canonical requirement/objective set valid?', pass: r.canonicalIntegrityOk },
    { label: 'Are all applicable objectives MET from final evidence?', pass: r.total > 0 && r.met >= r.total },
    { label: 'Are implementation statements complete?', pass: r.total > 0 && r.implemented >= r.total },
    { label: 'Is evidence uploaded?', pass: r.evTotal > 0 },
    { label: 'Is evidence reviewed?', pass: r.evTotal > 0 && r.evReviewed >= r.evTotal },
    { label: 'Are POA&M gaps linked?', pass: r.unlinkedGaps === 0 },
    { label: 'Is final scope validated?', pass: r.scopeFinalized },
    { label: 'Is asset inventory complete enough?', pass: r.inventoryFinalized },
  ];
}

// Build the handoff-package pre-check list.
/**
 * @param {any} r
 * @param {{sspApproved?: boolean, policiesApproved?: boolean, evidenceIndexReviewed?: boolean, sprsUploaded?: boolean, requireSprs?: boolean}} [options]
 */
export function handoffPrechecks(r, options = {}) {
  const { sspApproved = false, policiesApproved = false, evidenceIndexReviewed = false, sprsUploaded = false } = options;
  const requireSprs = options.requireSprs !== false;
  const checks = [
    { label: 'Canonical requirement and objective set is valid', pass: r.canonicalIntegrityOk },
    { label: 'Every applicable requirement is MET from final evidence', pass: r.total > 0 && r.met >= r.total },
    { label: 'Every applicable requirement is implementation-complete', pass: r.total > 0 && r.implemented >= r.total },
    { label: 'Scope approved', pass: r.scopeFinalized },
    { label: 'Asset inventory finalized', pass: r.inventoryFinalized },
    { label: 'SSP approved', pass: !!sspApproved },
    { label: 'POA&M gaps linked', pass: r.unlinkedGaps === 0 },
    { label: 'Evidence index contains only valid Accepted evidence', pass: !!evidenceIndexReviewed },
    { label: 'Policies approved', pass: !!policiesApproved },
    { label: 'No open high/critical-risk POA&M items', pass: r.openHighRiskPoam === 0 },
  ];
  if (requireSprs) checks.push({ label: 'SPRS/PIEE artifacts uploaded', pass: !!sprsUploaded });
  return checks;
}

export function allPass(checks) {
  return checks.every((c) => c.pass);
}

export const FINAL_DOC_WARNING =
  'Final output is blocked because implementation, accepted evidence, objective findings, scope, inventory, or approvals are incomplete. Generate a clearly labeled draft or return to the workflow to resolve the failed checks.';