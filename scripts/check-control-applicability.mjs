import fs from 'node:fs';
import path from 'node:path';
import { validNotApplicable } from '../src/lib/canonicalReadiness.js';

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
before(fn, "const finalRequest = await sr.entities.ControlApplicabilityRequest.update", "status: 'Not Applicable'", 'request decision is saved before N/A status');
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
ok(client.includes("WRITE_METHODS.has(method) && entityName === 'ControlAssessment'"), 'all platform roles service-route assessment writes');
ok(client.indexOf("entityName === 'ControlAssessment'") < client.indexOf("role !== 'client'"), 'assessment routing happens before staff direct-write bypass');

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
