#!/usr/bin/env node
// ============================================================================
// KIPUKA — PUBLIC LANDING PAGE REGRESSION CHECKER
//
// Dependency-free static verification that:
//   1. Unauthenticated visitors get the public landing experience while every
//      protected route and the existing login flow are preserved.
//   2. The landing surface never requests protected application data.
//   3. CTAs are wired (Log In -> platform login, Request a Demo -> intake).
//   4. Accessibility basics are present.
//   5. No unsupported marketing claims or forbidden phrases exist.
//
// Fails closed: any missing file or unmet assertion exits 1.
// ============================================================================

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

let passed = 0;
const failures = [];

function check(name, condition, detail = '') {
  if (condition) passed++;
  else failures.push(detail ? `${name} — ${detail}` : name);
}

function read(relPath) {
  try {
    return readFileSync(join(ROOT, relPath), 'utf8');
  } catch (error) {
    failures.push(`Cannot read required file ${relPath}: ${error.message}`);
    return null;
  }
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
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

// ---------------------------------------------------------------------------
// 1. App.jsx: public access wired, protected routes preserved.
// ---------------------------------------------------------------------------
const appRaw = read('src/App.jsx');
if (appRaw !== null) {
  const app = stripComments(appRaw);

  check('App.jsx imports PublicApp',
    /import\s+PublicApp\s+from\s+['"]@\/components\/public\/PublicApp['"]/.test(app));
  check('auth_required renders PublicApp instead of an immediate redirect',
    /authError\.type\s*===\s*'auth_required'[\s\S]{0,400}?return\s*<PublicApp\s*\/>/.test(app));
  check('Unauthenticated (no token) visitors also get PublicApp',
    /if\s*\(\s*!isAuthenticated\s*\)\s*\{\s*return\s*<PublicApp\s*\/>/.test(app));
  check('user_not_registered error page preserved',
    /authError\.type\s*===\s*'user_not_registered'[\s\S]{0,120}?<UserNotRegisteredError\s*\/>/.test(app));

  // Protected application routes remain intact.
  for (const path of ['/projects', '/clients', '/saas-admin', '/users', '/acolyte', '/org-settings']) {
    check(`App.jsx keeps protected route ${path}`, app.includes(`path="${path}"`));
  }
  check('Dashboard remains the authenticated root route',
    /<Route\s+path="\/"\s+element=\{<Dashboard\s*\/>\}/.test(app));
  check('RoleRoute admin/technician gating preserved',
    /allow=\{\['admin',\s*'technician'\]\}/.test(app) && /allow=\{\['admin'\]\}/.test(app));
}

// ---------------------------------------------------------------------------
// 2. PublicApp: only public routes; catch-all preserves the login flow.
// ---------------------------------------------------------------------------
const publicAppRaw = read('src/components/public/PublicApp.jsx');
if (publicAppRaw !== null) {
  const publicApp = stripComments(publicAppRaw);
  check('PublicApp routes "/" to LandingPage',
    /<Route\s+path="\/"\s+element=\{<LandingPage\s*\/>\}/.test(publicApp));
  check('PublicApp has a public privacy route', /path="\/privacy"/.test(publicApp));
  check('PublicApp has a public terms route', /path="\/legal-terms"/.test(publicApp));
  check('PublicApp catch-all redirects to login',
    /<Route\s+path="\*"\s+element=\{<LoginRedirect\s*\/>\}/.test(publicApp));
}

const loginRedirectRaw = read('src/components/public/LoginRedirect.jsx');
if (loginRedirectRaw !== null) {
  check('LoginRedirect uses the existing platform login flow',
    /navigateToLogin\(\)/.test(loginRedirectRaw) && /useAuth/.test(loginRedirectRaw));
}

// ---------------------------------------------------------------------------
// 3. Landing surface never requests protected application data.
// ---------------------------------------------------------------------------
const landingFiles = [
  ...walk(join(ROOT, 'src/components/landing')),
  ...walk(join(ROOT, 'src/components/public')),
  join(ROOT, 'src/pages/public/LandingPage.jsx'),
  join(ROOT, 'src/pages/public/PublicTerms.jsx'),
  join(ROOT, 'src/pages/public/PublicPrivacy.jsx'),
];
check('Landing component files exist', landingFiles.length >= 15, `found ${landingFiles.length}`);

const dataOffenders = [];
const invokeOffenders = [];
let landingCorpus = '';
for (const file of landingFiles) {
  let code;
  try {
    code = readFileSync(file, 'utf8');
  } catch (error) {
    failures.push(`Cannot read ${relative(ROOT, file)}: ${error.message}`);
    continue;
  }
  landingCorpus += `\n${code}`;
  const stripped = stripComments(code);
  const rel = relative(ROOT, file);
  if (/base44\s*\.\s*entities\s*\./.test(stripped) || /base44\s*\.\s*asServiceRole/.test(stripped)) {
    dataOffenders.push(rel);
  }
  const invokes = [...stripped.matchAll(/functions\.invoke\(\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
  for (const fn of invokes) {
    if (fn !== 'submitDemoRequest') invokeOffenders.push(`${rel}: ${fn}`);
  }
}
check('No entity/service-role data access from the landing surface',
  dataOffenders.length === 0, dataOffenders.join('; '));
check('Only the public demo intake function is invoked',
  invokeOffenders.length === 0, invokeOffenders.join('; '));

// ---------------------------------------------------------------------------
// 4. CTA destinations.
// ---------------------------------------------------------------------------
const headerRaw = read('src/components/landing/PublicHeader.jsx');
if (headerRaw !== null) {
  check('Header Log In uses the existing login flow',
    /navigateToLogin\(\)/.test(headerRaw) && /Log In/.test(headerRaw));
  check('Header has Request a Demo CTA',
    /onRequestDemo/.test(headerRaw) && /Request a Demo/.test(headerRaw));
  check('Header has mobile menu with aria-expanded',
    /aria-expanded=\{menuOpen\}/.test(headerRaw));
}

const modalRaw = read('src/components/landing/DemoRequestModal.jsx');
if (modalRaw !== null) {
  check('Demo modal submits to submitDemoRequest',
    /functions\.invoke\(\s*'submitDemoRequest'/.test(modalRaw));
  check('Demo modal has a honeypot field', /website/.test(modalRaw));
  check('Demo modal has labeled inputs', /htmlFor="demo-email"/.test(modalRaw));
}

const fnRaw = read('base44/functions/submitDemoRequest/entry.ts');
if (fnRaw !== null) {
  const fn = stripComments(fnRaw);
  check('submitDemoRequest only creates a DemoRequest record',
    /asServiceRole\.entities\.DemoRequest\.create\(/.test(fn));
  check('submitDemoRequest never reads or lists entities',
    !/\.(list|filter|get|update|delete|bulkCreate|bulkUpdate|updateMany|deleteMany)\s*\(/.test(fn));
  check('submitDemoRequest validates email format', /test\(email\)/.test(fn));
  check('submitDemoRequest enforces the honeypot', /payload\.website/.test(fn));
  check('submitDemoRequest length-caps input fields', /slice\(0,\s*max\)/.test(fn));
}

// ---------------------------------------------------------------------------
// 5. Accessibility basics.
// ---------------------------------------------------------------------------
const heroRaw = read('src/components/landing/HeroSection.jsx');
if (heroRaw !== null) {
  check('Hero contains the single h1', /<h1[\s>]/.test(heroRaw));
}
if (headerRaw !== null) {
  check('Primary nav is labeled', /aria-label="Primary"/.test(headerRaw));
}
const h1Count = (landingCorpus.match(/<h1[\s>]/g) || []).length;
check('Exactly one h1 across the landing surface (excluding standalone legal pages)',
  h1Count === 3, `found ${h1Count} (hero + one per standalone legal page expected)`);
check('Landing sections use labeled headings',
  /aria-labelledby="problem-heading"/.test(landingCorpus) &&
  /aria-labelledby="security-heading"/.test(landingCorpus));
check('Decorative imagery is hidden from assistive tech', /aria-hidden="true"/.test(landingCorpus));
check('Reduced motion is respected', /useReducedMotion/.test(landingCorpus));
check('Mockups carry descriptive labels', /role="img"/.test(landingCorpus) && /aria-label=/.test(landingCorpus));

// ---------------------------------------------------------------------------
// 6. Content rules — no unsupported claims or forbidden phrases.
// ---------------------------------------------------------------------------
const FORBIDDEN = [
  ['for the average tech', 'banned phrase'],
  ['CyTurus', 'no third-party comparisons or implied partnership'],
  ['FedRAMP', 'no unverified certification claims'],
  ['guarantees compliance', 'no compliance guarantees'],
  ['guarantee compliance', 'no compliance guarantees'],
  ['lorem ipsum', 'no placeholder text'],
  ['testimonial', 'no fake testimonials'],
  ['certified by', 'no unverified certification claims'],
  ['DoD approved', 'no unverified approval claims'],
];
for (const [phrase, why] of FORBIDDEN) {
  check(`Landing copy avoids "${phrase}" (${why})`,
    !landingCorpus.toLowerCase().includes(phrase.toLowerCase()));
}
check('Required positioning message present',
  landingCorpus.includes('made executable'));
check('Professional disclaimer present',
  landingCorpus.includes('does not by itself establish') &&
  landingCorpus.includes('replace an authorized C3PAO'));
check('Copyright attribution present', landingCorpus.includes('Pacific Global Security Group'));

// ---------------------------------------------------------------------------
// 7. package.json registers this checker.
// ---------------------------------------------------------------------------
const pkgRaw = read('package.json');
if (pkgRaw !== null) {
  try {
    const pkg = JSON.parse(pkgRaw);
    check('package.json has test:landing-page',
      pkg.scripts?.['test:landing-page'] === 'node scripts/check-landing-page.mjs');
  } catch (error) {
    failures.push(`package.json is not valid JSON: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
console.log(`\nLanding page checks: ${passed} passed, ${failures.length} failed.`);
if (failures.length > 0) {
  console.error('\nFAILURES:');
  failures.forEach((f) => console.error(`  - ${f}`));
  process.exit(1);
}
console.log('All landing page invariants hold.\n');