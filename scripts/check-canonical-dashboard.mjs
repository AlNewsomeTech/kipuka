#!/usr/bin/env node
// Phase 3C — canonical portfolio and dashboard cutover checker.
//
// Dependency-free static analysis. Fails closed: a missing file, an unreadable
// file, or any unmet invariant exits non-zero.
//
// Invariants proven here:
//   * the four runtime dashboard files never touch CMMCControl / ControlProgress
//     entities and never write any entity;
//   * Dashboard.jsx is a pure canonical router (resolveProjectIdForClient +
//     <Navigate replace>) with no legacy selected-client data loading;
//   * AdminClientSummary renders one target-level denominator and routes to the
//     Project, never to /board, /controls, or /level2;
//   * clientControlCompletion reads only Project + ControlAssessment, reuses the
//     SPRS status helpers, validates 15/110 exactly, and never converts a read
//     failure into valid zero progress;
//   * OrgDashboard derives the level from Project alone and suppresses readiness
//     on invalid data;
//   * the obsolete 17 / 93 requirement split appears nowhere in these files;
//   * package.json gains only test:canonical-dashboard;
//   * check-cmmc-dataset.mjs authorizes test:canonical-dashboard.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

let passed = 0;
const failures = [];

function check(label, ok, detail = '') {
  if (ok) { passed += 1; return true; }
  failures.push(detail ? `${label} — ${detail}` : label);
  return false;
}

function read(relPath) {
  const abs = join(ROOT, relPath);
  if (!existsSync(abs)) { failures.push(`missing required file: ${relPath}`); return null; }
  try { return readFileSync(abs, 'utf8'); } catch (err) {
    failures.push(`unreadable file ${relPath}: ${err.message}`);
    return null;
  }
}

// Strip line and block comments so a comment can never satisfy an assertion.
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
}

const RUNTIME_FILES = [
  'src/pages/Dashboard.jsx',
  'src/components/dashboard/AdminClientSummary.jsx',
  'src/components/dashboard/OrgDashboard.jsx',
  'src/lib/clientControlCompletion.js',
];

const sources = {};
for (const f of RUNTIME_FILES) {
  const raw = read(f);
  sources[f] = raw === null ? null : stripComments(raw);
}

// ---------------------------------------------------------------------------
// 1. No retired models and no entity writes in any runtime file.
// ---------------------------------------------------------------------------
const WRITE_OPS = ['create', 'update', 'delete', 'bulkCreate', 'bulkUpdate', 'updateMany', 'deleteMany'];

for (const f of RUNTIME_FILES) {
  const src = sources[f];
  if (src === null) continue;

  check(`${f}: no CMMCControl token`, !/CMMCControl/.test(src));

  // loadControlProgressSets is a permitted canonical-only compatibility export;
  // remove that exact identifier before scanning for the retired model name.
  const withoutCompatName = src.replace(/loadControlProgressSets/g, 'loadCanonicalSets');
  check(`${f}: no ControlProgress token`, !/ControlProgress/.test(withoutCompatName));

  for (const op of WRITE_OPS) {
    const re = new RegExp(`entities\\.[A-Za-z0-9_]+\\s*\\.\\s*${op}\\s*\\(`);
    check(`${f}: no entity ${op}() call`, !re.test(src));
  }

  // The obsolete requirement split must not survive as a standalone number or string.
  check(`${f}: no standalone 17`, !/(^|[^\w.$-])17(?![\w.-])/.test(src), 'obsolete Level 1 count');
  check(`${f}: no standalone 93`, !/(^|[^\w.$-])93(?![\w.-])/.test(src), 'obsolete Level 2 count');
}

