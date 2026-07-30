#!/usr/bin/env node
/**
 * KIPUKA authorization regression harness (static, dependency-free).
 *
 * Reads the deployed source of the eight security-relevant backend functions and
 * asserts that each authorization invariant is PRESENT and ORDERED correctly.
 * Fails closed: any missing or mis-ordered gate exits non-zero.
 *
 * LIMITATION: this is static source analysis, not a runtime test. It proves the
 * gate code exists in the right order; it does not execute the functions or
 * verify live HTTP status codes.
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------- helpers ----
const failures = [];
let currentFile = '';

function fail(message) {
  failures.push(`${currentFile}: ${message}`);
}

/** Index of the first match, or -1. */
function at(src, pattern) {
  const m = src.match(pattern);
  return m ? m.index : -1;
}

/** Assert a pattern exists. Returns its index (-1 when missing). */
function must(src, pattern, label) {
  const i = at(src, pattern);
  if (i === -1) fail(`missing required authorization code — ${label}`);
  return i;
}

/** Assert a pattern does NOT exist (run against comment-stripped source). */
function mustNot(src, pattern, label) {
  if (at(src, pattern) !== -1) fail(`forbidden pattern present — ${label}`);
}

/** Assert `first` appears before `second`. Both must exist. */
function mustPrecede(src, firstPattern, secondPattern, label) {
  const a = at(src, firstPattern);
  const b = at(src, secondPattern);
  if (a === -1 || b === -1) {
    fail(`cannot verify ordering (one side missing) — ${label}`);
    return;
  }
  if (a > b) fail(`authorization gate is out of order — ${label}`);
}

/** Remove block and line comments so a reassuring comment cannot satisfy a check. */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/** All `sr.entities.X` / `asServiceRole.entities.X` accesses as {entity, index}. */
function serviceRoleEntityOps(src) {
  const ops = [];
  const re = /(?:asServiceRole|\bsr)\s*\.\s*entities\s*\.\s*(\w+)/g;
  let m;
  while ((m = re.exec(src)) !== null) ops.push({ entity: m[1], index: m.index });
  return ops;
}

/** Index of the first service-role data operation of any kind (incl. uploads). */
function firstServiceRoleUse(src) {
  const i = at(src, /(?:asServiceRole|\bsr)\s*\.\s*(?:entities|integrations)/);
  return i;
}

