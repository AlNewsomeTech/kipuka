#!/usr/bin/env node
/**
 * check-canonical-project-migration.mjs
 *
 * Dependency-free static verification of the Phase 3A canonical project data
 * migration foundation. Runs no migration, performs no network or database
 * access, and never mutates anything. It verifies the two migration entity
 * schemas and statically analyses the migration function for the security,
 * ordering, recoverability and post-validation invariants Phase 3A requires.
 *
 * Usage: npm run test:canonical-migration
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const MIGRATION_KEY = 'CANONICAL-PROJECT-MODEL-V1-2026-07-30';
const DATASET_KEY = 'CMMC-2.13-SP800-171R2-2024-09';
const PROJECT_IDS = [
  '6a505da6e1c8ff007cb7893e',
  '6a4fec777e48d8608af9d0cc',
  '6a4ab2a10db4259fef487a91',
  '6a4875fc85842b32d494172c',
];
const TOUCHED = [
  'ControlAssessment', 'GuidedProgress', 'MockAssessmentObjective',
  'ProjectEvidence', 'ProjectPOAM', 'SSPControlStatement',
  'ToolControlMapping', 'PolicyTemplate',
];
const FORBIDDEN = [
  'ControlLibrary', 'AssessmentObjectiveLibrary', 'ComplianceDatasetVersion',
  'Project', 'Organization', 'ControlProgress', 'Client', 'Screenshot',
  'POAMItem', 'DeploymentTask', 'GeneratedDocument',
];

const FN_PATH = 'base44/functions/migrateCanonicalProjectModel/entry.ts';
const ARCHIVE_PATH = 'base44/entities/MigrationArchive.jsonc';
const RUN_PATH = 'base44/entities/DataMigrationRun.jsonc';

let failures = 0;
let checks = 0;

function ok(name) {
  checks++;
  console.log(`  PASS  ${name}`);
}
function bad(name, detail) {
  checks++;
  failures++;
  console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
}
function assert(cond, name, detail) {
  if (cond) ok(name);
  else bad(name, detail);
}
function section(title) {
  console.log(`\n${title}`);
}

function read(rel) {
  try {
    return readFileSync(join(ROOT, rel), 'utf8');
  } catch (err) {
    bad(`read ${rel}`, err.message);
    return '';
  }
}

function readJson(rel) {
  const raw = read(rel);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    bad(`parse ${rel}`, err.message);
    return null;
  }
}

/** Strip line and block comments so ordering checks never match commentary. */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const idx = (src, needle) => src.indexOf(needle);
const has = (src, needle) => src.includes(needle);
const count = (src, re) => (src.match(re) || []).length;

/** Ordering helper: every needle must appear, in the given order. */
function ordered(src, needles) {
  let cursor = -1;
  for (const needle of needles) {
    const at = src.indexOf(needle, cursor + 1);
    if (at === -1) return `missing "${needle}"`;
    if (at <= cursor) return `"${needle}" is out of order`;
    cursor = at;
  }
  return null;
}

function adminOnlyRls(rls) {
  if (!rls || typeof rls !== 'object') return false;
  const isAdminOnly = (rule) =>
    !!rule && typeof rule === 'object' &&
    JSON.stringify(rule) === JSON.stringify({ user_condition: { role: 'admin' } });
  return isAdminOnly(rls.read) && isAdminOnly(rls.write);
}

// ===========================================================================
// 1. MigrationArchive schema
// ===========================================================================
section('MigrationArchive schema');
const archive = readJson(ARCHIVE_PATH);
if (archive) {
  assert(archive.name === 'MigrationArchive', 'entity name is MigrationArchive');
  assert(archive.type === 'object', 'entity type is object');
  const desc = String(archive.description || '').toLowerCase();
  assert(
    desc.includes('recoverable') && desc.includes('pre-migration') && desc.includes('snapshot'),
    'description states it holds recoverable pre-migration snapshots',
  );
  const p = archive.properties || {};
  for (const field of [
    'migration_key', 'entity_name', 'source_record_id', 'organization_id',
    'project_id', 'reason', 'payload', 'content_sha256', 'archived_at', 'archived_by',
  ]) {
    assert(!!p[field], `property ${field} exists`);
  }
  assert(p.payload?.type === 'object', 'payload is an object');
  assert(p.archived_at?.format === 'date-time', 'archived_at is date-time');
  assert(
    JSON.stringify(p.reason?.enum) === JSON.stringify(['Snapshot', 'Updated', 'Deleted', 'Deduplicated']),
    'reason enum is Snapshot, Updated, Deleted, Deduplicated',
  );
  const required = archive.required || [];
  const wantRequired = ['migration_key', 'entity_name', 'source_record_id', 'reason', 'payload', 'content_sha256'];
  assert(
    wantRequired.every((f) => required.includes(f)) && required.length === wantRequired.length,
    'required fields are exactly the six mandated fields',
    JSON.stringify(required),
  );
  assert(adminOnlyRls(archive.rls), 'RLS is admin-only for read and write (no public or technician access)');
}