// ---------------------------------------------------------------------------
// 2. Dashboard.jsx — canonical router only.
// ---------------------------------------------------------------------------
const dash = sources['src/pages/Dashboard.jsx'];
if (dash !== null) {
  const LEGACY_ENTITIES = ['DeploymentTask', 'Screenshot', 'GeneratedDocument', 'EvidenceItem', 'ControlValidation'];
  for (const ent of LEGACY_ENTITIES) {
    check(`Dashboard: no legacy ${ent} read`, !new RegExp(`entities\\.${ent}\\b`).test(dash));
  }
  const LEGACY_IMPORTS = ['loadProgressMap', 'mergeControl', 'ProgressSummary', 'ClientProgressOverview', 'WeeklyReportModal', 'StatCard', 'ProgressBar'];
  for (const sym of LEGACY_IMPORTS) {
    check(`Dashboard: no legacy ${sym} import`, !new RegExp(`\\b${sym}\\b`).test(dash));
  }
  check('Dashboard: no /board navigation', !/['"`]\/board/.test(dash));
  check('Dashboard: no /controls navigation', !/['"`]\/controls/.test(dash));
  check('Dashboard: no /level2 navigation', !/['"`]\/level2/.test(dash));

  check('Dashboard: imports resolveProjectIdForClient', /import\s*\{[^}]*resolveProjectIdForClient[^}]*\}\s*from\s*['"]@\/lib\/clientProject['"]/.test(dash));
  check('Dashboard: calls resolveProjectIdForClient', /resolveProjectIdForClient\s*\(\s*selectedClientId\s*\)/.test(dash));
  check('Dashboard: imports Navigate', /import\s*\{[^}]*\bNavigate\b[^}]*\}\s*from\s*['"]react-router-dom['"]/.test(dash));
  check('Dashboard: redirects to the canonical project route with replace',
    /<Navigate\s+to=\{`\/projects\/\$\{projectId\}`\}\s+replace\s*\/>/.test(dash));
  check('Dashboard: shows a centered spinner while resolving',
    /resolving/.test(dash) && /animate-spin/.test(dash));
  check('Dashboard: fails closed to an EmptyState linking to /projects',
    /<EmptyState/.test(dash) && /to="\/projects"/.test(dash));
  check('Dashboard: preserves org self-service OrgDashboard branch',
    /<OrgDashboard\s+organizationId=\{selectedOrgId\}/.test(dash));
  check('Dashboard: preserves the AdminClientSummary portfolio branch',
    /<AdminClientSummary\s*\/>/.test(dash));
}

// ---------------------------------------------------------------------------
// 3. AdminClientSummary — one canonical denominator, project navigation.
// ---------------------------------------------------------------------------
const admin = sources['src/components/dashboard/AdminClientSummary.jsx'];
if (admin !== null) {
  check('AdminClientSummary: imports loadCanonicalClientProgress',
    /import\s*\{[^}]*loadCanonicalClientProgress[^}]*\}\s*from\s*['"]@\/lib\/clientControlCompletion['"]/.test(admin));
  check('AdminClientSummary: calls loadCanonicalClientProgress per client',
    /loadCanonicalClientProgress\s*\(\s*client\.id\s*\)/.test(admin));
  check('AdminClientSummary: isolates per-client failures', /try\s*\{[\s\S]*catch\s*\(/.test(admin));
  check('AdminClientSummary: uses the resolved expectedTotal as the denominator',
    /\{completed\}\/\{expectedTotal\}/.test(admin));
  check('AdminClientSummary: uses the project target level for the label',
    /project\?\.target_cmmc_level/.test(admin));
  check('AdminClientSummary: does not read Client.target_cmmc_level',
    !/client\.target_cmmc_level/.test(admin));
  check('AdminClientSummary: gates all progress rendering on integrityOk',
    /integrityOk\s*\?/.test(admin));
  check('AdminClientSummary: shows an unavailable / integrity state',
    /Data unavailable/.test(admin) && /Integrity issue/.test(admin));
  check('AdminClientSummary: navigates to the canonical project route',
    /navigate\(\s*result\?\.projectId\s*\?\s*`\/projects\/\$\{result\.projectId\}`\s*:\s*['"]\/projects['"]\s*\)/.test(admin));
  check('AdminClientSummary: preserves client selection', /setSelectedClientId\(\s*client\.id\s*\)/.test(admin));
  check('AdminClientSummary: no /board navigation', !/['"`]\/board/.test(admin));
  check('AdminClientSummary: no /controls navigation', !/['"`]\/controls/.test(admin));
  check('AdminClientSummary: no /level2 navigation', !/['"`]\/level2/.test(admin));
  check('AdminClientSummary: keeps the responsive premium grid',
    /md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4/.test(admin) && /app-surface app-surface-interactive/.test(admin));
}

// ---------------------------------------------------------------------------
// 4. clientControlCompletion — canonical-only, validated.
// ---------------------------------------------------------------------------
const lib = sources['src/lib/clientControlCompletion.js'];
if (lib !== null) {
  check('clientControlCompletion: no loadProgressMap import', !/loadProgressMap/.test(lib));
  check('clientControlCompletion: no controlProgress module import', !/@\/lib\/controlProgress/.test(lib));
  check('clientControlCompletion: uses resolveProjectIdForClient',
    /resolveProjectIdForClient\s*\(\s*clientId\s*\)/.test(lib));
  check('clientControlCompletion: imports the SPRS status helpers',
    /import\s*\{[^}]*isMetStatus[^}]*isInProgressStatus[^}]*\}\s*from\s*['"]@\/lib\/sprsScoring['"]/.test(lib));
  check('clientControlCompletion: uses isMetStatus', /isMetStatus\s*\(/.test(lib));
  check('clientControlCompletion: uses isInProgressStatus', /isInProgressStatus\s*\(/.test(lib));
  check('clientControlCompletion: does not duplicate a status list',
    !/'Ready for Assessment'/.test(lib) && !/'Evidence Accepted'/.test(lib));

  const entityReads = [...lib.matchAll(/entities\.([A-Za-z0-9_]+)/g)].map((m) => m[1]);
  const allowed = new Set(['Project', 'ControlAssessment']);
  check('clientControlCompletion: reads only Project and ControlAssessment',
    entityReads.length > 0 && entityReads.every((e) => allowed.has(e)),
    `found: ${[...new Set(entityReads)].join(', ') || 'none'}`);
  check('clientControlCompletion: reads Project', entityReads.includes('Project'));
  check('clientControlCompletion: reads ControlAssessment', entityReads.includes('ControlAssessment'));

  check('clientControlCompletion: exports loadCanonicalClientProgress',
    /export\s+async\s+function\s+loadCanonicalClientProgress\s*\(/.test(lib));
  check('clientControlCompletion: exports loadCompletedControlIds',
    /export\s+async\s+function\s+loadCompletedControlIds\s*\(/.test(lib));
  check('clientControlCompletion: exports loadControlProgressSets',
    /export\s+async\s+function\s+loadControlProgressSets\s*\(/.test(lib));

  check('clientControlCompletion: Level 1 total is 15', /LEVEL_1_REQUIREMENT_TOTAL\s*=\s*15\b/.test(lib));
  check('clientControlCompletion: Level 2 total is 110', /LEVEL_2_REQUIREMENT_TOTAL\s*=\s*110\b/.test(lib));
  check('clientControlCompletion: expectedTotal is exact-level gated',
    /targetLevel\s*===\s*'Level 1'/.test(lib) && /targetLevel\s*===\s*'Level 2'/.test(lib) && /return null/.test(lib));
  check('clientControlCompletion: never sums the two levels into 125', !/125/.test(lib));

  check('clientControlCompletion: validates the record count', /assessments\.length\s*!==\s*expectedTotal/.test(lib));
  check('clientControlCompletion: validates unique control IDs', /actualUniqueTotal\s*!==\s*expectedTotal/.test(lib));
  check('clientControlCompletion: detects duplicates', /actualUniqueTotal\s*!==\s*nonBlankIds\.length/.test(lib));
  check('clientControlCompletion: detects blank control IDs', /nonBlankIds\.length\s*!==\s*ids\.length/.test(lib));
  check('clientControlCompletion: validates project ownership',
    /a\.project_id\s*!==\s*projectId/.test(lib));
  check('clientControlCompletion: integrityOk requires zero issues',
    /integrityOk\s*=\s*integrityIssues\.length\s*===\s*0/.test(lib));

  // No swallowed read failure may produce a valid zero-progress result.
  check('clientControlCompletion: no .catch(() => []) fallback', !/catch\s*\(\s*\)\s*=>|\.catch\(\s*\(\s*\)\s*=>/.test(lib));
  check('clientControlCompletion: read failures return an error result',
    /catch\s*\(\s*err\s*\)\s*\{\s*return\s+unavailable\(/.test(lib));
  check('clientControlCompletion: the unavailable result is never integrityOk',
    /integrityOk:\s*false/.test(lib) && /expectedTotal:\s*null/.test(lib));

  for (const op of WRITE_OPS) {
    check(`clientControlCompletion: no ${op}() operation`,
      !new RegExp(`entities\\.[A-Za-z0-9_]+\\s*\\.\\s*${op}\\s*\\(`).test(lib));
  }
}

// ---------------------------------------------------------------------------
// 5. OrgDashboard — project-only level authority, suppressed readiness.
// ---------------------------------------------------------------------------
const org = sources['src/components/dashboard/OrgDashboard.jsx'];
if (org !== null) {
  check('OrgDashboard: target level comes from the project',
    /targetLevel\s*=\s*project\?\.target_cmmc_level/.test(org));
  check('OrgDashboard: cmmc_track cannot override the project level',
    !/cmmc_track/.test(org));
  check('OrgDashboard: Level 1 expects 15', /'Level 1'\s*\?\s*15\b/.test(org));
  check('OrgDashboard: Level 2 expects 110', /'Level 2'\s*\?\s*110\b/.test(org));
  check('OrgDashboard: states 15 FAR 52.204-21 requirements', /15 FAR 52\.204-21 requirements/.test(org));
  check('OrgDashboard: states 110 NIST SP 800-171 requirements', /110 NIST SP 800-171 requirements/.test(org));
  check('OrgDashboard: delegates integrity to the canonical engine', /computeCanonicalReadiness/.test(org));
  check('OrgDashboard: passes authoritative objective rows', /objectiveLibrary/.test(org));
  check('OrgDashboard: passes objective findings', /objectiveLinks/.test(org));
  check('OrgDashboard: passes final evidence', /computeCanonicalReadiness\s*\(\s*\{[\s\S]*evidence/.test(org));
  check('OrgDashboard: uses canonical integrity result', /canonical\.integrity_ok/.test(org));
  check('OrgDashboard: suppresses readiness when integrity fails', /integrity\.ok\s*\?/.test(org));
  check('OrgDashboard: shows a visible integrity warning', /Control data integrity issue/.test(org));
  check('OrgDashboard: met/total claim uses the canonical result and authoritative denominator',
    /\{canonical\.met\} of \{expectedTotal\} requirements are MET/.test(org));
  check('OrgDashboard: keeps the project workspace link', /to=\{`\/projects\/\$\{project\.id\}`\}/.test(org));
  check('OrgDashboard: keeps the evidence surface', /\/evidence`\}/.test(org));
  check('OrgDashboard: keeps the POA&M surface', /\/poam`\}/.test(org));
  check('OrgDashboard: keeps the asset surface', /to="\/org-assets"/.test(org));
  check('OrgDashboard: keeps the SPRS widget', /<SprsScoreWidget/.test(org));
  check('OrgDashboard: keeps the charts', /<ControlStatusDonut/.test(org) && /<FamilyProgressBars/.test(org));
}

// ---------------------------------------------------------------------------
// 6. package.json — only the new script is added.
// ---------------------------------------------------------------------------
const pkgRaw = read('package.json');
if (pkgRaw !== null) {
  let pkg = null;
  try { pkg = JSON.parse(pkgRaw); } catch (err) { failures.push(`package.json is not valid JSON: ${err.message}`); }
  if (pkg) {
    const expected = {
      dev: 'vite',
      build: 'vite build',
      lint: 'eslint . --quiet',
      'lint:fix': 'eslint . --fix',
      typecheck: 'tsc -p ./jsconfig.json',
      'test:security': 'node scripts/check-authorization-gates.mjs',
      'test:cmmc-data': 'node scripts/check-cmmc-dataset.mjs',
      'test:canonical-migration': 'node scripts/check-canonical-project-migration.mjs',
      'test:canonical-runtime': 'node scripts/check-canonical-runtime.mjs',
      'test:canonical-dashboard': 'node scripts/check-canonical-dashboard.mjs',
      'test:canonical-readiness': 'node scripts/check-canonical-readiness.mjs',
      'test:canonical-documents': 'node scripts/check-canonical-documents.mjs',
      'test:canonical-evidence': 'node scripts/check-canonical-evidence.mjs',
      'test:control-applicability': 'node scripts/check-control-applicability.mjs',
      preview: 'vite preview',
    };
    const scripts = pkg.scripts || {};
    for (const [name, value] of Object.entries(expected)) {
      check(`package.json script ${name} is intact`, scripts[name] === value, `found ${JSON.stringify(scripts[name])}`);
    }
    const extra = Object.keys(scripts).filter((k) => !(k in expected));
    check('package.json adds no unexpected scripts', extra.length === 0, extra.join(', '));
  }
}

// ---------------------------------------------------------------------------
// 7. The dataset checker authorizes the new script.
// ---------------------------------------------------------------------------
const datasetChecker = read('scripts/check-cmmc-dataset.mjs');
if (datasetChecker !== null) {
  check('check-cmmc-dataset.mjs authorizes test:canonical-dashboard',
    /'test:canonical-dashboard'/.test(datasetChecker));
  check('check-cmmc-dataset.mjs still authorizes test:canonical-runtime',
    /'test:canonical-runtime'/.test(datasetChecker));
  check('check-cmmc-dataset.mjs keeps its unexpected-script assertion',
    /no unexpected scripts added/.test(datasetChecker));
}

// ---------------------------------------------------------------------------
console.log(`\nPhase 3C canonical dashboard checks: ${passed} passed, ${failures.length} failed.`);
if (failures.length > 0) {
  console.error('\nFAILURES:');
  failures.forEach((f) => console.error(`  - ${f}`));
  process.exit(1);
}
console.log('All Phase 3C canonical dashboard invariants hold.\n');