import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
let passed = 0;
const failures = [];
function ok(condition, message) {
  if (condition) passed += 1;
  else failures.push(message);
}
function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function jsonc(rel) {
  return JSON.parse(read(rel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, ''));
}
function before(source, first, second, message) {
  const a = source.indexOf(first);
  const b = source.indexOf(second);
  ok(a >= 0 && b >= 0 && a < b, message);
}

const evidence = jsonc('base44/entities/ProjectEvidence.jsonc');
const event = jsonc('base44/entities/ProjectEvidenceEvent.jsonc');
ok(evidence.name === 'ProjectEvidence', 'canonical evidence schema exists');
ok(evidence.rls?.write?.user_condition?.role === '__service_only__', 'evidence writes are service-only');
ok(event.rls?.write?.user_condition?.role === '__service_only__', 'evidence events are service-only');
for (const field of [
  'organization_id', 'project_id', 'control_ids', 'objective_ids', 'file_uri',
  'original_file_name', 'hash_value', 'hash_verified_date', 'metadata_sha256',
  'uploaded_by_user_id', 'reviewer_user_id', 'retention_until', 'provenance_type',
  'version', 'supersedes_evidence_id', 'superseded_by_evidence_id',
  'last_transition_id', 'last_transition_from_status', 'last_transition_to_status',
]) ok(Boolean(evidence.properties[field]), `evidence schema has ${field}`);
for (const field of ['transition_id', 'actor_user_id', 'evidence_sha256', 'metadata_sha256', 'event_sha256']) {
  ok(Boolean(event.properties[field]), `event schema has ${field}`);
}
ok(event.properties.action.enum.includes('Downloaded'), 'downloads are audited');
ok(event.properties.action.enum.includes('Superseded'), 'supersession is audited');

