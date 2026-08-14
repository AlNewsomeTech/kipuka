#!/usr/bin/env node
// ============================================================================
// KIPUKA PHASE 3B — CANONICAL RUNTIME CUTOVER CHECKER
//
// Dependency-free static verification that the retired 17/93 CMMCControl
// runtime is no longer reachable and that ControlAssessment is the only
// control system of record written by the shared progress adapter.
//
// Fails closed: any missing file, unreadable path, or unmet assertion exits 1.
// ============================================================================

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

let passed = 0;
const failures = [];

function check(name, condition, detail = '') {
  if (condition) {
    passed++;
  } else {
    failures.push(detail ? `${name} — ${detail}` : name);
  }
}

function read(relPath) {
  try {
    return readFileSync(join(ROOT, relPath), 'utf8');
  } catch (error) {
    failures.push(`Cannot read required file ${relPath}: ${error.message}`);
    return null;
  }
}

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch (error) {
    failures.push(`Cannot read directory ${dir}: ${error.message}`);
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    const info = statSync(full);
    if (info.isDirectory()) walk(full, out);
    else if (/\.(jsx?|tsx?)$/.test(entry)) out.push(full);
  }
  return out;
}

// Strip comments so commentary can never satisfy or break an assertion.
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

// ---------------------------------------------------------------------------
// 1. No ControlProgress entity write anywhere under src.
// ---------------------------------------------------------------------------
const WRITE_OPS = ['create', 'update', 'delete', 'bulkCreate', 'bulkUpdate', 'updateMany', 'deleteMany'];

const sourceFiles = walk(join(ROOT, 'src'));
check('src contains source files', sourceFiles.length > 0, `found ${sourceFiles.length}`);

