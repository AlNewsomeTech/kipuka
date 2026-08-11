import fs from 'node:fs';

let passed = 0;
const failures = [];
function check(condition, label) {
  if (condition) { passed += 1; return; }
  failures.push(label);
}
function read(path) { return fs.readFileSync(path, 'utf8'); }

const gate = read('src/lib/readinessGate.js');
const reports = read('src/components/project/reports/ReportsModule.jsx');
const ssp = read('src/components/project/ssp/SSPModule.jsx');
const precheck = read('src/components/project/ReadinessPrecheck.jsx');
const backend = read('base44/functions/generateEvidencePackage/entry.ts');
const generators = read('src/lib/reportGenerators.js');
const checklist = read('src/lib/checklistAuto.js');
const app = read('src/App.jsx');
const layout = read('src/components/Layout.jsx');
const inventory = read('src/components/project/inventory/InventoryModule.jsx');
const scoping = read('src/components/project/scoping/ScopingModule.jsx');
const scopingQuestions = read('src/lib/scopingQuestions.js');
const richText = read('src/components/ui/RichTextField.jsx');
const policyEditor = read('src/components/project/policies/PolicyEditorModal.jsx');
const policiesModule = read('src/components/project/policies/PoliciesModule.jsx');
const lifecycle = read('base44/functions/manageFinalDocumentReview/entry.ts');
const writeGate = read('base44/functions/orgScopedWrite/entry.ts');
const client = read('src/api/base44Client.js');
const sspSchema = read('base44/entities/SystemSecurityPlan.jsonc');
const policySchema = read('base44/entities/PolicyTemplate.jsonc');
const eventSchema = read('base44/entities/FinalDocumentReviewEvent.jsonc');
const canonicalScopingKeys = [...scopingQuestions.matchAll(/key: '([^']+)'/g)].map((match) => match[1]);