// ------------------------------------------------------ shared assertions ----
function assertAuthenticationGate(src, clean) {
  must(src, /auth\s*\.\s*me\s*\(/, 'auth.me() call');
  must(clean, /status:\s*401/, '401 response for an unauthenticated caller');
  mustPrecede(
    clean,
    /if\s*\(\s*!\s*(?:user|caller)\s*\)[\s\S]{0,120}401/,
    /(?:asServiceRole|\bsr)\s*\.\s*(?:entities|integrations)/,
    '401 unauthenticated check must precede all service-role work',
  );
}

// ------------------------------------------------------- legacy functions ----
// generatePackage / generateSSP / generateDocument / generateDeploymentTasks
function checkLegacyClientFunction(clean, { clientIdMissingPattern, nonClientOpPattern }) {
  // 1. client_id validated with a 400.
  must(clean, /client_id/, 'client_id read from the request body');
  must(clean, clientIdMissingPattern, 'missing client_id returns 400');

  // 2. authorizeClientAccess invoked with the authenticated user.
  const gateCall = must(
    clean,
    /const\s+\w+\s*=\s*authorizeClientAccess\s*\(\s*user\s*,\s*clientId\s*\)/,
    'authorizeClientAccess(user, clientId) call',
  );
  must(clean, /if\s*\(\s*\w+\s*\)\s*return\s+\w+\s*;/, 'the authorization result is returned when it denies');

  // 3. Gate precedes the first service-role read/write/upload.
  const firstSr = firstServiceRoleUse(clean);
  if (firstSr === -1) {
    fail('no service-role data operation found — file shape unexpected');
  } else if (gateCall === -1 || gateCall > firstSr) {
    fail('authorizeClientAccess must be called before the first asServiceRole read/write/upload');
  }

  // 4. Exact-token assignment parser (no substring matching).
  must(clean, /assigned_client_ids/, 'assigned_client_ids is consulted');
  must(clean, /\.split\s*\(\s*','\s*\)/, 'assigned_client_ids is split on commas');
  must(clean, /\.trim\s*\(\s*\)/, 'assignment tokens are trimmed');
  must(clean, /\.filter\s*\(\s*Boolean\s*\)/, 'empty assignment tokens are discarded');
  must(clean, /\.includes\s*\(\s*clientId\s*\)/, 'assignment match uses exact array includes');
  mustNot(clean, /assigned_client_ids\s*\.\s*(?:includes|indexOf|match|search)\s*\(/,
    'substring matching directly on the assigned_client_ids string');
  mustNot(clean, /String\s*\(\s*raw[^)]*\)\s*\.\s*(?:includes|indexOf)\s*\(/,
    'substring matching on the raw assignment string');

  // 5. Role decision table.
  must(clean, /role\s*===\s*'admin'\s*\)\s*return\s+null/, "admin is allowed to continue");
  must(clean, /role\s*!==\s*'technician'[\s\S]{0,160}status:\s*403/, 'non-technician roles receive 403');
  must(clean, /!\s*isAssignedClient\s*\([\s\S]{0,160}status:\s*404/, 'unassigned technician receives 404');
  mustPrecede(clean, /status:\s*403/, /(?:asServiceRole|\bsr)\s*\.\s*(?:entities|integrations)/,
    'role rejection must precede any service-role data operation');

  // 6. Authorized Client fetch + missing-client 404 before other target data work.
  const clientGet = must(clean, /entities\s*\.\s*Client\s*\.\s*get\s*\(\s*clientId\s*\)/,
    'authorized Client.get(clientId) existence check');
  const missing404 = must(clean, /if\s*\(\s*!\s*\w*[Cc]lient\w*\s*\)[\s\S]{0,140}status:\s*404/,
    'missing Client returns 404');

  const otherOp = at(clean, nonClientOpPattern);
  if (clientGet !== -1 && otherOp !== -1 && clientGet > otherOp) {
    fail('Client.get(clientId) must precede other target/template/package data operations');
  }
  if (missing404 !== -1) {
    const firstMutation = at(
      clean,
      /(?:asServiceRole|\bsr)\s*\.\s*(?:entities\s*\.\s*\w+\s*\.\s*(?:create|update|delete|bulkCreate)|integrations\s*\.\s*Core\s*\.\s*UploadFile)/,
    );
    if (firstMutation !== -1 && missing404 > firstMutation) {
      fail('missing-client 404 must be evaluated before any write or upload');
    }
  }
}

// -------------------------------------------------- per-function checkers ----
function checkGenerateEvidencePackage(src, clean) {
  assertAuthenticationGate(src, clean);
  must(clean, /project_id/, 'project_id read from the request body');
  must(clean, /if\s*\(\s*!\s*projectId\s*\)[\s\S]{0,120}status:\s*400/, 'missing project_id returns 400');

  const membership = must(
    clean,
    /entities\s*\.\s*OrganizationUser[\s\S]{0,200}organization_id:\s*orgId/,
    'OrganizationUser membership lookup scoped to the project organization',
  );
  must(clean, /user_email:\s*user\.email/, 'membership lookup is bound to the caller email');

  // Only Project.get may precede tenant authorization.
  if (membership !== -1) {
    for (const op of serviceRoleEntityOps(clean)) {
      if (op.index < membership && op.entity !== 'Project' && op.entity !== 'OrganizationUser') {
        fail(`entity "${op.entity}" is read before tenant authorization — only Project.get may precede it`);
      }
    }
  }

  must(clean, /if\s*\(\s*!\s*project\s*\)[\s\S]{0,120}status:\s*404/, 'missing Project returns 404');
  must(clean, /if\s*\(\s*!\s*orgId\s*\)[\s\S]{0,120}status:\s*404/, 'project without organization_id returns 404');
  must(clean, /user\.organization_id\s*!==\s*orgId[\s\S]{0,160}status:\s*404/,
    'non-staff caller from another organization receives 404');
  must(clean, /memberships\s*\.\s*filter\s*\([\s\S]{0,80}status\s*===\s*'Active'\s*\)/,
    "membership set is filtered to status exactly 'Active'");
  mustNot(clean, /status\s*!==\s*'Removed'/, "'not Removed' treated as an active membership");
  must(clean, /if\s*\(\s*active\s*\.\s*length\s*!==\s*1\s*\)[\s\S]{0,160}status:\s*404/,
    'missing OR ambiguous active membership is rejected with 404');
  mustNot(clean, /memberships\s*\.\s*some\s*\(/,
    'membership existence check allows multiple Active rows to pass');
  mustNot(clean, /active\s*\.\s*length\s*===\s*0/,
    'membership check only rejects zero memberships (multiple actives would pass)');

  // Organization state gating before any package data read.
  const orgGet = must(clean, /entities\s*\.\s*Organization\s*\.\s*get\s*\(\s*orgId\s*\)/, 'owning Organization lookup');
  must(clean, /fully_disabled\s*===\s*true/, 'disabled organizations are rejected');
  must(clean, /'Suspended'/, 'suspended subscriptions are rejected');
  must(clean, /'Cancelled'/, 'cancelled subscriptions are rejected');
  must(clean, /'Past Due'/, 'past-due subscriptions are rejected');
  const expiry = must(clean, /subscription_end_date[\s\S]{0,220}status:\s*403/,
    'expired subscription end date is rejected with 403');

  const bulkRead = must(clean, /Promise\s*\.\s*all\s*\(\s*\[/, 'package-data Promise.all');
  if (bulkRead !== -1) {
    if (membership !== -1 && membership > bulkRead) fail('membership check must precede the package-data Promise.all');
    if (orgGet !== -1 && orgGet > bulkRead) fail('Organization state lookup must precede the package-data Promise.all');
    if (expiry !== -1 && expiry > bulkRead) fail('subscription gating must precede the package-data Promise.all');
  }
}

function checkOrgScopedShared(clean) {
  const orgDerive = must(clean, /const\s+org\s*=\s*caller\s*\.\s*organization_id\s*;/,
    'organization derived solely from caller.organization_id');
  mustNot(clean, /const\s+org\s*=\s*(?:body|query)\s*\./, 'organization taken from the request body');
  must(clean, /if\s*\(\s*!\s*org\s*\)[\s\S]{0,220}status:\s*403/, 'caller without an organization receives 403');

  const membership = must(
    clean,
    /entities\s*\.\s*OrganizationUser[\s\S]{0,200}\.\s*filter\s*\(\s*\{\s*user_email:\s*caller\.email\s*,\s*organization_id:\s*org\s*\}/,
    'OrganizationUser lookup bound to caller email AND the same organization_id',
  );
  must(clean, /memberships\s*\.\s*filter\s*\([\s\S]{0,80}status\s*===\s*'Active'\s*\)/,
    "membership set filtered to status exactly 'Active'");
  mustNot(clean, /status\s*!==\s*'Removed'/, "'not Removed' treated as an active membership");
  must(clean, /if\s*\(\s*active\s*\.\s*length\s*!==\s*1\s*\)[\s\S]{0,240}status:\s*403/,
    'missing OR ambiguous active membership is rejected with 403 (exactly one required)');
  mustNot(clean, /active\s*\.\s*length\s*===\s*0/,
    'membership check only rejects zero memberships (multiple actives would pass)');

  const svc = must(clean, /const\s+svc\s*=\s*base44\s*\.\s*asServiceRole\s*\.\s*entities\s*\[\s*entity\s*\]/,
    'target entity handle resolution');
  if (membership !== -1 && svc !== -1 && membership > svc) {
    fail('membership verification must precede target entity operations');
  }
  return { orgDerive, membership, svc };
}

function checkOrgScopedData(src, clean) {
  assertAuthenticationGate(src, clean);
  checkOrgScopedShared(clean);
  must(clean, /const\s+scoped\s*=\s*\{[\s\S]{0,120}organization_id:\s*org\s*\}/,
    'organization_id forced onto every list/filter query');
  must(clean, /record\.organization_id\s*!==\s*org[\s\S]{0,160}status:\s*404/,
    'cross-organization get is rejected with 404');
}

function checkOrgScopedWrite(src, clean) {
  assertAuthenticationGate(src, clean);
  const { svc } = checkOrgScopedShared(clean);

  const strip = must(clean, /delete\s+clean\.organization_id\s*;/,
    'client-supplied organization_id is stripped from every write payload');
  must(clean, /READ_ONLY_ORG_ROLES\s*\.\s*has\s*\(\s*orgRole\s*\)[\s\S]{0,200}status:\s*403/,
    'read-only organization roles are blocked from writes');

  const projectGuard = must(
    clean,
    /projectBelongsToOrg[\s\S]{0,240}p\.organization_id\s*===\s*org/,
    'project ownership helper compares Project.organization_id to the caller organization',
  );
  must(clean, /clean\.project_id\s*&&\s*!\s*\(\s*await\s+projectBelongsToOrg/,
    'newly supplied project_id is validated against the caller organization');
  must(clean, /existing\.project_id\s*&&\s*!\s*\(\s*await\s+projectBelongsToOrg/,
    "the existing record's project_id is validated against the caller organization");
  must(clean, /existing\.organization_id\s*!==\s*org[\s\S]{0,160}status:\s*404/,
    'updates to another organization\'s record return 404');

  const create = at(clean, /svc\s*\.\s*create\s*\(/);
  const update = at(clean, /svc\s*\.\s*update\s*\(/);
  if (strip !== -1) {
    if (create !== -1 && strip > create) fail('organization_id must be stripped before create');
    if (update !== -1 && strip > update) fail('organization_id must be stripped before update');
  }
  if (projectGuard !== -1 && update !== -1 && projectGuard > update) {
    fail('project ownership validation must precede the update write');
  }
  if (svc !== -1 && create !== -1 && svc > create) fail('unexpected write ordering');
  must(clean, /svc\s*\.\s*create\s*\(\s*\{[\s\S]{0,80}organization_id:\s*org\s*\}/,
    'creates are bound server-side to the caller organization');
}

function checkOrgAssetWrite(src, clean) {
  assertAuthenticationGate(src, clean);

  must(clean, /const\s+isPlatformAdmin\s*=\s*user\.role\s*===\s*'admin'/, 'platform-admin determination');
  const orgMatch = must(
    clean,
    /!\s*user\.organization_id\s*\|\|\s*user\.organization_id\s*!==\s*organizationId[\s\S]{0,200}status:\s*403/,
    'non-admin caller must exactly match the requested organizationId',
  );
  must(
    clean,
    /entities\s*\.\s*OrganizationUser[\s\S]{0,200}organization_id:\s*organizationId\s*,\s*user_email:\s*user\.email/,
    'membership lookup bound to the requested organization and the caller email',
  );
  must(clean, /memberships\s*\.\s*filter\s*\([\s\S]{0,80}status\s*===\s*'Active'\s*\)/,
    "membership set filtered to status exactly 'Active'");
  mustNot(clean, /status\s*!==\s*'Removed'/, "'not Removed' treated as an active membership");
  must(clean, /if\s*\(\s*active\s*\.\s*length\s*!==\s*1\s*\)[\s\S]{0,240}status:\s*403/,
    'missing OR ambiguous active membership is rejected with 403 (exactly one required)');
  mustNot(clean, /active\s*\.\s*length\s*===\s*0/,
    'membership check only rejects zero memberships (multiple actives would pass)');
  must(clean, /READ_ONLY_ORG_ROLES\s*=\s*new\s+Set\s*\(\s*\[\s*'Auditor Viewer'\s*,\s*'Executive Viewer'/,
    'read-only organization roles remain defined');
  must(clean, /READ_ONLY_ORG_ROLES\s*\.\s*has\s*\(\s*role\s*\)[\s\S]{0,200}status:\s*403/,
    'read-only organization roles are blocked from asset writes');

  const projectGuard = must(
    clean,
    /project\.organization_id\s*!==\s*organizationId[\s\S]{0,160}status:\s*404/,
    'referenced project must belong to the authorized organization',
  );
  must(clean, /entities\s*\.\s*Project\s*\.\s*get\s*\(\s*projectId\s*\)/, 'referenced project is loaded for validation');
  must(clean, /action\s*===\s*'create'[\s\S]{0,200}projectId\s+is\s+required/, 'create still requires a projectId');

  const assetOrgGuards = clean.match(/existing\.organization_id\s*!==\s*organizationId/g) || [];
  if (assetOrgGuards.length < 2) {
    fail('update and delete must each verify the stored Asset organization (found ' + assetOrgGuards.length + ')');
  }
  const assetProjectGuards = clean.match(/projectId\s*&&\s*existing\.project_id\s*!==\s*projectId/g) || [];
  if (assetProjectGuards.length < 2) {
    fail('update and delete must each verify the stored Asset project when supplied (found ' + assetProjectGuards.length + ')');
  }

  const stripOrg = must(clean, /delete\s+clean\.organization_id\s*;/, 'data.organization_id is stripped');
  const stripProject = must(clean, /delete\s+clean\.project_id\s*;/, 'data.project_id is stripped');
  const firstWrite = at(clean, /svc\s*\.\s*(?:create|update|delete)\s*\(/);
  if (firstWrite !== -1) {
    if (stripOrg !== -1 && stripOrg > firstWrite) fail('organization_id must be stripped before any asset write');
    if (stripProject !== -1 && stripProject > firstWrite) fail('project_id must be stripped before any asset write');
    if (orgMatch !== -1 && orgMatch > firstWrite) fail('organization match must precede any asset write');
    if (projectGuard !== -1 && projectGuard > firstWrite) fail('project validation must precede any asset write');
  }
}

// --------------------------------------------------------------- registry ----
const CHECKS = [
  {
    file: 'base44/functions/generateEvidencePackage/entry.ts',
    run: checkGenerateEvidencePackage,
  },
  { file: 'base44/functions/orgScopedData/entry.ts', run: checkOrgScopedData },
  { file: 'base44/functions/orgScopedWrite/entry.ts', run: checkOrgScopedWrite },
  { file: 'base44/functions/orgAssetWrite/entry.ts', run: checkOrgAssetWrite },
  {
    file: 'base44/functions/generatePackage/entry.ts',
    run: (src, clean) => {
      assertAuthenticationGate(src, clean);
      checkLegacyClientFunction(clean, {
        clientIdMissingPattern: /if\s*\(\s*!\s*clientId\s*\)[\s\S]{0,120}status:\s*400/,
        nonClientOpPattern: /entities\s*\.\s*(?:CMMCControl|ControlProgress|EvidenceItem|PackageExport)\s*\./,
      });
    },
  },
  {
    file: 'base44/functions/generateSSP/entry.ts',
    run: (src, clean) => {
      assertAuthenticationGate(src, clean);
      checkLegacyClientFunction(clean, {
        clientIdMissingPattern: /if\s*\(\s*!\s*clientId\s*\)[\s\S]{0,120}status:\s*400/,
        nonClientOpPattern: /entities\s*\.\s*(?:CMMCControl|ControlValidation|SSPRecord|SSPGenerationRun)\s*\./,
      });
    },
  },
  {
    file: 'base44/functions/generateDocument/entry.ts',
    run: (src, clean) => {
      assertAuthenticationGate(src, clean);
      checkLegacyClientFunction(clean, {
        clientIdMissingPattern: /if\s*\(\s*!\s*clientId\s*\|\|\s*!\s*docKey\s*\)[\s\S]{0,140}status:\s*400/,
        nonClientOpPattern: /entities\s*\.\s*(?:CMMCControl|ControlProgress|GeneratedDocument)\s*\./,
      });
      // Same-client existing-document behavior must remain the only lookup path.
      must(clean, /existingDocs\s*\.\s*find\s*\(\s*d\s*=>\s*d\.id\s*===\s*existing_document_id\s*\)/,
        'existing_document_id is resolved only from this client\'s documents');
    },
  },
  {
    file: 'base44/functions/generateDeploymentTasks/entry.ts',
    run: (src, clean) => {
      assertAuthenticationGate(src, clean);
      checkLegacyClientFunction(clean, {
        clientIdMissingPattern: /if\s*\(\s*!\s*clientId\s*\)[\s\S]{0,140}status:\s*400/,
        nonClientOpPattern: /entities\s*\.\s*DeploymentTask\s*\./,
      });
      // Client existence must be proven before the template skip and before task reads.
      const clientGet = at(clean, /entities\s*\.\s*Client\s*\.\s*get\s*\(\s*clientId\s*\)/);
      const templateSkip = at(clean, /clientId\s*===\s*TEMPLATE_CLIENT_ID/);
      const taskRead = at(clean, /entities\s*\.\s*DeploymentTask\s*\.\s*filter\s*\(/);
      if (clientGet === -1) {
        fail('no Client.get(clientId) existence check before the template skip and DeploymentTask reads');
      } else {
        if (templateSkip !== -1 && clientGet > templateSkip) {
          fail('Client existence must be verified before the template-client skip');
        }
        if (taskRead !== -1 && clientGet > taskRead) {
          fail('Client existence must be verified before any DeploymentTask read');
        }
      }
    },
  },
];

// ------------------------------------------------------------------ main ----
const results = [];
for (const { file, run } of CHECKS) {
  currentFile = file;
  const before = failures.length;
  let src;
  try {
    src = readFileSync(resolve(ROOT, file), 'utf8');
  } catch {
    fail('file could not be read — the function is missing from the repository');
    results.push({ file, ok: false });
    continue;
  }
  run(src, stripComments(src));
  results.push({ file, ok: failures.length === before });
}

for (const r of results) {
  if (r.ok) console.log(`PASS  ${r.file}`);
  else console.log(`FAIL  ${r.file}`);
}

if (failures.length > 0) {
  console.error(`\n${failures.length} authorization invariant(s) failed:\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  console.error('\nAuthorization regression harness FAILED.');
  process.exit(1);
}

console.log(`\nAll ${CHECKS.length} functions passed every authorization invariant.`);
console.log('Note: static source analysis only — no runtime authorization test was executed.');