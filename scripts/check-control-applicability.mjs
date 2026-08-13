import fs from 'node:fs';
import path from 'node:path';
import { validNotApplicable } from '../src/lib/canonicalReadiness.js';
import { buildEvidenceFilePlan } from '../src/lib/evidenceFilename.js';
import { buildCaptureItems, CAPTURE_SAFETY_NOTE } from '../src/lib/captureInstructions.js';
import { buildPolicyNames } from '../src/lib/policyNaming.js';

const ROOT = process.cwd();
let passed = 0;
const failures = [];
function ok(condition, message) {
  if (condition) passed += 1;
  else failures.push(message);
}
function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}
function jsonc(rel) {
  return JSON.parse(read(rel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, ''));
}
function before(source, first, second, message) {
  const a = source.indexOf(first);
  const b = source.indexOf(second);
  ok(a >= 0 && b >= 0 && a < b, message);
}

const assessmentSchema = jsonc('base44/entities/ControlAssessment.jsonc');
const requestSchema = jsonc('base44/entities/ControlApplicabilityRequest.jsonc');
const eventSchema = jsonc('base44/entities/ControlApplicabilityEvent.jsonc');

ok(assessmentSchema.rls?.write?.user_condition?.role === '__service_only__', 'ControlAssessment writes are service-only');
ok(requestSchema.rls?.write?.user_condition?.role === '__service_only__', 'applicability requests are service-only');
ok(eventSchema.rls?.write?.user_condition?.role === '__service_only__', 'applicability events are service-only');
for (const field of [
  'not_applicable_request_id', 'not_applicable_request_status',
  'not_applicable_decision_sha256', 'not_applicable_approved_by_email',
  'not_applicable_approved_date', 'not_applicable_last_transition_id',
  'not_applicable_last_transition_input_sha256',
]) ok(Boolean(assessmentSchema.properties[field]), 'assessment schema has ' + field);
for (const field of [
  'organization_id', 'project_id', 'control_assessment_id', 'control_id',
  'status', 'source_assessment_sha256', 'request_sha256', 'decision_sha256',
  'submitted_by_user_id', 'reviewed_by_user_id', 'last_transition_id',
  'last_transition_input_sha256',
]) ok(Boolean(requestSchema.properties[field]), 'request schema has ' + field);
for (const field of [
  'transition_id', 'transition_input_sha256', 'previous_event_sha256',
  'event_sha256', 'actor_user_id', 'request_sha256', 'decision_sha256',
]) ok(Boolean(eventSchema.properties[field]), 'event schema has ' + field);
ok(eventSchema.properties.action.enum.includes('Approved'), 'event records approval');
ok(eventSchema.properties.action.enum.includes('Rejected'), 'event records rejection');
ok(eventSchema.properties.action.enum.includes('Restored Applicable'), 'event records scope restoration');