const writeOffenders = [];
const computedOffenders = [];
for (const file of sourceFiles) {
  const code = stripComments(readFileSync(file, 'utf8'));
  const rel = relative(ROOT, file);
  for (const op of WRITE_OPS) {
    if (new RegExp(`ControlProgress\\s*\\.\\s*${op}\\s*\\(`).test(code)) {
      writeOffenders.push(`${rel}: ControlProgress.${op}(`);
    }
  }
  // Computed-property access, e.g. entities['ControlProgress'].create(...)
  if (/\[\s*['"`]ControlProgress['"`]\s*\]/.test(code)) {
    computedOffenders.push(`${rel}: computed ControlProgress access`);
  }
  // Facade write: a variable aliased to the ControlProgress entity.
  if (/=\s*[A-Za-z0-9_.]*entities\s*\.\s*ControlProgress\b/.test(code)) {
    computedOffenders.push(`${rel}: aliased ControlProgress entity handle`);
  }
}
check('No ControlProgress write call under src', writeOffenders.length === 0, writeOffenders.join('; '));
check('No computed/aliased ControlProgress access under src', computedOffenders.length === 0, computedOffenders.join('; '));

// ---------------------------------------------------------------------------
// 2. controlProgress.js is fully canonical.
// ---------------------------------------------------------------------------
const progressRaw = read('src/lib/controlProgress.js');
if (progressRaw !== null) {
  const progress = stripComments(progressRaw);

  check('controlProgress.js has no ControlProgress entity access at all',
    !/entities\s*\.\s*ControlProgress\b/.test(progress) && !/\[\s*['"`]ControlProgress['"`]\s*\]/.test(progress));

  for (const name of ['PROGRESS_FIELDS', 'loadProgressMap', 'mergeControl', 'saveProgress']) {
    check(`controlProgress.js still exports ${name}`,
      new RegExp(`export\\s+(?:async\\s+)?(?:function\\s+${name}\\b|const\\s+${name}\\b)`).test(progress));
  }

  for (const imported of ['resolveProjectIdForClient', 'assessmentToConsultantStatus', 'consultantToAssessmentStatus']) {
    check(`controlProgress.js imports ${imported}`, new RegExp(`\\b${imported}\\b`).test(progress));
  }
  check('controlProgress.js imports from @/lib/clientProject', /from\s+['"]@\/lib\/clientProject['"]/.test(progress));

  check('controlProgress.js resolves the project', /resolveProjectIdForClient\s*\(/.test(progress));
  check('controlProgress.js reads ControlAssessment', /ControlAssessment\s*\.\s*filter\s*\(/.test(progress));
  check('controlProgress.js updates ControlAssessment', /ControlAssessment\s*\.\s*update\s*\(/.test(progress));
  check('controlProgress.js never creates a ControlAssessment', !/ControlAssessment\s*\.\s*(create|bulkCreate)\s*\(/.test(progress));

  check('controlProgress.js enforces exactly one assessment row',
    /rows\.length\s*===\s*0/.test(progress) && /rows\.length\s*>\s*1/.test(progress));
  check('controlProgress.js throws when no project resolves', /throw new Error\(/.test(progress));

  for (const field of ['responsible_owner', 'implementation_summary', 'assessor_notes']) {
    check(`controlProgress.js maps canonical field ${field}`, new RegExp(`\\b${field}\\b`).test(progress));
  }
  check('controlProgress.js maps status through consultantToAssessmentStatus',
    /payload\.status\s*=\s*consultantToAssessmentStatus\s*\(/.test(progress));
  check('controlProgress.js does not persist legacy count fields',
    !/payload\.(evidence_count|screenshot_count|export_count)/.test(progress));
  check('controlProgress.js preserves the assessment id as _assessmentId', /_assessmentId/.test(progress));
}

// ---------------------------------------------------------------------------
// 3. App.jsx routes the retired URLs to the redirect only.
// ---------------------------------------------------------------------------
const appRaw = read('src/App.jsx');
if (appRaw !== null) {
  const app = stripComments(appRaw);

  check('App.jsx imports CanonicalControlsRedirect',
    /import\s+CanonicalControlsRedirect\s+from\s+['"]@\/pages\/CanonicalControlsRedirect['"]/.test(app));

  for (const retired of ['CMMCControls', 'ControlDetail', 'Level2Readiness']) {
    check(`App.jsx no longer imports ${retired}`,
      !new RegExp(`import\\s+${retired}\\s+from`).test(app));
    check(`App.jsx no longer renders <${retired} />`, !new RegExp(`<${retired}\\b`).test(app));
  }

  for (const path of ['/controls', '/controls/:id', '/level2']) {
    const route = new RegExp(`path=["']${path.replace(/[/:]/g, (c) => (c === ':' ? ':' : '\\/'))}["']\\s+element=\\{<CanonicalControlsRedirect\\s*/>\\}`);
    check(`App.jsx routes ${path} to CanonicalControlsRedirect`, route.test(app));
  }
}

// ---------------------------------------------------------------------------
// 4. Layout.jsx no longer links to the retired screens.
// ---------------------------------------------------------------------------
const layoutRaw = read('src/components/Layout.jsx');
if (layoutRaw !== null) {
  const layout = stripComments(layoutRaw);
  check('Layout.jsx has no /controls nav link', !/to:\s*['"]\/controls['"]/.test(layout));
  check('Layout.jsx has no /level2 nav link', !/to:\s*['"]\/level2['"]/.test(layout));
  check('Layout.jsx has no "CMMC Controls" nav section', !/label:\s*['"]CMMC Controls['"]/.test(layout));
  check('Layout.jsx retains the /projects nav link', /to:\s*['"]\/projects['"]/.test(layout));
}

// ---------------------------------------------------------------------------
// 5. CanonicalControlsRedirect is read-only and uses Navigate replace.
// ---------------------------------------------------------------------------
const redirectRaw = read('src/pages/CanonicalControlsRedirect.jsx');
if (redirectRaw !== null) {
  const redirect = stripComments(redirectRaw);
  check('Redirect uses useClient', /\buseClient\s*\(/.test(redirect));
  check('Redirect uses resolveProjectIdForClient', /resolveProjectIdForClient\s*\(/.test(redirect));
  check('Redirect renders <Navigate replace', /<Navigate\s+replace\b/.test(redirect));
  check('Redirect targets the project assessment module', /\/projects\/\$\{projectId\}\/assessment/.test(redirect));
  check('Redirect falls back to /projects', /to="\/projects"/.test(redirect));
  check('Redirect performs no entity write',
    !/entities\s*\.\s*[A-Za-z0-9_]+\s*\.\s*(create|update|delete|bulkCreate|bulkUpdate|updateMany|deleteMany)\s*\(/.test(redirect));
  check('Redirect shows the standard spinner', /animate-spin/.test(redirect));
}

// ---------------------------------------------------------------------------
// 6. package.json adds only the new script.
// ---------------------------------------------------------------------------
const pkgRaw = read('package.json');
if (pkgRaw !== null) {
  let pkg = null;
  try { pkg = JSON.parse(pkgRaw); } catch (error) { failures.push(`package.json is not valid JSON: ${error.message}`); }
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
      'test:website-scanner': 'node scripts/check-website-scanner.mjs',
      'test:secure-score-import': 'node scripts/check-secure-score-import.mjs',
      'test:phase7-final-handoff': 'node scripts/check-phase7-final-handoff.mjs',
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
console.log(`\nPhase 3B canonical runtime checks: ${passed} passed, ${failures.length} failed.`);
if (failures.length > 0) {
  console.error('\nFAILURES:');
  failures.forEach((f) => console.error(`  - ${f}`));
  process.exit(1);
}
console.log('All Phase 3B canonical runtime invariants hold.\n');