// ===========================================================================
// 2. DataMigrationRun schema
// ===========================================================================
section('DataMigrationRun schema');
const run = readJson(RUN_PATH);
if (run) {
  assert(run.name === 'DataMigrationRun', 'entity name is DataMigrationRun');
  const p = run.properties || {};
  for (const field of [
    'migration_key', 'status', 'dataset_key', 'before_counts', 'planned_counts',
    'after_counts', 'source_snapshot_sha256', 'validation_notes', 'error_details',
    'applied_at', 'applied_by',
  ]) {
    assert(!!p[field], `property ${field} exists`);
  }
  assert(
    JSON.stringify(p.status?.enum) === JSON.stringify(['Draft', 'Validated', 'Applying', 'Applied', 'Failed']),
    'status enum is Draft, Validated, Applying, Applied, Failed',
  );
  for (const objField of ['before_counts', 'planned_counts', 'after_counts']) {
    assert(p[objField]?.type === 'object', `${objField} is an object`);
  }
  assert(p.applied_at?.format === 'date-time', 'applied_at is date-time');
  const required = run.required || [];
  assert(
    JSON.stringify([...required].sort()) === JSON.stringify(['dataset_key', 'migration_key', 'status']),
    'required fields are exactly migration_key, status, dataset_key',
    JSON.stringify(required),
  );
  assert(adminOnlyRls(run.rls), 'RLS is admin-only for read and write');
}

// ===========================================================================
// 3. Migration function — keys, auth, ordering
// ===========================================================================
section('Migration function — keys and authorization');
const rawFn = read(FN_PATH);
const fn = stripComments(rawFn);

assert(has(fn, `const MIGRATION_KEY = '${MIGRATION_KEY}'`), 'migration key is exact');
assert(has(fn, `const DATASET_KEY = '${DATASET_KEY}'`), 'dataset key is exact');
assert(count(fn, /CANONICAL-PROJECT-MODEL-V1-2026-07-30/g) >= 1, 'migration key literal present');

const handlerAt = idx(fn, 'Deno.serve(');
assert(handlerAt > -1, 'exports a Deno.serve handler');
const handler = handlerAt > -1 ? fn.slice(handlerAt) : '';