const fn = read('base44/functions/manageControlApplicability/entry.ts');
before(fn, 'base44.auth.me()', 'base44.asServiceRole', 'authentication precedes service-role use');
before(fn, 'OrganizationUser.filter', 'Project.get', 'membership is checked before Project read');
ok(fn.includes("const ACTIONS = ['get', 'request', 'approve', 'reject', 'withdraw', 'restore']"), 'action allowlist is explicit');
ok(fn.includes('Unexpected fields:'), 'unexpected fields fail closed');
ok(fn.includes('project.organization_id !== callerOrg'), 'tenant ownership is enforced');
ok(fn.includes('assessment.organization_id !== project.organization_id'), 'assessment tenant mismatch fails closed');
ok(fn.includes('assessments.length !== 1'), 'assessment ambiguity fails closed');
ok(fn.includes('libraryRows.length !== 1'), 'authoritative mapping ambiguity fails closed');
ok(fn.includes('Reviewer separation required'), 'requester cannot review own request');
ok(fn.includes('REVIEW_ROLES'), 'review roles are explicit');
ok(!fn.includes("SELF_REVIEW_ROLES"), 'there is no self-review exception');
ok(fn.includes('sourceSha !== target.source_assessment_sha256'), 'stale assessment blocks review');
ok(fn.includes('justification.length < 40'), 'request requires substantive justification');
ok(fn.includes('scopeEvidence.length < 20'), 'request requires identified scope records');
ok(fn.includes('scope_confirmation !== true'), 'request requires explicit scope confirmation');
ok(fn.includes("status: 'Pending Review'"), 'request begins pending');
ok(fn.includes("status: 'Not Applicable'"), 'approved transition sets N/A');
before(fn, "const finalRequest = await sr.entities.ControlApplicabilityRequest.update", "const assessmentPatch: any = approved", 'request decision is saved before the normal N/A assessment patch');
ok(fn.includes('not_applicable_request_status: \'Approved\''), 'approval marker is server-written');
ok(fn.includes('not_applicable_decision_sha256: decisionSha'), 'decision hash is attached to assessment');
ok(fn.includes('event_sha256'), 'events are SHA-256 backed');
ok(fn.includes('previous_event_sha256'), 'events form a hash chain');
ok(fn.includes('transition_id was already used for a different action or payload'), 'idempotency keys cannot change payload');
ok(fn.includes('idempotent_replay: true'), 'identical transition replay is safe');
ok(fn.includes('audit_recovered: true'), 'partial transitions are explicitly recovered');
ok(fn.includes('transitionRequests.length > 1'), 'duplicate partial-transition markers fail closed');
ok(fn.includes('assessmentTransitionMatch'), 'assessment transitions carry recovery markers');
ok(fn.includes("action === 'request'") && fn.includes('Interrupted request transition is inconsistent'), 'interrupted requests recover consistently');
ok(fn.includes("action === 'approve' || action === 'reject'") && fn.includes('Interrupted review transition is inconsistent'), 'interrupted reviews recover consistently');
ok(fn.includes("action === 'withdraw'") && fn.includes('Interrupted withdrawal transition is inconsistent'), 'interrupted withdrawals recover consistently');
ok(fn.includes("action === 'restore'") && fn.includes('Interrupted restore transition is inconsistent'), 'interrupted restores recover consistently');
ok((fn.match(/not_applicable_last_transition_id: transitionId/g) || []).length >= 8, 'all assessment transition and recovery paths persist idempotency markers');
ok(fn.includes("action !== 'restore'"), 'legacy N/A can be restored without a request record');

const writeGate = read('base44/functions/orgScopedWrite/entry.ts');
ok(writeGate.includes("key.startsWith('not_applicable_')"), 'generic gate blocks protected N/A fields');
ok(writeGate.includes("clean.status === 'Not Applicable'"), 'generic gate blocks direct N/A status');
ok(writeGate.includes('Not Applicable findings require an independent applicability review'), 'generic gate gives an actionable rejection');
const client = read('src/api/base44Client.js');
const protectedWriteRoute = "WRITE_METHODS.has(method) && ['ControlAssessment', 'PolicyTemplate', 'SystemSecurityPlan'].includes(entityName)";
ok(client.includes(protectedWriteRoute), 'all platform roles service-route assessment writes');
ok(client.indexOf(protectedWriteRoute) < client.indexOf("role !== 'client'"), 'assessment routing happens before staff direct-write bypass');

const guided = read('src/pages/project/GuidedWalkthrough.jsx');
const panel = read('src/components/guided/ApplicabilityPanel.jsx');
const assessmentModule = read('src/components/project/assessment/AssessmentModule.jsx');
ok(guided.includes("functions.invoke('manageControlApplicability'"), 'guided page invokes applicability backend');
ok(!/ControlAssessment\.(?:create|update)[\s\S]{0,500}not_applicable_/.test(guided), 'guided page has no direct N/A write');
ok(panel.includes('Submit for independent review'), 'plain-language request action is present');
ok(panel.includes('you cannot review it'), 'UI explains reviewer separation');
ok(panel.includes('Legacy N/A record requires independent review'), 'legacy records are clearly identified');
ok(panel.includes('Approve N/A') && panel.includes('Reject request'), 'reviewer decisions are exposed');
ok(!assessmentModule.match(/const STATUSES[^\n]*'Not Applicable'/), 'generic status menu cannot select N/A');