const fn = read('base44/functions/manageProjectEvidence/entry.ts');
before(fn, 'base44.auth.me()', 'base44.asServiceRole', 'authentication precedes service-role use');
before(fn, 'OrganizationUser.filter', 'Project.get', 'membership resolution precedes project reads');
ok(fn.includes("const ACTIONS = ['create', 'new_version', 'submit_review', 'accept', 'reject', 'archive', 'expire', 'update_quality', 'download']"), 'action allowlist is explicit');
ok(fn.includes('Unexpected fields:'), 'unknown input fields fail closed');
ok(fn.includes('callerOrg') && fn.includes('project.organization_id !== callerOrg'), 'project tenant ownership is enforced');
ok(fn.includes('evidence.organization_id !== callerOrg'), 'evidence tenant ownership is enforced');
ok(fn.includes('prior.organization_id !== callerOrg'), 'idempotency cannot disclose another tenant');
ok(fn.includes("redirect: 'manual'") && fn.includes('isPrivateHost'), 'staging redirects are bounded against SSRF');
ok(fn.includes('expectedPrefix') && fn.includes('base44.app'), 'only this app public staging path is accepted');
before(fn, 'fileHash = await sha256Hex', 'UploadPrivateFile', 'file is hashed before private upload');
before(fn, 'const uploaded = await sr.integrations.Core.UploadPrivateFile', 'await fetchVerifiedPrivate(sr, fileUri, fileHash)', 'private upload is round-trip verified');
ok(fn.includes("startsWith('mp/private/')"), 'canonical evidence must use private storage');
ok(fn.includes("hash_algorithm: 'SHA-256'"), 'SHA-256 is pinned');
ok(fn.includes("review_status: 'Draft'"), 'new evidence is always Draft');
ok(!/review_status:\s*cleanText\(body/.test(fn), 'client cannot choose review status');
ok(fn.includes("status: 'Not Assessed'"), 'objective links never auto-credit a finding');
ok(!/status:\s*['"]Met['"]/.test(fn), 'evidence ingestion never creates MET findings');
ok(fn.includes('objective.objective_id === id && controlIds.includes(objective.control_id)'), 'objective IDs are resolved by selected control and ID');
ok(fn.includes('missing or ambiguous for the selected evidence controls'), 'ambiguous cross-level objective IDs fail closed');
ok(fn.includes('review_status: \'Superseded\'') && fn.includes('superseded_by_evidence_id'), 'new versions supersede prior records');
ok(fn.includes("'supersede', prior.review_status") && fn.includes("'Superseded'"), 'supersession writes an audit event');
ok(fn.includes('audit_recovered: true'), 'idempotent retry can recover a missing audit event');
ok(fn.includes("fromStatus !== 'Needs Review'"), 'accept/reject cannot skip review');
ok(fn.includes('Reviewer separation required'), 'self-review separation is enforced');
ok(fn.includes('SELF_REVIEW_ROLES'), 'self-review exceptions are explicit');
ok(fn.includes('Complete every evidence quality check before acceptance'), 'all quality gates are required');
ok(fn.includes('Expired evidence cannot be accepted'), 'expired evidence cannot be accepted');
ok(fn.includes('retention-until date is required before acceptance'), 'retention is required before acceptance');
ok(fn.includes('Evidence metadata hash mismatch'), 'metadata integrity is checked at acceptance');
ok(fn.includes('fetchVerifiedPrivate(sr, evidence.file_uri, evidence.hash_value)'), 'file bytes are reverified for lifecycle actions');
ok(fn.includes('CreateFileSignedUrl') && fn.includes("'download'"), 'downloads use signed private URLs');
ok(fn.includes('cannot be archived without a retention-until date'), 'missing retention prevents archive');
ok(fn.includes('cannot be archived before its retention-until date'), 'retention prevents premature archive');
ok(fn.includes('event_sha256'), 'audit events are hash-backed');

const upload = read('src/components/project/evidence/EvidenceUploadModal.jsx');
const card = read('src/components/project/evidence/EvidenceCard.jsx');
const module = read('src/components/project/evidence/EvidenceModule.jsx');
const sprs = read('src/components/project/sprs/SprsModule.jsx');
const client = [upload, card, module, sprs].join('\n');
ok(!/ProjectEvidence\.(?:create|update|delete)\s*\(/.test(client), 'evidence UI has no direct entity writes');
ok(!/Review Status/.test(upload), 'upload UI cannot select review status');
ok(upload.includes("functions.invoke('manageProjectEvidence'"), 'upload routes through evidence backend');
ok(upload.includes("existing ? 'new_version' : 'create'"), 'edits create immutable new versions');
ok(upload.includes('objective_ids') && upload.includes('Link Assessment Objectives'), 'upload UI supports objective mapping');
ok(upload.includes('retention_until') && upload.includes('provenance_type'), 'upload captures retention and provenance');
ok(upload.includes('Retain Until is required for canonical evidence.'), 'draft save requires a retention date');
ok(card.includes('Boolean(item.retention_until)'), 'archive UI fails closed when retention is missing');
ok(card.includes("transition('submit_review')"), 'card exposes submit-for-review transition');
ok(card.includes("transition('accept')") && card.includes("transition('reject')"), 'card exposes reviewer decisions');
ok(card.includes("transition('download')"), 'card uses verified download transition');
ok(!card.includes('href={item.file_url}'), 'card never opens a legacy public URL');
ok(!module.includes('onDelete'), 'vault removes destructive delete behavior');
ok(sprs.includes("functions.invoke('manageProjectEvidence'"), 'SPRS uploads use canonical evidence ingestion');
ok(!sprs.includes('ProjectEvidence.create'), 'SPRS cannot bypass evidence backend');

const readGate = read('base44/functions/orgScopedData/entry.ts');
const writeGate = read('base44/functions/orgScopedWrite/entry.ts');
const orgData = read('src/api/orgData.js');
ok(readGate.includes("'ProjectEvidenceEvent'"), 'client event reads are organization-scoped');
ok(orgData.includes("'ProjectEvidenceEvent'"), 'client data layer exposes scoped events');
ok(!/WRITE_WHITELIST[\s\S]*?'ProjectEvidence'/.test(writeGate), 'generic client write gate cannot mutate evidence');
const writeBlock = orgData.slice(orgData.indexOf('export const WRITE_GATED'), orgData.indexOf('async function readGate'));
ok(!writeBlock.includes("'ProjectEvidence'"), 'client proxy cannot route evidence through generic writes');

const cleanup = read('base44/functions/reconcileFulcrumAssessmentDrift/entry.ts');
before(cleanup, 'base44.auth.me()', 'base44.asServiceRole', 'Fulcrum reconciliation authenticates before service-role use');
ok(cleanup.includes("caller.role !== 'admin'"), 'Fulcrum reconciliation is platform-admin only');
ok(cleanup.includes("body.mode === 'apply' ? 'apply' : 'dry_run'"), 'Fulcrum reconciliation defaults to dry run');
ok(cleanup.includes("const CONFIRMATION = 'DELETE_EXACT_ARCHIVED_FULCRUM_STRAY'"), 'Fulcrum reconciliation requires the exact confirmation token');
ok(cleanup.includes("projectRows.length === 111") && cleanup.includes("level2.length === 110") && cleanup.includes("level1.length === 1"), 'Fulcrum reconciliation pins the exact pre-delete counts');
ok(cleanup.includes('archivePayloadHash === EXPECTED_HASH'), 'Fulcrum reconciliation re-hashes the archive payload');
ok(cleanup.includes('service.entities.ControlAssessment.delete(TARGET_ID)'), 'Fulcrum reconciliation deletes only the pinned target ID');
ok(cleanup.includes("remaining.length !== 110") && cleanup.includes("remainingLevel2.length !== 110") && cleanup.includes("remainingLevel1.length !== 0"), 'Fulcrum reconciliation verifies exact post-delete counts');
const documentLibrary = read('src/pages/DocumentLibrary.jsx');
ok(!documentLibrary.includes('runVerifiedFulcrumCleanup'), 'temporary Fulcrum maintenance control is absent from the customer UI');

if (failures.length) {
  console.error(`Canonical evidence gate failed: ${passed} passed, ${failures.length} failed`);
  failures.forEach((failure) => console.error(` - ${failure}`));
  process.exit(1);
}
console.log(`Canonical evidence gate passed: ${passed}/${passed}`);