assert(
  ordered(handler, ['base44.auth.me()', "user.role !== 'admin'", 'asServiceRole']) === null,
  'auth.me() runs first, then the exact admin role check, before any service-role access',
  ordered(handler, ['base44.auth.me()', "user.role !== 'admin'", 'asServiceRole']),
);
assert(has(handler, 'status: 401'), 'unauthenticated callers get 401');
assert(has(handler, 'status: 403'), 'non-admin callers get 403');
assert(
  !/asServiceRole|readAll\(/.test(handler.slice(0, idx(handler, "user.role !== 'admin'"))),
  'no fetch or service-role access happens before the admin check',
);

section('Migration function — request contract');
assert(
  has(handler, "mode !== 'dry_run' && mode !== 'apply'"),
  'mode must be exactly dry_run or apply',
);
assert(has(handler, 'datasetKey !== DATASET_KEY'), 'dataset_key must equal the exact dataset key');
assert(has(handler, 'status: 400'), 'invalid mode / dataset_key returns 400');

// ===========================================================================
// 4. Dry run performs zero writes and blocks apply on failure
// ===========================================================================
section('Dry run semantics');
const dryAt = idx(handler, "if (mode === 'dry_run')");
assert(dryAt > -1, 'dry_run branch exists');
const dryBlockEnd = idx(handler, 'if (plan.errors.length > 0) {');
const dryBlock = dryAt > -1 && dryBlockEnd > dryAt ? handler.slice(dryAt, dryBlockEnd) : '';
assert(dryBlock.length > 0, 'dry_run branch is bounded by the apply precondition gate');
assert(has(dryBlock, 'writes_performed: 0'), 'dry run returns writes_performed: 0');
assert(
  !/\.(create|update|delete|bulkCreate|bulkUpdate|deleteMany|updateMany)\s*\(/.test(dryBlock),
  'dry run branch contains no create/update/delete calls',
);
const preDry = handler.slice(0, dryAt > -1 ? dryAt : 0);
assert(
  !/\.(create|update|delete|bulkCreate|bulkUpdate|deleteMany|updateMany)\s*\(/.test(preDry),
  'no write happens before the dry_run branch returns',
);
assert(has(dryBlock, 'status') && has(dryBlock, '422'), 'dry run returns 422 when validation fails');
assert(
  has(handler, "error: 'Preconditions failed. Nothing was written.'") && has(handler, 'status: 422'),
  'apply is blocked with 422 when the plan reports validation errors',
);
assert(
  has(dryBlock, 'unmappable_references') && has(fn, 'unmappable non-All control reference'),
  'unmappable non-All references are reported and block apply',
);

// ===========================================================================
// 5. Preconditions and 466 -> 440 arithmetic
// ===========================================================================
section('Preconditions and arithmetic');
for (const id of PROJECT_IDS) {
  assert(has(fn, id), `expected project ${id} is asserted`);
}
assert(has(fn, 'const EXPECTED_PROJECT_COUNT = 4'), 'exactly 4 valid projects expected');
assert(has(fn, 'const EXPECTED_CONTROL_ASSESSMENT_TOTAL = 466'), 'pre-state total 466 asserted');
assert(has(fn, 'const CANONICAL_CONTROL_ASSESSMENT_TOTAL = 440'), 'canonical total 440 asserted');
assert(has(fn, 'const CANONICAL_PER_PROJECT = 110'), 'canonical per-project total 110 asserted');
assert(4 * 110 === 440, '4 projects x 110 controls = 440 rows');
assert(has(fn, 'const EXPECTED_ACTIVE_LIBRARY_TOTAL = 125'), '125 active authoritative library rows asserted');
assert(has(fn, 'const EXPECTED_ACTIVE_L1 = 15'), '15 active Level 1 rows asserted');
assert(has(fn, 'const EXPECTED_ACTIVE_L2 = 110'), '110 active Level 2 rows asserted');
assert(has(fn, 'const EXPECTED_LIBRARY_TOTAL = 235'), '235 total library rows asserted');
assert(has(fn, 'const EXPECTED_LEGACY_INACTIVE = 110'), '110 inactive legacy rows asserted');
assert(has(fn, 'const EXPECTED_OBJECTIVE_LIBRARY_TOTAL = 379'), '379 objective library rows asserted');
assert(has(fn, 'const EXPECTED_DATASET_VERSION_TOTAL = 1'), '1 dataset version asserted');
assert(
  has(fn, 'unique Level 2 source_requirement_id mappings'),
  '110 unique Level 2 source_requirement_id mappings validated',
);
assert(
  has(fn, "target_cmmc_level !== 'Level 2'"),
  'all four projects are validated as target_cmmc_level Level 2',
);
assert(has(fn, 'canonicalAlready'), 'already-applied canonical state is accepted as an alternative pre-state');

// ===========================================================================
// 6. Mapping rules — active library only, never "All"
// ===========================================================================
section('Mapping rules');
assert(has(fn, "const ALL_CONTROL_ID = 'All'"), 'All sentinel is a named constant');
assert(
  has(fn, "if (!id || id === ALL_CONTROL_ID) return []"),
  'the resolver never maps control_id All to a target',
);
assert(
  count(fn, /=== ALL_CONTROL_ID/g) >= 4,
  'All rows are explicitly excluded across assessment and reference planning',
);
assert(
  has(fn, "r.active === true && r.dataset_key === DATASET_KEY"),
  'only active authoritative dataset rows are used as mapping targets',
);
assert(
  has(fn, 'crosswalk_requirement_ids') && has(fn, 'source_requirement_id'),
  'mapping resolves through the numeric NIST requirement crosswalk',
);
assert(has(fn, 'function numericFromControlId'), 'numeric requirement extraction is implemented');
assert(has(fn, 'toActiveAny'), 'projectless PolicyTemplate refs expand across active Level 1 and Level 2');

// ===========================================================================
// 7. Conservative Level 1 -> Level 2 downgrade rules
// ===========================================================================
section('Conservative downgrade rules');
assert(
  has(fn, "priorStatus === 'Not Started' ? 'Not Started' : 'Needs Review'"),
  'Not Started is kept, every other prior status becomes Needs Review',
);
assert(
  has(fn, "priorEvidence === 'No Evidence' ? 'No Evidence' : 'Needs Better Evidence'"),
  'No Evidence is kept, every other prior evidence status becomes Needs Better Evidence',
);
assert(
  has(fn, 'carried.pacsec_internal_notes') && has(fn, 'prior status') && has(fn, 'prior evidence_status'),
  'a dated migration note records the prior control_id, status and evidence_status',
);
assert(has(fn, 'function lessReadyStatus') && has(fn, 'function lessReadyEvidence'), 'conflicting claims resolve to the less-ready value');
assert(has(fn, 'function mergeRecords') && has(fn, 'function mergeField'), 'duplicate targets are conservatively merged');
assert(
  has(fn, 'not_applicable') || has(fn, 'isBlank(a)) return b'),
  'nonblank narrative, owner, notes and N/A support survive merges',
);
assert(
  has(fn, "status: 'Not Started'") && has(fn, "evidence_status: 'No Evidence'") && has(fn, "risk_rating: 'Moderate'"),
  'missing requirements are created Not Started / No Evidence / Moderate',
);
assert(has(fn, 'SYSTEM_FIELDS'), 'system fields are excluded from carried content');
assert(has(fn, 'LIBRARY_OWNED_FIELDS'), 'library/project owned fields are replaced, not carried');

// ===========================================================================
// 8. Archive before delete, hash verification, resume, idempotence
// ===========================================================================
section('Recoverability, archive-before-delete and idempotence');
// Code-only anchors — comments are stripped, so this proves real execution order.
const orderErr = ordered(handler, [
  'toArchive.push(',
  "bulkCreate(svc.MigrationArchive, 'MigrationArchive', toArchive)",
  'Archive hash mismatch',
  "status: 'Validated'",
  "status: 'Applying'",
  'await deleteVerified(',
]);
assert(orderErr === null, 'archives are created and hash-verified before any mutation or delete', orderErr);
assert(
  has(fn, 'Refusing to delete') && has(fn, 'without a hash-verified archive snapshot'),
  'deletion is refused without a hash-verified archive snapshot',
);
assert(
  count(fn, /\.delete\(/g) === 0 &&
  count(fn, /\.deleteMany\(/g) === 1 &&
  has(handler, 'svc[entityName].deleteMany({ id: { $in: batchIds } })'),
  'the only delete operation is exact-id deleteMany inside the archive-verified deletion path',
);
assert(
  has(handler, 'batchIds.length > BULK_BATCH') &&
  count(handler, /\{ id: \{ \$in: batchIds \} \}/g) >= 3,
  'archive-verified deletes are batched at the <=500 limit and verified by post-delete reads',
);
assert(!/MigrationArchive\.delete|MigrationArchive[^\n]*deleteMany/.test(fn), 'archive records are never deleted');
assert(
  has(fn, 'archiveKeyOf') && has(fn, '`${MIGRATION_KEY}|${entityName}|${sourceRecordId}`'),
  'archive key is migration_key|entity_name|source_record_id',
);
assert(has(fn, 'Duplicate archive key'), 'duplicate archive keys abort before mutation');
assert(has(fn, 'Missing archive snapshot'), 'a missing snapshot aborts before mutation');
assert(
  has(fn, 'async function sha256Hex') && has(fn, 'function stableSerialize'),
  'content hashes are computed from a deterministic serialization',
);
assert(
  has(fn, '[...sourceAssessments].sort') && !has(fn, 'sourceAssessments.map((r: any) => ({ id: r.id'),
  'source snapshot hash covers every field of every source assessment in deterministic order',
);
assert(
  has(handler, 'expectedContentHash') && has(handler, 'archivedPayloadHash') &&
  has(handler, 'a.content_sha256 !== expectedContentHash || archivedPayloadHash !== expectedContentHash'),
  'archive hash is compared to the original live payload and the stored archive payload',
);
assert(
  has(handler, 'resumeSources') && has(fn, 'buildPlan(base44, resumeSources)'),
  'a resumed run rebuilds the plan from archived original payloads',
);
assert(
  has(fn, 'list.push(a.payload)'),
  'resume reads archived payloads rather than partially changed live rows',
);
assert(
  has(handler, "filter(\n            { id: { $in: batchIds } }, 'created_date', BULK_BATCH, 0,") &&
  has(handler, 'if (remaining.length > 0)'),
  'resume treats already-deleted hash-verified rows as idempotent and fails if any exact ids remain',
);
assert(
  has(handler, 'if (!plan.canonicalAlready)') &&
  ordered(handler, ['if (!plan.canonicalAlready)', "deleteVerified('ControlAssessment'", "bulkCreate(svc.ControlAssessment, 'ControlAssessment', canonicalRows)"]) === null,
  'resume preserves an already-canonical assessment set and continues reference work',
);
assert(
  has(handler, "priorRun?.status === 'Applied'") && has(handler, 'idempotent_no_op: true'),
  'an already-applied run verifies the canonical post-state and returns a no-op',
);
const statusOrder = ordered(handler, ["status: 'Validated'", "status: 'Applying'", "status: 'Applied'"]);
assert(statusOrder === null, 'run status advances Validated -> Applying -> Applied', statusOrder);
assert(
  idx(handler, "status: 'Applied'") > idx(handler, 'await postValidate(base44, plan)'),
  'Applied is only set after complete post-validation',
);
assert(has(handler, "status: 'Failed'"), 'a failed post-validation marks the run Failed');

// ===========================================================================
// 9. Page and bulk limits
// ===========================================================================
section('Page and bulk limits');
assert(has(fn, 'const PAGE_SIZE = 500'), 'page size is 500');
assert(has(fn, 'const BULK_BATCH = 500'), 'bulk batch size is 500');
assert(has(fn, "throw new Error('Batch limit exceeded.')"), 'oversized batches are refused');
// Numeric literals only — string literals (keys, ids, messages) are blanked out.
const codeOnly = fn
  .replace(/'[^']*'/g, "''")
  .replace(/"[^"]*"/g, '""')
  .replace(/`[^`]*`/g, '``');
const bigNumbers = (codeOnly.match(/\b\d{3,}\b/g) || [])
  .map(Number)
  .filter((n) => n > 500);
assert(bigNumbers.length === 0, 'no page or batch literal exceeds 500', bigNumbers.join(', '));
assert(
  has(fn, 'Critical read failure') && has(fn, 'Critical write failure'),
  'critical read and write failures throw and are never swallowed as []',
);
assert(!/catch\s*\([^)]*\)\s*\{\s*return\s*\[\]/.test(fn), 'no catch block swallows a read into an empty array');

// ===========================================================================
// 10. Post-validation invariants (mutation resistant)
// ===========================================================================
section('Post-validation invariants');
const pvAt = idx(fn, 'async function postValidate');
assert(pvAt > -1, 'postValidate exists');
const pvEnd = idx(fn, 'Deno.serve(');
const pv = pvAt > -1 ? fn.slice(pvAt, pvEnd > pvAt ? pvEnd : fn.length) : '';

// (a) ControlAssessment post-validation
assert(has(pv, 'CANONICAL_CONTROL_ASSESSMENT_TOTAL'), 'post-validation proves the 440 row total');
assert(has(pv, 'CANONICAL_PER_PROJECT'), 'post-validation proves 110 rows per valid project');
assert(has(pv, "row.control_id === ALL_CONTROL_ID"), 'post-validation proves no All rows remain');
assert(has(pv, "row.cmmc_level !== 'Level 2'"), 'post-validation proves every row is Level 2');
assert(has(pv, 'Duplicate ControlAssessment for'), 'post-validation proves unique project_id|control_id');
assert(has(pv, 'validProjectIds.has'), 'post-validation proves no invalid project IDs');
assert(
  has(pv, 'control_title !== lib.control_title') && has(pv, 'domain !== lib.domain'),
  'post-validation proves control_id/title/domain match the authoritative library',
);

// (b) Reference post-validation must exist INDEPENDENTLY of (a)
assert(has(pv, 'const checkRef ='), 'a reference validator exists');
const refEntities = ['GuidedProgress', 'MockAssessmentObjective', 'ProjectEvidence', 'ProjectPOAM', 'ToolControlMapping', 'SSPControlStatement'];
for (const entity of refEntities) {
  assert(
    new RegExp(`checkRef\\('${entity}'`).test(pv),
    `post-validation checks ${entity} references`,
  );
}
assert(
  count(pv, /checkRef\('/g) >= 6,
  'at least six reference entities are independently post-validated',
);
assert(has(pv, 'still references control_id All'), 'reference post-validation rejects lingering All references');
assert(has(pv, 'references non-authoritative control'), 'reference post-validation rejects non-authoritative IDs');
assert(has(pv, 'references an invalid project_id'), 'reference post-validation rejects invalid project IDs');

// (c) SSP, PolicyTemplate, untouched data, evidence payload preservation
assert(
  has(pv, 'Duplicate SSPControlStatement for') && has(pv, 'unique rows, expected'),
  'post-validation proves exactly 110 unique SSP statements per project',
);
assert(
  has(fn, 'sspOwningProjectIds') && has(fn, 'plans ${plannedUnique} unique rows') &&
  has(pv, 'for (const pid of plan.sspOwningProjectIds)'),
  'SSP 110-row ownership invariant is enforced before mutation and after apply, including a missing entire set',
);
assert(has(pv, 'activeAnyIds.has(id)'), 'projectless PolicyTemplate refs must be active authoritative L1/L2 IDs');
assert(has(pv, 'Project count changed'), 'post-validation proves Project stays at 4');
assert(
  has(pv, 'ControlLibrary total changed') && has(pv, 'Active authoritative ControlLibrary changed') &&
  has(pv, 'Inactive legacy ControlLibrary changed'),
  'post-validation proves ControlLibrary 235 / 125 active / 110 inactive',
);
assert(has(pv, 'AssessmentObjectiveLibrary changed'), 'post-validation proves 379 objective rows');
assert(has(pv, 'ComplianceDatasetVersion changed'), 'post-validation proves 1 dataset version');
assert(
  has(pv, 'was not preserved') && has(pv, "k === 'control_ids'"),
  'post-validation proves unmapped ProjectEvidence fields (including file URLs) are preserved',
);

// ===========================================================================
// 11. Touched-entity allowlist and forbidden-entity absence
// ===========================================================================
section('Entity allowlist and forbidden writes');
const touchedBlock = fn.slice(idx(fn, 'const TOUCHED_ENTITIES'), idx(fn, 'const FORBIDDEN_ENTITIES'));
for (const entity of TOUCHED) {
  assert(has(touchedBlock, `'${entity}'`), `${entity} is on the touched allowlist`);
}
assert(count(touchedBlock, /'/g) / 2 === TOUCHED.length, 'the allowlist contains exactly the eight touched entities');
const forbiddenBlock = fn.slice(idx(fn, 'const FORBIDDEN_ENTITIES'), idx(fn, 'const SYSTEM_FIELDS'));
for (const entity of FORBIDDEN) {
  assert(has(forbiddenBlock, `'${entity}'`), `${entity} is declared forbidden`);
}
for (const entity of FORBIDDEN) {
  const writeRe = new RegExp(`(svc|entities)\\.${entity}\\.(create|update|delete|bulkCreate|bulkUpdate|updateMany|deleteMany)\\s*\\(`);
  assert(!writeRe.test(fn), `no write call targets ${entity}`);
}
for (const zeroEntity of ['ObjectiveEvidenceLink', 'AcolyteRemediationItem', 'CyberFinding', 'ToolEvidenceChecklist']) {
  assert(!has(fn, zeroEntity), `zero-record entity ${zeroEntity} is not touched`);
}

// ===========================================================================
// 12. package.json wiring
// ===========================================================================
section('package.json');
const pkg = readJson('package.json');
if (pkg) {
  assert(
    pkg.scripts?.['test:canonical-migration'] === 'node scripts/check-canonical-project-migration.mjs',
    'test:canonical-migration script is registered',
  );
  assert(!!pkg.scripts?.['test:cmmc-data'], 'existing test:cmmc-data script is preserved');
  assert(!!pkg.scripts?.['test:security'], 'existing test:security script is preserved');
}

// ===========================================================================
console.log(`\n${failures === 0 ? 'OK' : 'FAILED'} — ${checks - failures}/${checks} checks passed.`);
process.exit(failures === 0 ? 0 : 1);