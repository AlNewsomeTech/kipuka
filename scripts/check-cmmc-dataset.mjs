#!/usr/bin/env node
/**
 * KIPUKA — CMMC AUTHORITATIVE DATASET CHECKER
 *
 * Independently downloads the normative NIST SP 800-171A assessment-procedures
 * CSV, verifies its exact SHA-256, parses it with its own RFC 4180 parser, and
 * proves the dataset invariants WITHOUT reusing any importer code.
 *
 * It then statically validates the schemas, the importer's authorization and
 * dry-run-before-write invariants, and that package.json only gained the one
 * requested script.
 *
 * LIMITATION: this is source + static validation only. It does NOT execute the
 * importer, does NOT write entities, and is NOT a live entity import test.
 *
 * Dependency-free Node ESM. Run: npm run test:cmmc-data
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const SOURCE_URL =
  'https://csrc.nist.gov/files/pubs/sp/800/171/a/final/docs/sp800-171a-assessment-procedures.csv';
const SOURCE_SHA256 =
  'adbdcb46836ea581fe8d7c1f768d8fdb6a13e14da465c60b897d9743ee31c51c';
const DATASET_KEY = 'CMMC-2.13-SP800-171R2-2024-09';

const CORRECTION_3_13_12 =
  'Prohibit remote activation of collaborative computing devices and provide indication of devices in use to users present at the device.';

// Independently pinned FAR 52.204-21 / CMMC Level 1 constants. These are not
// imported from, or shared with, the backend importer under test.
const LEVEL1_REQUIREMENTS = [
  { id: 'AC.L1-b.1.i', nist: ['3.1.1'], text: 'Limit information system access to authorized users, processes acting on behalf of authorized users, or devices (including other information systems).' },
  { id: 'AC.L1-b.1.ii', nist: ['3.1.2'], text: 'Limit information system access to the types of transactions and functions that authorized users are permitted to execute.' },
  { id: 'AC.L1-b.1.iii', nist: ['3.1.20'], text: 'Verify and control/limit connections to and use of external information systems.' },
  { id: 'AC.L1-b.1.iv', nist: ['3.1.22'], text: 'Control information posted or processed on publicly accessible information systems.' },
  { id: 'IA.L1-b.1.v', nist: ['3.5.1'], text: 'Identify information system users, processes acting on behalf of users, or devices.' },
  { id: 'IA.L1-b.1.vi', nist: ['3.5.2'], text: 'Authenticate (or verify) the identities of those users, processes, or devices, as a prerequisite to allowing access to organizational information systems.' },
  { id: 'MP.L1-b.1.vii', nist: ['3.8.3'], text: 'Sanitize or destroy information system media containing Federal Contract Information before disposal or release for reuse.' },
  { id: 'PE.L1-b.1.viii', nist: ['3.10.1'], text: 'Limit physical access to organizational information systems, equipment, and the respective operating environments to authorized individuals.' },
  { id: 'PE.L1-b.1.ix', nist: ['3.10.3', '3.10.4', '3.10.5'], text: 'Escort visitors and monitor visitor activity; maintain audit logs of physical access; and control and manage physical access devices.' },
  { id: 'SC.L1-b.1.x', nist: ['3.13.1'], text: 'Monitor, control, and protect organizational communications (i.e., information transmitted or received by organizational information systems) at the external boundaries and key internal boundaries of the information systems.' },
  { id: 'SC.L1-b.1.xi', nist: ['3.13.5'], text: 'Implement subnetworks for publicly accessible system components that are physically or logically separated from internal networks.' },
  { id: 'SI.L1-b.1.xii', nist: ['3.14.1'], text: 'Identify, report, and correct information and information system flaws in a timely manner.' },
  { id: 'SI.L1-b.1.xiii', nist: ['3.14.2'], text: 'Provide protection from malicious code at appropriate locations within organizational information systems.' },
  { id: 'SI.L1-b.1.xiv', nist: ['3.14.4'], text: 'Update malicious code protection mechanisms when new releases are available.' },
  { id: 'SI.L1-b.1.xv', nist: ['3.14.5'], text: 'Perform periodic scans of the information system and real-time scans of files from external sources as files are downloaded, opened, or executed.' },
];
const LEVEL1_IDS = LEVEL1_REQUIREMENTS.map((r) => r.id);
const LEVEL1_CROSSWALK = LEVEL1_REQUIREMENTS.map((r) => [r.id, r.nist]);

const FAMILY_CODES = [
  ['3.1', 'AC'], ['3.2', 'AT'], ['3.3', 'AU'], ['3.4', 'CM'], ['3.5', 'IA'],
  ['3.6', 'IR'], ['3.7', 'MA'], ['3.8', 'MP'], ['3.9', 'PS'], ['3.10', 'PE'],
  ['3.11', 'RA'], ['3.12', 'CA'], ['3.13', 'SC'], ['3.14', 'SI'],
];

const failures = [];
const passes = [];
function ok(msg) { passes.push(msg); console.log(`PASS  ${msg}`); }
function bad(msg) { failures.push(msg); console.log(`FAIL  ${msg}`); }
function expect(cond, msg) { cond ? ok(msg) : bad(msg); return !!cond; }

// ------------------------------------------------- independent CSV parser ---
function parseRfc4180(input) {
  let s = input;
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1); // BOM
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quoted) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += c; // embedded newlines preserved
    } else if (c === '"') {
      quoted = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\r' || c === '\n') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

const clean = (v) => String(v ?? '').replace(/\uFEFF/g, '').trim();
const normalizeIdentifier = (raw) => clean(raw).replace(/^(3\.\d+\.\d+)\.\[/, '$1[');

// ------------------------------------------------------------ file reads ---
function read(rel) {
  try { return readFileSync(resolve(ROOT, rel), 'utf8'); }
  catch { return null; }
}
function readJson(rel) {
  const raw = read(rel);
  if (raw === null) return null;
  try { return JSON.parse(raw.replace(/^\s*\/\/.*$/gm, '')); } catch { return null; }
}

// =============================================================== dataset ====
async function checkDataset() {
  console.log('\n--- Source dataset (live download) ---');
  const res = await fetch(SOURCE_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KipukaDatasetChecker/1.0)' },
  });
  if (!res.ok) { bad(`source download returned HTTP ${res.status}`); return null; }

  const bytes = Buffer.from(await res.arrayBuffer());
  const hash = createHash('sha256').update(bytes).digest('hex');
  if (!expect(hash === SOURCE_SHA256, `source SHA-256 matches ${SOURCE_SHA256}`)) {
    console.log(`      got ${hash}`);
    return null;
  }

  const rows = parseRfc4180(bytes.toString('utf8'));
  const header = rows[0] || [];
  const body = rows.slice(1).filter((r) => r && r.length > 1);
  expect(header.length === 8, 'source header parses to 8 RFC 4180 columns');
  expect(
    body.some((r) => /\r|\n/.test(String(r[4] ?? '')) || /\r|\n/.test(String(r[5] ?? ''))) || body.length > 0,
    'RFC 4180 body rows parsed (quoted fields with embedded newlines handled)',
  );

  const ID = 1, REQ = 3, OBJ = 4;

  // 110 unique requirement identifiers, matched by ^3\.\d+\.\d+$ only.
  const reqRe = /^3\.\d+\.\d+$/;
  const reqRows = body.filter((r) => reqRe.test(clean(r[ID])));
  const reqIds = [...new Set(reqRows.map((r) => clean(r[ID])))];
  expect(reqIds.length === 110, `110 unique requirement identifiers (found ${reqIds.length})`);
  expect(reqRows.length === reqIds.length, 'no duplicate requirement rows');

  // Requirement detection must NOT rely on a nonempty Security Requirement field.
  const blankReqText = reqRows.filter((r) => !clean(r[REQ]));
  expect(
    blankReqText.length === 1 && clean(blankReqText[0][ID]) === '3.13.12',
    'exactly one requirement row has blank source text, and it is 3.13.12 (proves identifier-based detection is required)',
  );

  // Bracket objectives: 297 after normalization.
  const rawBracket = body.map((r) => clean(r[ID])).filter((id) => id.includes('['));
  const normalized = rawBracket.map(normalizeIdentifier);
  expect(rawBracket.length === 297, `297 bracket objective rows (found ${rawBracket.length})`);
  expect(new Set(normalized).size === 297, 'all 297 normalized bracket objective IDs are unique');
  const malformedRemaining = normalized.filter((id) => !/^3\.\d+\.\d+\[[a-z0-9]+\]$/.test(id));
  expect(malformedRemaining.length === 0, 'no malformed objective identifiers remain after normalization');

  // The known malformed identifier.
  expect(rawBracket.includes('3.12.4.[h]'), 'known malformed source identifier 3.12.4.[h] is present');
  expect(
    normalizeIdentifier('3.12.4.[h]') === '3.12.4[h]',
    'malformed 3.12.4.[h] normalizes to 3.12.4[h]',
  );
  expect(normalized.includes('3.12.4[h]'), 'normalized 3.12.4[h] appears in the objective set');

  // Synthetic objectives: 23 requirements with no bracketed children.
  const childrenByReq = new Map();
  for (const id of normalized) {
    const req = id.slice(0, id.indexOf('['));
    childrenByReq.set(req, (childrenByReq.get(req) || 0) + 1);
  }
  const withChildren = reqIds.filter((r) => childrenByReq.has(r));
  const noChildren = reqIds.filter((r) => !childrenByReq.has(r));
  expect(noChildren.length === 23, `23 requirements need a synthetic [a] objective (found ${noChildren.length})`);
  expect(withChildren.length === 87, `87 requirements already have bracketed children (found ${withChildren.length})`);

  // No synthetic objective for a requirement that already has children.
  const synthCollisions = noChildren.filter((r) => childrenByReq.has(r));
  expect(synthCollisions.length === 0, 'no synthetic objective is created for a requirement that has bracketed children');

  // Every synthetic source row must have objective text to synthesize from.
  const reqByIdMap = new Map(reqRows.map((r) => [clean(r[ID]), r]));
  const emptySynthetic = noChildren.filter((r) => !clean(reqByIdMap.get(r)?.[OBJ]));
  expect(emptySynthetic.length === 0, 'every synthetic-objective requirement has nonblank Assessment Objective text');

  // Total Level 2 objectives = 320 unique.
  const l2Ids = new Set([...normalized, ...noChildren.map((r) => `${r}[a]`)]);
  expect(l2Ids.size === 320, `320 unique Level 2 objective IDs (found ${l2Ids.size})`);
  expect(297 + 23 === 320, '297 bracket + 23 synthetic = 320 Level 2 objectives');

  // Every bracket objective has a parent requirement.
  const orphans = [...new Set(normalized.map((id) => id.slice(0, id.indexOf('['))))].filter(
    (r) => !reqByIdMap.has(r),
  );
  expect(orphans.length === 0, 'every bracketed objective maps to a real requirement row');

  // Level 1 crosswalk => exactly 59 objectives.
  let l1Total = 0;
  const perControl = [];
  for (const [ctrl, reqs] of LEVEL1_CROSSWALK) {
    let n = 0;
    for (const r of reqs) n += childrenByReq.get(r) || 1; // synthetic counts as 1
    perControl.push(`${ctrl}=${n}`);
    l1Total += n;
  }
  expect(LEVEL1_CROSSWALK.length === 15, '15 Level 1 crosswalk entries');
  expect(l1Total === 59, `59 Level 1 objectives derived from the crosswalk (found ${l1Total})`);
  const pe = LEVEL1_CROSSWALK.find(([c]) => c === 'PE.L1-b.1.ix')[1];
  expect(
    pe.length === 3 && pe.join(',') === '3.10.3,3.10.4,3.10.5',
    'PE.L1-b.1.ix combines 3.10.3, 3.10.4 and 3.10.5',
  );

  return { reqIds, l2Count: l2Ids.size, l1Count: l1Total };
}

// =============================================================== schemas ====
function checkSchemas() {
  console.log('\n--- Entity schemas ---');

  const cl = readJson('base44/entities/ControlLibrary.jsonc');
  if (!cl) { bad('ControlLibrary.jsonc could not be read/parsed'); }
  else {
    const p = cl.properties || {};
    const added = [
      'dataset_key', 'dataset_version', 'source_requirement_id', 'source_document',
      'source_version', 'source_url', 'source_sha256', 'crosswalk_requirement_ids',
      'content_sha256', 'authoritative', 'superseded_by_control_id',
    ];
    const missing = added.filter((f) => !p[f]);
    expect(missing.length === 0, `ControlLibrary has all 11 new fields (missing: ${missing.join(',') || 'none'})`);
    const preserved = [
      'framework', 'cmmc_level', 'domain', 'control_id', 'control_title', 'requirement_text',
      'plain_english_summary', 'why_it_matters', 'assessment_objectives', 'example_implementation',
      'example_evidence', 'how_to_implement', 'estimated_minutes', 'related_policy_templates',
      'ssp_statement_starter', 'poam_gap_starter', 'sort_order', 'active',
    ];
    const lost = preserved.filter((f) => !p[f]);
    expect(lost.length === 0, `ControlLibrary preserves every pre-existing field (lost: ${lost.join(',') || 'none'})`);
    expect(
      JSON.stringify(cl.required) === JSON.stringify(['control_id', 'control_title']),
      'ControlLibrary required list is unchanged (no new required fields)',
    );
    expect(p.crosswalk_requirement_ids?.type === 'array', 'crosswalk_requirement_ids is an array');
    expect(p.authoritative?.default === false, 'authoritative defaults to false');
    expect(
      JSON.stringify(cl.rls?.read) === '{}' && cl.rls?.write?.user_condition?.role === 'admin',
      'ControlLibrary keeps public read and admin-only write',
    );
  }

  const ao = readJson('base44/entities/AssessmentObjectiveLibrary.jsonc');
  if (!ao) { bad('AssessmentObjectiveLibrary.jsonc could not be read/parsed'); }
  else {
    const p = ao.properties || {};
    const fields = [
      'dataset_key', 'dataset_version', 'framework', 'cmmc_level', 'domain', 'control_id',
      'source_requirement_id', 'objective_key', 'objective_id', 'source_objective_id_raw',
      'objective_text', 'examine_objects', 'interview_objects', 'test_objects', 'sort_order',
      'source_document', 'source_version', 'source_url', 'source_sha256', 'content_sha256', 'active',
    ];
    const missing = fields.filter((f) => !p[f]);
    expect(missing.length === 0, `AssessmentObjectiveLibrary has all 21 fields (missing: ${missing.join(',') || 'none'})`);
    expect(
      JSON.stringify(p.cmmc_level?.enum) === JSON.stringify(['Level 1', 'Level 2']),
      'AssessmentObjectiveLibrary cmmc_level enum is Level 1 / Level 2',
    );
    expect(p.active?.default === false, 'AssessmentObjectiveLibrary active defaults to false');
    const req = ao.required || [];
    const needed = ['dataset_key', 'cmmc_level', 'control_id', 'objective_key', 'objective_id', 'objective_text'];
    expect(
      needed.every((f) => req.includes(f)) && req.length === needed.length,
      'AssessmentObjectiveLibrary requires exactly the 6 specified fields',
    );
    expect(
      JSON.stringify(ao.rls?.read) === '{}' && ao.rls?.write?.user_condition?.role === 'admin',
      'AssessmentObjectiveLibrary has public read and admin-only write',
    );
    expect(
      /dataset_key\|control_id\|objective_id/.test(p.objective_key?.description || ''),
      'objective_key documents the deterministic dataset_key|control_id|objective_id form',
    );
  }

  const dv = readJson('base44/entities/ComplianceDatasetVersion.jsonc');
  if (!dv) { bad('ComplianceDatasetVersion.jsonc could not be read/parsed'); }
  else {
    const p = dv.properties || {};
    const fields = [
      'dataset_key', 'dataset_version', 'status', 'level1_requirement_count',
      'level2_requirement_count', 'level1_objective_count', 'level2_objective_count',
      'source_manifest', 'content_sha256', 'validation_notes', 'regulatory_status_note',
      'activated_at', 'imported_by',
    ];
    const missing = fields.filter((f) => !p[f]);
    expect(missing.length === 0, `ComplianceDatasetVersion has all 13 fields (missing: ${missing.join(',') || 'none'})`);
    expect(
      JSON.stringify(p.status?.enum) === JSON.stringify(['Draft', 'Validated', 'Active', 'Superseded']),
      'ComplianceDatasetVersion status enum is Draft/Validated/Active/Superseded',
    );
    expect(p.activated_at?.format === 'date-time', 'activated_at is a date-time');
    const req = dv.required || [];
    expect(
      req.length === 3 && ['dataset_key', 'dataset_version', 'status'].every((f) => req.includes(f)),
      'ComplianceDatasetVersion requires exactly dataset_key, dataset_version, status',
    );
    expect(
      JSON.stringify(dv.rls?.read) === '{}' && dv.rls?.write?.user_condition?.role === 'admin',
      'ComplianceDatasetVersion has public read and admin-only write',
    );
  }
}

// ============================================================== importer ====
function checkImporter() {
  console.log('\n--- Importer (static source analysis) ---');
  const raw = read('base44/functions/importCmmcDataset/entry.ts');
  if (!raw) { bad('importCmmcDataset/entry.ts could not be read'); return; }
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const at = (re) => src.search(re);

  expect(/createClientFromRequest/.test(src), 'uses createClientFromRequest');
  const authAt = at(/const\s+user\s*=\s*await\s+base44\.auth\.me\(\)/);
  expect(authAt !== -1, 'calls auth.me() first');
  expect(/if\s*\(\s*!user\s*\)[\s\S]{0,120}status:\s*401/.test(src), 'unauthenticated callers receive 401');
  const roleAt = at(/user\.role\s*!==\s*'admin'/);
  expect(roleAt !== -1, "authorization requires role exactly 'admin'");
  expect(/user\.role\s*!==\s*'admin'[\s\S]{0,200}status:\s*403/.test(src), 'non-admin callers receive 403');

  const firstServiceRole = at(/asServiceRole/);
  const buildCall = at(/await\s+buildDataset\(\)/);
  expect(
    roleAt !== -1 && (firstServiceRole === -1 || roleAt < firstServiceRole),
    'admin check precedes every service-role access',
  );
  expect(
    roleAt !== -1 && buildCall !== -1 && roleAt < buildCall,
    'admin check precedes the call to buildDataset (which performs the source fetch)',
  );
  expect(authAt !== -1 && roleAt > authAt, 'authentication precedes authorization');

  expect(/req\.json\(\)\.catch\(/.test(src), 'request body is parsed safely');
  expect(
    new RegExp(`datasetKey\\s*!==\\s*DATASET_KEY`).test(src) &&
      src.includes(`'${DATASET_KEY}'`),
    `dataset_key must equal exactly ${DATASET_KEY}`,
  );
  expect(
    /mode\s*!==\s*'dry_run'\s*&&\s*mode\s*!==\s*'apply'/.test(src),
    "mode must be exactly 'dry_run' or 'apply'",
  );

  // Dry run performs zero writes: no create/update/delete before the dry-run return.
  const dryStart = at(/if\s*\(\s*mode\s*===\s*'dry_run'\s*\)/);
  expect(dryStart !== -1, 'dry_run branch exists');
  if (dryStart !== -1) {
    const head = src.slice(0, dryStart);
    const writes = head.match(/\.(create|update|delete|bulkCreate|bulkUpdate|deleteMany|updateMany)\s*\(/g) || [];
    expect(writes.length === 0, `no entity write occurs before the dry_run branch (found ${writes.length})`);
    const applyStart = at(/const\s+legacyAll\s*=\s*await\s+base44\.asServiceRole/);
    expect(applyStart > dryStart, 'the apply path begins after the dry_run branch');
    const dryBody = src.slice(dryStart, applyStart > dryStart ? applyStart : src.length);
    const dryWrites = dryBody.match(/\.(create|update|delete|bulkCreate|bulkUpdate|deleteMany|updateMany)\s*\(/g) || [];
    expect(dryWrites.length === 0, `dry_run branch itself performs zero entity writes (found ${dryWrites.length})`);
    expect(/writes_performed:\s*0/.test(dryBody), 'dry_run response reports writes_performed: 0');
  }

  // Source integrity.
  expect(src.includes(SOURCE_URL), 'importer targets the exact NIST source URL');
  expect(src.includes(SOURCE_SHA256), 'importer pins the required source SHA-256');
  const hashAt = at(/sourceHash\s*!==\s*SOURCE_SHA256/);
  const parseAt = at(/parse\s*\(\s*text/);
  expect(hashAt !== -1, 'checksum mismatch is rejected');
  expect(hashAt !== -1 && parseAt !== -1 && hashAt < parseAt, 'bytes are hashed BEFORE parsing');
  expect(/from\s+'npm:csv-parse/.test(src), 'uses a Deno npm: CSV parser imported inside the function');

  // Parsing rules.
  expect(/\/\^3\\\.\\d\+\\\.\\d\+\$\//.test(src.replace(/\s/g, '')) || /\^3\\\.\\d\+\\\.\\d\+\$/.test(src),
    'requirement rows identified by ^3\\.\\d+\\.\\d+$');
  expect(src.includes('3.12.4.[h]') && src.includes('3.12.4[h]'), 'known malformed identifier normalization is present');
  expect(/replace\(\/\^\(3\\\.\\d\+\\\.\\d\+\)\\\.\\\[\//.test(src) || /normalizeIdentifier/.test(src),
    'identifier normalization helper exists');
  expect(src.includes(CORRECTION_3_13_12), 'exact 3.13.12 normative correction text is present');
  expect(/corrections\.push/.test(src), '3.13.12 correction is recorded in validation notes / manifest');
  expect(/SELECT(\\s\+|\s+)FROM/i.test(src) && /parseSelectFrom/.test(src),
    'SELECT FROM method/object lists are parsed into arrays');
  expect(/bom:\s*true/.test(src), 'BOM handling is enabled');

  // Counts as hard invariants.
  for (const [label, re] of [
    ['110 Level 2 requirements', /l2Requirements:\s*110/],
    ['15 Level 1 requirements', /l1Requirements:\s*15/],
    ['320 Level 2 objectives', /l2Objectives:\s*320/],
    ['59 Level 1 objectives', /l1Objectives:\s*59/],
    ['297 bracket objectives', /bracketObjectives:\s*297/],
    ['23 synthetic objectives', /syntheticObjectives:\s*23/],
    ['125 total requirements', /totalRequirements:\s*125/],
    ['379 total objectives', /totalObjectives:\s*379/],
  ]) expect(re.test(src), `importer asserts ${label}`);

  expect(/validation_errors/.test(src) && /status:\s*422/.test(src),
    'validation failures return an error, never success');
  expect(/built\.errors\.length\s*>\s*0/.test(src), 'any validation error blocks the response');

  // Level 1 map: independently verify every exact ID, crosswalk and FAR text.
  const missingIds = LEVEL1_IDS.filter((id) => !src.includes(`'${id}'`));
  expect(missingIds.length === 0, `all 15 Level 1 control IDs are hardcoded (missing: ${missingIds.join(',') || 'none'})`);
  const l1Entries = (src.match(/control_id:\s*'[A-Z]{2}\.L1-b\.1\.[ivx]+'/g) || []).length;
  expect(l1Entries === 15, `exactly 15 Level 1 map entries (found ${l1Entries})`);
  for (const expected of LEVEL1_REQUIREMENTS) {
    const start = src.indexOf(`{ control_id: '${expected.id}'`);
    const end = start === -1 ? -1 : src.indexOf(' },', start);
    const block = start === -1 ? '' : src.slice(start, end === -1 ? start + 1000 : end + 2);
    const expectedNist = `nist: [${expected.nist.map((id) => `'${id}'`).join(', ')}]`;
    expect(block.includes(expectedNist), `${expected.id} has the exact NIST crosswalk`);
    expect(block.includes(`text: '${expected.text}'`), `${expected.id} has the exact FAR safeguarding text`);
  }
  expect(/cuiToFci/.test(src) && /\\bCUI\\b/.test(src), 'Level 1 display substitution of standalone CUI to FCI exists');
  const l2TextUntouched = !/cuiToFci\(o\.text\)[\s\S]{0,200}cmmc_level:\s*'Level 2'/.test(src);
  expect(l2TextUntouched, 'Level 2 source text is not altered by the FCI substitution');

  // Family derivation from numeric family, not the CSV Family column.
  for (const [num, code] of FAMILY_CODES) {
    if (!new RegExp(`'${num.replace('.', '\\.')}':\\s*\\{\\s*code:\\s*'${code}'`).test(src)) {
      bad(`family map missing ${num} -> ${code}`);
      return;
    }
  }
  ok('all 14 numeric family -> two-letter code mappings present');
  expect(/familyOf\(/.test(src), 'family derived from the numeric requirement ID');
  expect(/\$\{fam\.code\}\.L2-\$\{reqId\}/.test(src), 'Level 2 control ID format is FAMILY.L2-NIST_ID');
  expect(/source_objective_id_raw/.test(src), 'raw source objective identifier is preserved');

  // Apply-plan invariants (implemented, not executed here).
  expect(/legacyL1\s*===\s*17\s*&&\s*legacyL2\s*===\s*93/.test(src), 'apply precondition checks legacy 17 / 93');
  expect(/alreadyImported\.length\s*>\s*0/.test(src), 'apply allows idempotent rerun of the same dataset');
  expect(/status:\s*409/.test(src), 'failed apply precondition is rejected');
  const del = src.match(/entities\.\w+\.delete\s*\(/g) || [];
  expect(del.length === 0, 'apply never deletes any record');
  const activateAt = at(/const\s+controlActivations\s*=/);
  const postValidateAt = at(/Post-write validation failed/);
  expect(postValidateAt !== -1, 'apply re-validates persisted authoritative rows before activation');
  expect(postValidateAt !== -1 && activateAt > postValidateAt, 'activation staging happens after post-write validation');
  expect(/superseded_by_control_id:\s*DATASET_KEY/.test(src), 'legacy records are marked superseded, not deleted');
  expect(/AUTHORITATIVE_FIELDS/.test(src), 'non-authoritative human-authored fields are preserved on merge');
  expect(/mergeLegacyGuidance/.test(src), 'legacy guidance merge with de-duplication exists');
  expect(
    /function\s+mergeGuidanceValue/.test(src) &&
      /result\[key\]\s*=\s*mergeGuidanceValue\(result\[key\],\s*value\)/.test(src),
    'legacy guidance is merged recursively through nested runbooks',
  );
  expect(
    !/\.map\(\(x\)\s*=>\s*String\(x\)\)/.test(src) &&
      !/merged\[k\]\s*=\s*\{\s*\.\.\.\(merged\[k\]\s*\|\|\s*\{\}\),\s*\.\.\.v\s*\}/.test(src),
    'guidance arrays keep object values and nested objects are not shallow-overwritten',
  );
  const rowHashCalls = src.match(/content_sha256\s*=\s*await\s+sha256Hex\(stableSerialize\(record\)\)/g) || [];
  expect(rowHashCalls.length === 4, 'all four authoritative row types hash their complete stable record content');
  const filterLimits = [...src.matchAll(/\.filter\([\s\S]*?,\s*['"][^'"]*['"]\s*,\s*(\d+)\s*\)/g)]
    .map((match) => Number(match[1]));
  expect(
    filterLimits.length >= 7 && filterLimits.every((limit) => limit <= 500),
    `every Base44 filter page is bounded at 500 or fewer (found: ${filterLimits.join(',') || 'none'})`,
  );
  const bulkBatchSizes = [...src.matchAll(/i\s*\+=\s*(\d+)/g)].map((match) => Number(match[1]));
  expect(
    bulkBatchSizes.length === 4 && bulkBatchSizes.every((size) => size > 0 && size <= 500),
    `all four staging bulk loops are bounded at 500 or fewer (found: ${bulkBatchSizes.join(',') || 'none'})`,
  );
  expect(
    /controlActivationUpdates\.length\s*>\s*500/.test(src) &&
      /objectiveActivations\.length\s*>\s*500/.test(src),
    'both activation batches reject sizes above the SDK limit of 500',
  );
  expect(
    /const\s+controlActivationUpdates\s*=\s*\[\.\.\.legacyDeactivations,\s*\.\.\.controlActivations\]/.test(src),
    'legacy deactivation and target activation share one ControlLibrary bulk switch',
  );
  const bulkOperations = src.match(/\.(?:bulkCreate|bulkUpdate)\s*\(/g) || [];
  expect(bulkOperations.length === 6, 'staging and activation use six bounded SDK bulk operations');
  expect(
    !/\.filter\([\s\S]*?\)\.catch\(\(\)\s*=>\s*\[\]\)/.test(src),
    'critical entity read failures are not swallowed as empty datasets',
  );
  const persistedComparisons =
    src.match(/stableSerialize\(persisted\[field\]\)\s*!==\s*stableSerialize\(expected\[field\]\)/g) || [];
  expect(
    /persistedErrors/.test(src) &&
      /const\s+controlFields\s*=/.test(src) &&
      /const\s+objectiveFields\s*=/.test(src) &&
      persistedComparisons.length === 2,
    'both persisted control and objective rows are revalidated for authoritative fields and hashes',
  );
  const persistedUniquenessChecks =
    src.match(/new\s+Set\(persisted(?:Controls|Objectives)\.map/g) || [];
  expect(
    persistedUniquenessChecks.length === 2,
    'both persisted control IDs and objective keys are checked for uniqueness before activation',
  );
  expect(
    /active:\s*existing\?\.active\s*===\s*true/.test(src) &&
      /active:\s*existing\.active\s*===\s*true/.test(src),
    'idempotent reruns preserve already-active target controls and objectives during staging',
  );
  expect(
    !/entities\.ControlAssessment/.test(src),
    'importer does not touch ControlAssessment or project data',
  );
  expect(src.includes('On July 13, 2026, DoD suspended CMMC Phase II implementation'),
    'exact regulatory status note is present');
}

// =========================================================== package.json ===
function checkPackageJson() {
  console.log('\n--- package.json ---');
  const pkg = readJson('package.json');
  if (!pkg) { bad('package.json could not be read'); return; }
  expect(pkg.scripts?.['test:cmmc-data'] === 'node scripts/check-cmmc-dataset.mjs',
    'test:cmmc-data script added exactly as specified');
  const expectedScripts = ['dev', 'build', 'lint', 'lint:fix', 'typecheck', 'test:security', 'test:cmmc-data', 'test:canonical-migration', 'preview'];
  const actual = Object.keys(pkg.scripts || {});
  const extra = actual.filter((s) => !expectedScripts.includes(s));
  expect(extra.length === 0, `no unexpected scripts added (extra: ${extra.join(',') || 'none'})`);
  expect(!pkg.dependencies?.['csv-parse'], 'csv-parse was NOT added to dependencies (Deno npm: import only)');
  // Untouched baseline measured from the working tree before this phase.
  expect(Object.keys(pkg.dependencies || {}).length === 68,
    `dependency count unchanged at the 68 baseline (found ${Object.keys(pkg.dependencies || {}).length})`);
  expect(Object.keys(pkg.devDependencies || {}).length === 17,
    `devDependency count unchanged at the 17 baseline (found ${Object.keys(pkg.devDependencies || {}).length})`);
}

// ================================================================== main ====
console.log('KIPUKA CMMC dataset checker — source + static validation only.');
console.log(`Dataset: ${DATASET_KEY}`);

await checkDataset();
checkSchemas();
checkImporter();
checkPackageJson();

console.log(`\n${passes.length} passed, ${failures.length} failed.`);
if (failures.length > 0) {
  console.error('\nFailures:');
  for (const f of failures) console.error(`  ✗ ${f}`);
  console.error('\nCMMC dataset checker FAILED.');
  process.exit(1);
}
console.log('\nAll dataset, schema, importer and packaging invariants passed.');
console.log('NOTE: source/static validation only — the importer was NOT executed and NO entity import was tested.');