const verifyStep = read('src/components/guided/StepVerify.jsx');
const guidedProgress = read('src/lib/guidedProgress.js');
ok(!/ControlAssessment\.update\([\s\S]{0,400}\.catch\(\(\) => \{\}\)/.test(guided), 'guided completion never swallows an assessment write failure');
ok(!/ProjectPOAM\.create\([\s\S]{0,500}\.catch\(\(\) => \{\}\)/.test(guided), 'guided stuck flow never swallows a POA&M write failure');
ok(guided.includes("if (!savedAssessment?.id) throw new Error('Kipuka did not confirm the control status update.')"), 'guided transitions require a confirmed saved assessment');
ok(guided.includes("setActionError(actionErrorMessage("), 'guided transitions surface backend errors');
ok(guided.includes("role=\"alert\""), 'guided page renders accessible workflow errors');
ok(verifyStep.includes('role="alert"') && verifyStep.includes('{error}'), 'verify step displays a failed completion message');
before(guided, 'ProjectPOAM.filter({ project_id: projectId, control_id: controlId })', 'ProjectPOAM.create({', 'stuck flow checks for an existing open item before creating one');
ok(guided.includes("!['Closed', 'Deferred', 'Accepted Risk'].includes(item.status)"), 'closed or inactive POA&M items are never reused');
before(guided, 'ControlAssessment.update(assessment.id, { status: GUIDED_STUCK_STATUS })', 'setStuckOpen(false)', 'stuck panel closes only after the canonical status save');
ok(guided.includes("setProgressError(actionErrorMessage("), 'walkthrough progress failures are visible');
ok(!guided.includes("saveGuidedProgress(progress, {\n      projectId, organizationId: org, controlId, patch,\n    }).catch(() => null)"), 'walkthrough progress no longer hides save failures');
ok(guidedProgress.includes('const saveQueues = new Map()') && guidedProgress.includes('previous.catch(() => {}).then'), 'walkthrough saves are serialized per project and control');
before(guidedProgress, 'await loadGuidedProgress(projectId, controlId)', 'GuidedProgress.create({', 'stale tabs recheck existing progress before creating a row');
ok(!guidedProgress.includes(".catch(() => [])"), 'progress lookup failures cannot masquerade as no existing progress');
ok(!guided.includes("ControlLibrary.filter({ active: true }).catch") && !guided.includes("ControlAssessment.filter({ project_id: projectId }).catch"), 'critical guided reads never fall back to empty arrays');
ok(!guided.includes("manageControlApplicability', {\n        action: 'get'") || !guided.includes("}).catch(() => null)"), 'applicability load failures never become an empty workflow');
ok(guided.includes('Retry guided workflow') && guided.includes('No empty or missing state has been assumed'), 'guided load failures show a fail-closed retry state');

const stepUpload = read('src/components/guided/StepUpload.jsx');
const uploadModal = read('src/components/project/evidence/EvidenceUploadModal.jsx');
const evidenceFunction = read('base44/functions/manageProjectEvidence/entry.ts');
ok(guided.includes('buildEvidenceFilePlan'), 'guided walkthrough builds one canonical evidence filename plan');
ok(guided.includes('filenamePlan={filenamePlan}') && guided.includes('readOnly={readOnly}'), 'guided upload receives canonical naming and read-only state');
ok(stepUpload.includes("functions.invoke('manageProjectEvidence'"), 'guided evidence actions use the canonical backend');
ok(stepUpload.includes("transition(item, 'download')"), 'guided downloads use hash-verified signed URLs');
ok(stepUpload.includes("transition(item, 'submit_review')"), 'guided Draft and Rejected evidence can be submitted for review');
ok(!stepUpload.includes('href={item.file_url}') && !stepUpload.includes('href={e.file_url}'), 'guided evidence never opens a legacy public URL');
ok(stepUpload.includes("!['Archived', 'Superseded'].includes(item.review_status)"), 'guided view excludes inactive evidence versions');
ok(!stepUpload.includes('.catch(() => setEvidence([]))'), 'evidence read failures never masquerade as no evidence');
ok(stepUpload.includes('setEvidenceLoaded(false)') && stepUpload.includes('No empty evidence state has been assumed'), 'evidence load failures fail closed');
ok(stepUpload.includes('!evidenceLoaded ?') && stepUpload.includes('Evidence is unavailable until the complete project evidence list loads successfully.'), 'evidence list stays unavailable until a complete read succeeds');
ok(stepUpload.includes('<button onClick={load}') && stepUpload.includes('>Retry</button>'), 'evidence load failure offers a bounded retry');
ok(stepUpload.includes('Only Accepted evidence can support readiness'), 'guided copy explains the evidence readiness boundary');
ok(stepUpload.includes('does not replace the assessor’s objective finding'), 'guided copy separates evidence from assessor findings');
ok(uploadModal.includes('file_name_description: form.file_name_description'), 'guided filename description reaches canonical ingestion');
ok(uploadModal.includes('Maximum size: 50 MB'), 'upload form explains the enforced size limit');
ok(uploadModal.includes('accept=".png,.jpg,.jpeg,.pdf,.docx,.xlsx,.csv,.txt,.json,.zip,.log"'), 'upload picker mirrors the backend extension allowlist');
ok(uploadModal.includes('Save Draft, then submit the saved record for independent review'), 'upload form explains the review handoff');
ok(evidenceFunction.includes("'file_name_description'"), 'backend explicitly allows the bounded filename description');
ok(evidenceFunction.includes('sanitizePart(body.file_name_description || title'), 'backend constructs the stored filename from the guided description');
ok(evidenceFunction.includes("replace(/[^A-Za-z0-9.-]+/g, '_')"), 'backend filename sanitizer matches the guided underscore format');
ok(verifyStep.includes('Finish Implementation Step'), 'verify step labels implementation progress without claiming assessment completion');
ok(verifyStep.includes('Evidence acceptance and objective assessment remain separate'), 'verify step explains the canonical readiness boundary');
ok(guided.includes('if (readOnly || savingChecks) return;'), 'verification checklist mutations are blocked for read-only and in-flight saves');
ok(guided.includes('const saved = await persist({ verify_checks: next });'), 'verification checklist waits for canonical progress persistence');
before(guided, 'const saved = await persist({ verify_checks: next });', 'setChecks(saved.verify_checks || next)', 'verification checklist updates locally only after a confirmed save');
ok(guided.includes("if (saved?.id) setChecks(saved.verify_checks || next)"), 'failed verification saves never unlock local completion');
ok(guided.includes("if (readOnly) {\n      setActionError('Your access is read-only."), 'mark-done handler rejects read-only callers before any write');
ok(verifyStep.includes('disabled={readOnly || savingChecks}'), 'read-only and saving checkboxes are disabled');
ok(verifyStep.includes('disabled={readOnly || saving || savingChecks'), 'finish action is blocked until checklist persistence settles');
ok(verifyStep.includes("'Read-only access'"), 'verify step explains read-only access in plain language');

const filenamePlan = buildEvidenceFilePlan({
  organization: { legal_name: 'Acme Defense' },
  project: { implementation_stack: 'Microsoft 365 E5' },
  libEntry: { control_id: 'AC.L2-3.1.1', control_title: 'Authorized Access Control' },
  variant: {
    where_to_go: { name: 'Microsoft Entra ID' },
    screenshot_instructions: 'Capture the Conditional Access policy',
  },
  controlType: 'Screenshot',
  date: '2026-08-10',
});
ok(
  filenamePlan.baseName === 'Acme_Defense_Screenshot_AC.L2-3.1.1_EntraID_Authorized_Access_Control_Evidence_2026-08-10',
  'canonical guided filename uses CompanyName_ControlType_CONTROLID_ToolName_Description_YYYY-MM-DD',
);
ok(filenamePlan.tool === 'EntraID' && filenamePlan.description === 'Authorized_Access_Control_Evidence', 'filename plan exposes neutral backend naming inputs');
ok(!/kipuka/i.test(filenamePlan.baseName), 'customer evidence filename excludes platform branding');

const captureItems = buildCaptureItems({
  screenshot_instructions: '1. Kipuka mobile device inventory\n2. Conditional Access grant controls\n3. Allowed and blocked tests',
}, { control_id: 'AC.L2-3.1.18' });
ok(captureItems.length === 3, 'capture instructions become separate proof items');
ok(captureItems.every((item) => item.title && item.instructions), 'every capture item explains both the artifact and required visible proof');
ok(!/kipuka/i.test(JSON.stringify(captureItems)), 'capture instructions exclude platform branding');
ok(CAPTURE_SAFETY_NOTE.includes('private keys') && CAPTURE_SAFETY_NOTE.includes('full CUI content'), 'capture step warns against collecting secrets and unnecessary CUI');

const neutralPolicyNames = buildPolicyNames({
  organization: { legal_name: 'Acme Defense' },
  project: { implementation_stack: 'Hybrid/Other' },
  libEntry: { control_id: 'AC.L2-3.1.18', control_title: 'Mobile Device Connection' },
  variant: {
    where_to_go: { name: 'Kipuka project workspace' },
    policy_names: [{ label: 'Kipuka Mobile Policy', policy_type: 'KipukaMobilePolicy', location: 'Kipuka' }],
  },
  date: '2026-08-10',
});
ok(neutralPolicyNames.length === 1 && !/kipuka/i.test(JSON.stringify(neutralPolicyNames)), 'customer policy names exclude platform branding');

const approved = {
  status: 'Not Applicable',
  not_applicable_request_id: 'req-1',
  not_applicable_request_status: 'Approved',
  not_applicable_decision_sha256: 'a'.repeat(64),
  not_applicable_justification: 'The capability does not exist in the documented boundary.',
  not_applicable_scope_evidence: 'SSP section 2 and network diagram revision 4.',
  not_applicable_confirmed_by: 'Independent Reviewer',
  not_applicable_confirmed_date: '2026-08-10',
  not_applicable_approved_by_email: 'reviewer@example.test',
  not_applicable_approved_date: '2026-08-10T12:00:00Z',
};
ok(validNotApplicable(approved) === true, 'approved hash-backed N/A is valid');
ok(validNotApplicable({ ...approved, not_applicable_request_status: 'Pending Review' }) === false, 'pending N/A is invalid');
ok(validNotApplicable({ ...approved, not_applicable_decision_sha256: '' }) === false, 'unhashed N/A is invalid');
ok(validNotApplicable({ ...approved, not_applicable_request_id: '' }) === false, 'N/A without request identity is invalid');
const simpleStatus = read('src/lib/simpleStatus.js');
const doNext = read('src/lib/doNextEngine.js');
ok(simpleStatus.includes("assessment && validNotApplicable(assessment)"), 'approved N/A requires the full assessment decision');
ok(simpleStatus.includes("realStatus === 'Not Applicable'"), 'N/A has an explicit display branch');
ok(simpleStatus.includes('SIMPLE_STATUS.IN_PROGRESS'), 'unapproved N/A displays In Progress');
ok(doNext.includes('isSimpleDone(it.assessment || it.status)'), 'do-next evaluates the complete assessment');
ok(!doNext.includes('isSimpleDone(it.status)'), 'do-next never grants N/A completion from status alone');

if (failures.length) {
  console.error('Phase 6A applicability gate failed: ' + passed + ' passed, ' + failures.length + ' failed');
  failures.forEach((failure) => console.error(' - ' + failure));
  process.exit(1);
}
console.log('Phase 6A applicability gate passed: ' + passed + '/' + passed);