[
  ['canonical integrity handoff check', gate.includes('Canonical requirement and objective set is valid')],
  ['objective MET handoff check', gate.includes('Every applicable requirement is MET from final evidence')],
  ['implementation-complete handoff check', gate.includes('Every applicable requirement is implementation-complete')],
  ['valid final evidence handoff check', gate.includes('Evidence index contains only valid Accepted evidence')],
  ['current evidence filter', gate.includes("(e.lifecycle_status || 'Current') === 'Current'")],
  ['valid final evidence helper use', gate.includes('validFinalEvidence(e)')],
  ['optional SPRS flag', gate.includes('options.requireSprs !== false')],
  ['strict final warning', gate.includes('Final output is blocked')],
  ['reports complete-load error state', reports.includes('Final-document data could not be verified')],
  ['reports complete-load retry', reports.includes('Retry complete load')],
  ['reports critical assessment read is not swallowed', !reports.includes('ControlAssessment.filter({ project_id: project.id }).catch')],
  ['reports critical evidence read is not swallowed', !reports.includes('ProjectEvidence.filter({ project_id: project.id }).catch')],
  ['reports loads SPRS records', reports.includes('base44.entities.SPRSRecord.filter')],
  ['reports requires independently approved policies', reports.includes('validApprovedPolicies(data.policies)')],
  ['reports requires all current evidence valid', reports.includes('readiness.evValidFinal === readiness.evTotal')],
  ['reports uses server preflight for handoff PDF', reports.includes('await previewEvidencePackage({ project })')],
  ['reports shows failed-closed export error', reports.includes('Export failed closed')],
  ['reports has no continue-anyway action', !reports.includes('Continue Anyway')],
  ['SSP complete-load error state', ssp.includes('SSP source data could not be verified')],
  ['SSP critical evidence read is not swallowed', !ssp.includes('ProjectEvidence.filter({ project_id: project.id }).catch')],
  ['SSP requires every section complete', ssp.includes('completion.pct === 100')],
  ['SSP requires independent approved provenance', ssp.includes('validApprovedSsp(ssp)')],
  ['SSP final export rechecks gate', ssp.includes('if (!finalReady)')],
  ['SSP final export does not self-promote approval', !ssp.includes("await updateApproval({ approval_status: 'In Review' })")],
  ['SSP has no continue-anyway action', !ssp.includes('Continue Anyway')],
  ['precheck documents strict behavior', precheck.includes('Failed checks block final output')],
  ['backend mirrors approved N/A workflow', backend.includes("not_applicable_request_status === 'Approved'")],
  ['backend validates N/A decision hash', backend.includes('not_applicable_decision_sha256')],
  ['backend accepts canonical private URI', backend.includes('e.file_uri')],
  ['backend limits package to current evidence', backend.includes('const currentEvidence = evidence.filter')],
  ['backend limits package to valid final evidence', backend.includes('const finalEvidence = currentEvidence.filter')],
  ['backend uses signed private URL', backend.includes('CreateFileSignedUrl')],
  ['backend recomputes SHA-256', backend.includes("crypto.subtle.digest('SHA-256'")],
  ['backend compares evidence hash', backend.includes('failed SHA-256 verification')],
  ['backend does not silently replace missing files', !backend.includes('.MISSING.txt')],
  ['backend stops when a package file fails', backend.includes('Package generation stopped')],
  ['backend critical assessment read is not swallowed', !backend.includes('ControlAssessment.filter({ project_id: projectId }).catch')],
  ['backend loads SPRS records', backend.includes('sr.entities.SPRSRecord.filter')],
  ['backend blocks canonical integrity failures', backend.includes("hardBlockers.push('Canonical requirement/objective integrity failed.')")],
  ['backend blocks incomplete assessment readiness', backend.includes('Every applicable requirement must be MET from valid final evidence.')],
  ['backend blocks incomplete implementation', backend.includes('canonical.implementation_percent !== 100')],
  ['backend blocks incomplete current evidence', backend.includes('finalEvidence.length !== currentEvidence.length')],
  ['backend blocks unapproved scope', backend.includes("scoping?.scope_status !== 'Approved'")],
  ['backend blocks unfinalized inventory', backend.includes("project?.inventory_status !== 'Finalized'")],
  ['backend blocks SSP without current independent approval', backend.includes("validIndependentApproval('SystemSecurityPlan', ssp)")],
  ['backend blocks unapproved policies', backend.includes('!policiesApproved')],
  ['backend blocks open high-risk POA&M', backend.includes('openHighRisk.length')],
  ['backend blocks missing SPRS artifacts', backend.includes('!sprsUploaded')],
  ['backend preview returns blockers', backend.includes('hard_blockers: hardBlockers')],
  ['backend generation returns 409 on blockers', backend.includes("{ status: 409 }")],
  ['final readiness has distinct title', generators.includes("isFinal ? 'Final Readiness Report' : 'Executive Progress Report'")],
  ['final readiness has distinct filename', generators.includes("isFinal ? 'Final_Readiness' : 'Executive_Progress'")],
  ['checklist requires independently approved SSP', checklist.includes('ssps.some(validApprovedSsp)')],
  ['checklist requires generated export status', checklist.includes("e.report_status === 'Generated'")],
  ['checklist requires exact final readiness title', checklist.includes("'Final Readiness Report'" )],
  ['legacy package route redirects', app.includes('<Navigate to="/projects" replace />')],
  ['legacy package component import removed', !app.includes("import SharePointPackage from '@/pages/SharePointPackage'" )],
  ['legacy package navigation removed', !layout.includes("to: '/sharepoint-package'")],
  ['inventory load failures do not become empty data', !inventory.includes('Asset.filter({ project_id: project.id }).catch')],
  ['inventory has explicit complete-load error', inventory.includes('Asset inventory could not be verified')],
  ['inventory finalization requires assets', inventory.includes('At least one asset is recorded')],
  ['inventory finalization requires owners', inventory.includes('Every asset has an owner')],
  ['inventory finalization requires scope categories', inventory.includes('Every asset has a final scope category')],
  ['inventory finalization validates CUI handling', inventory.includes('CUI assets identify how CUI is handled')],
  ['inventory rejects premature Finalized state', inventory.includes("v === 'Finalized' && !inventoryCanFinalize")],
  ['inventory changes visible status only after save', inventory.indexOf('await base44.entities.Project.update') < inventory.indexOf('setInvStatus(savedProject.inventory_status || v)')],
  ['inventory surfaces status-save failures', inventory.includes('Inventory status was not saved')],
  ['scope load failures do not become empty data', !scoping.includes('ScopingProfile.filter({ project_id: project.id }).catch')],
  ['scope has explicit complete-load error', scoping.includes('Scoping profile could not be verified')],
  ['scope approval requires boundary', scoping.includes('Assessment boundary is documented')],
  ['scope approval requires systems', scoping.includes('Included systems are documented')],
  ['scope approval requires data flow', scoping.includes('Data flow is documented')],
  ['scope approval requires every wizard answer', scoping.includes('Every scoping question is answered')],
  ['scope approval accepts only current environment types', scoping.includes("ENV_TYPES.includes(profile?.environment_type) && profile.environment_type !== 'Unknown'")],
  ['scope rejects premature Approved state', scoping.includes("payload.scope_status === 'Approved' && !scopeCanApprove")],
  ['scope approval action is disabled until complete', scoping.includes('disabled={saving || !scopeCanApprove}')],
  ['scope save failures are visible', scoping.includes('Scope was not saved')],
  ['shared readiness validates approved scope content', gate.includes('validApprovedScope(scoping)')],
  ['shared readiness validates finalized inventory content', gate.includes('validFinalInventory(project, assets)')],
  ['backend loads project assets for finalization proof', backend.includes('sr.entities.Asset.filter({ project_id: projectId })')],
  ['backend validates complete approved scope', backend.includes('!validApprovedScope(scoping)')],
  ['shared readiness accepts only current environment types', gate.includes("VALID_SCOPE_ENVIRONMENT_TYPES.has(scoping.environment_type)")],
  ['backend accepts only current environment types', backend.includes("VALID_SCOPE_ENVIRONMENT_TYPES.has(scoping.environment_type)")],
  ['backend scoping questions match the canonical client questions', canonicalScopingKeys.length > 0 && canonicalScopingKeys.every((key) => backend.includes(`'${key}'`))],
  ['rich text normalizes legacy array values', richText.includes("Array.isArray(value) ? value.join('\\n') : ''")],
  ['backend validates complete finalized inventory', backend.includes('!validFinalInventory(project, assets)')],
  ['SSP schema is service-write-only', sspSchema.includes('"role": "__service_only__"')],
  ['policy schema is service-write-only', policySchema.includes('"role": "__service_only__"')],
  ['review event schema is immutable service-write-only', eventSchema.includes('"role": "__service_only__"')],
  ['review event schema records previous hash', eventSchema.includes('"previous_event_sha256"')],
  ['review lifecycle authenticates before service role', lifecycle.indexOf('base44.auth.me()') < lifecycle.indexOf('base44.asServiceRole')],
  ['review lifecycle supports only named source entities', lifecycle.includes("SOURCE_ENTITIES = ['SystemSecurityPlan', 'PolicyTemplate']")],
  ['review lifecycle hashes stable source content', lifecycle.includes('sourceHash(sourceEntity, record)')],
  ['review lifecycle blocks self review', lifecycle.includes('You cannot review a document you submitted.')],
  ['review lifecycle uses organization review roles', lifecycle.includes('REVIEW_ROLES')],
  ['review lifecycle verifies current hash before approval', lifecycle.includes('hash !== record.review_source_sha256')],
  ['review lifecycle appends hash chained event', lifecycle.includes('previous_event_sha256: prior[0]?.event_sha256')],
  ['review lifecycle is idempotent by transition id', lifecycle.includes('record.last_transition_id === transitionId')],
  ['write gate protects approval provenance fields', writeGate.includes('REVIEW_PROVENANCE_FIELDS')],
  ['write gate invalidates approval when source content changes', writeGate.includes('REVIEW_INVALIDATION')],
  ['write gate cannot accept client approval status', writeGate.includes("'approval_status', 'approved_by', 'approved_date'")],
  ['all SSP and policy browser writes route through service', client.includes("['ControlAssessment', 'PolicyTemplate', 'SystemSecurityPlan'].includes(entityName)")],
  ['SSP UI invokes final document review lifecycle', ssp.includes("manageFinalDocumentReview")],
  ['SSP UI hides reviewer actions from submitter', ssp.includes("approval_status === 'In Review' && !isReviewSubmitter")],
  ['policy UI invokes final document review lifecycle', policyEditor.includes("manageFinalDocumentReview")],
  ['policy UI hides reviewer actions from submitter', policyEditor.includes("approval_status === 'In Review' && !isSubmitter")],
  ['policy editor cannot directly write approval fields', !policyEditor.includes('approval_status: form.approval_status')],
  ['policy screen fails closed on read errors', policiesModule.includes('Policy data could not be verified')],
  ['legacy policy delete action retired', !policyEditor.includes('Trash2') && !policiesModule.includes('PolicyTemplate.delete')],
  ['draft policy register is not mislabeled final', generators.includes("title: 'Draft Policy Register'")],
  ['shared approval validator requires equal SHA-256 hashes', gate.includes('reviewHash === approvalHash')],
  ['shared approval validator requires independent identities', gate.includes('reviewerId !== requesterId')],
  ['backend recomputes SSP and policy content hashes', backend.includes('reviewedSourceHash(sourceEntity, record)')],
].forEach(([label, condition]) => check(condition, label));

if (failures.length) {
  console.error(`Phase 7 final-handoff gate failed: ${passed} passed, ${failures.length} failed`);
  failures.forEach((label) => console.error(`FAIL: ${label}`));
  process.exit(1);
}
console.log(`Phase 7 final-handoff gate passed: ${passed}/${passed}`);
