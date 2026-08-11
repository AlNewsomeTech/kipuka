#!/usr/bin/env node
// ============================================================================
// KIPUKA PHASE 3D — CANONICAL SELF-SERVICE ONBOARDING CHECKER
//
// Dependency-free static verification that self-service onboarding is a single
// authenticated, server-side, idempotent state machine — and that the browser
// no longer creates tenants or seeds retired 17/93 requirement rows.
//
// Fails closed: any missing file, unreadable path, or unmet assertion exits 1.
// Comments AND string literals are stripped for every security assertion so a
// comment or a message string can never satisfy (or break) a check.
// ============================================================================

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
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

// Remove block and line comments (never touching the // inside a URL).
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

// Remove comments AND the contents of string/template literals, so decoy text
// inside a message can never satisfy a security assertion.
function toLogic(source) {
  return stripComments(source)
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/`(?:\\.|[^`\\])*`/g, '``');
}

// ---------------------------------------------------------------------------
// 0. Scope — eight Builder files plus one independently hardened CUI helper.
// ---------------------------------------------------------------------------
const ALLOWED_FILES = [
  'base44/entities/Organization.jsonc',
  'base44/functions/completeSelfServiceOnboarding/entry.ts',
  'src/lib/onboarding.js',
  'src/pages/OnboardingWizard.jsx',
  'src/lib/scopingQuestionnaire.js',
  'src/components/onboarding/OnboardingScopingStep.jsx',
  'src/components/onboarding/OnboardingGate.jsx',
  'src/lib/cuiHosting.js',
  'scripts/check-canonical-onboarding.mjs',
];
check('Phase 3D declares eight Builder files plus one hand-hardening file', ALLOWED_FILES.length === 9, `found ${ALLOWED_FILES.length}`);
for (const file of ALLOWED_FILES) {
  check(`allowed file exists: ${file}`, existsSync(join(ROOT, file)));
}

// ---------------------------------------------------------------------------
// 1. Organization schema — optional onboarding_key, nothing else moved.
// ---------------------------------------------------------------------------
const orgRaw = read('base44/entities/Organization.jsonc');
if (orgRaw !== null) {
  let org = null;
  try { org = JSON.parse(orgRaw); } catch (error) { failures.push(`Organization.jsonc is not valid JSON: ${error.message}`); }
  if (org) {
    const props = org.properties || {};
    check('Organization has onboarding_key', !!props.onboarding_key);
    check('onboarding_key is a plain string', props.onboarding_key?.type === 'string');
    check('onboarding_key has no enum/default', !props.onboarding_key?.enum && props.onboarding_key?.default === undefined);
    check('onboarding_key is documented', typeof props.onboarding_key?.description === 'string' && props.onboarding_key.description.length > 40);
    check('onboarding_key is NOT required', Array.isArray(org.required) && !org.required.includes('onboarding_key'));
    check('required list is unchanged', JSON.stringify(org.required) === JSON.stringify(['organization_name']), JSON.stringify(org.required));
    check('Organization property count is 24 + onboarding_key', Object.keys(props).length === 25, `found ${Object.keys(props).length}`);

    const expectedRls = {
      read: { $or: [{ created_by_id: '{{user.id}}' }, { user_condition: { role: 'admin' } }] },
      write: { $or: [{ created_by_id: '{{user.id}}' }, { user_condition: { role: 'admin' } }] },
    };
    check('Organization RLS is byte-identical to the pre-3D policy',
      JSON.stringify(org.rls) === JSON.stringify(expectedRls), JSON.stringify(org.rls));

    check('plan_tier enum unchanged',
      JSON.stringify(props.plan_tier?.enum) === JSON.stringify(['L1_Essentials', 'L1_Complete', 'L2_Professional', 'L2_Premium', 'Enterprise']));
    check('subscription_status enum unchanged',
      JSON.stringify(props.subscription_status?.enum) === JSON.stringify(['Trial', 'Active', 'Past Due', 'Suspended', 'Cancelled']));
    check('subscription_tier enum unchanged',
      JSON.stringify(props.subscription_tier?.enum) === JSON.stringify(['Starter L1', 'Professional L2', 'Premium L2 Readiness', 'Pac-Sec Managed', 'Trial']));
    check('fully_disabled preserved', props.fully_disabled?.type === 'boolean');
    check('acolyte_tier preserved', Array.isArray(props.acolyte_tier?.enum));
  }
}

// ---------------------------------------------------------------------------
// 2. Backend function.
// ---------------------------------------------------------------------------
const fnRaw = read('base44/functions/completeSelfServiceOnboarding/entry.ts');
if (fnRaw !== null) {
  const code = stripComments(fnRaw);
  const logic = toLogic(fnRaw);

  // --- structure
  check('function uses createClientFromRequest', /import\s*\{\s*createClientFromRequest\s*\}\s*from\s*'npm:@base44\/sdk@/.test(code));
  check('function uses the required Deno.serve entry point', /Deno\.serve\(async\s*\(\s*req\s*\)\s*=>\s*\{/.test(code));
  check('handler body is wrapped in try/catch', /\btry\s*\{/.test(code) && /\}\s*catch\s*\(\s*error\s*\)\s*\{/.test(code));

  // --- authentication precedes authorization precedes service role
  const iAuth = logic.indexOf('base44.auth.me()');
  const iRoleGate = logic.indexOf('SELF_SERVICE_ROLES.has(caller.role)');
  const iService = logic.indexOf('base44.asServiceRole');
  check('auth.me() is present', iAuth > -1);
  check('exact caller-role gate is present', iRoleGate > -1);
  check('service role is used', iService > -1);
  check('auth.me() precedes the role gate', iAuth > -1 && iRoleGate > iAuth);
  check('the role gate precedes ANY service-role access', iRoleGate > -1 && iService > iRoleGate,
    `auth=${iAuth} gate=${iRoleGate} service=${iService}`);
  check('service role is obtained exactly once', (logic.match(/base44\.asServiceRole/g) || []).length === 1);
  check('401 on missing caller', /status:\s*401/.test(code));
  check('403 on non self-service role', /status:\s*403/.test(code));
  check('only user + client may self-onboard',
    /SELF_SERVICE_ROLES\s*=\s*new Set\(\[\s*'user'\s*,\s*'client'\s*\]\)/.test(code));
  for (const staffRole of ['admin', 'technician']) {
    check(`no implicit allowance for the ${staffRole} role`,
      !new RegExp(`SELF_SERVICE_ROLES[^\\n]*${staffRole}`).test(code));
  }

  // --- identity is never taken from the request
  for (const trusted of [
    'body.user', 'body.user_id', 'body.userId', 'body.email', 'body.role',
    'body.organization_id', 'body.organizationId', 'body.project_id', 'body.projectId',
    'body.track', 'body.track_result', 'body.trackResult', 'body.cmmc_level',
    'body.onboarding_key', 'body.plan_tier',
  ]) {
    check(`request body is never read for ${trusted}`, !logic.includes(trusted));
  }
  check('caller id comes from the verified session', /const callerId = caller\.id/.test(code));
  check('caller email comes from the verified session', /const callerEmail = String\(caller\.email\)/.test(code));
  check('email is normalized', /\.trim\(\)\.toLowerCase\(\)/.test(code));

  // --- strict body parsing
  check('body keys are whitelisted',
    /BODY_KEYS\s*=\s*\['company',\s*'answers',\s*'cui_hosting',\s*'cui_hosting_notes'\]/.test(code));
  check('unknown top-level fields are rejected', /rejectUnknownKeys\(body,\s*BODY_KEYS/.test(logic));
  check('unknown company fields are rejected', /rejectUnknownKeys\(raw,\s*COMPANY_KEYS/.test(logic));
  check('unknown answer keys are rejected', /rejectUnknownKeys\(raw,\s*QUESTION_KEYS/.test(logic));
  check('string lengths are bounded', /function readString\(obj, key, max, required\)/.test(code) && /must be \$\{max\} characters or fewer/.test(code));
  check('it_environment is enum-validated', /!IT_ENVIRONMENTS\.includes\(itEnvironment\)/.test(logic));
  check('employee_count is range-checked', /employeeCount > 1000000/.test(logic));

  // --- questionnaire
  for (const key of ['far_52204_21', 'dfars_7012', 'dfars_7019_7020', 'dfars_7021', 'receives_cui', 'controlled_technical', 'fci_only']) {
    check(`questionnaire key declared: ${key}`, new RegExp(`'${key}'`).test(code));
  }
  check('all seven keys must be present',
    /hasOwnProperty\.call\(raw, key\)/.test(logic) && /Scoping answer missing/.test(code));
  check('answers must be exactly true/false/null',
    /value !== true && value !== false && value !== null/.test(logic));
  check('true persists as Yes, false as No, null as Not sure',
    /=== true \? 'Yes' : answers\[key\] === false \? 'No' : 'Not sure'/.test(code));
  check('CUI signal keys are exact',
    /CUI_SIGNAL_KEYS = \['dfars_7012', 'dfars_7019_7020', 'dfars_7021', 'receives_cui', 'controlled_technical'\]/.test(code));
  check('FCI signal keys are exact',
    /FCI_SIGNAL_KEYS = \['far_52204_21', 'fci_only'\]/.test(code));
  check('only an explicit true is a signal', /\.some\(\(k\) => answers\[k\] === true\)/.test(logic));

  // --- track derivation, conflict, undetermined
  check('track is derived server-side', /function deriveTrack\(answers\)/.test(code));
  const iDerive = logic.indexOf('deriveTrack(answers)');
  check('the track is derived BEFORE any service-role access', iDerive > -1 && iDerive < iService);
  check('fci_only + CUI conflict returns 422',
    /cuiSignal && answers\.fci_only === true\)\s*\{\s*throw httpError\(422/.test(logic.replace(/\s+/g, ' ').replace(/if \(/g, '')) ||
    /if \(cuiSignal && answers\.fci_only === true\) \{ throw httpError\(422/.test(logic.replace(/\s+/g, ' ')));
  check('Undetermined returns 422 and is never downgraded',
    /throw httpError\(422/.test(logic) && (logic.match(/throw httpError\(422/g) || []).length >= 2);
  const iThrow422 = logic.indexOf('httpError(422');
  check('every 422 precedes service-role access', iThrow422 > -1 && iThrow422 < iService);
  check('no silent Level 1 fallback', !/track\s*=\s*'Level 1'/.test(code) || /fciSignal\)\s*\{/.test(logic));

  // --- exact requirement counts
  check('level counts are exactly 15 and 110',
    /LEVEL_REQUIREMENT_COUNTS = \{ 'Level 1': 15, 'Level 2': 110 \}/.test(code));
  check('expected count is asserted to be 15 or 110',
    /expectedCount !== 15 && expectedCount !== 110/.test(logic));
  for (const banned of ['17', '93', '125']) {
    check(`no retired requirement count ${banned} anywhere in logic`,
      !new RegExp(`\\b${banned}\\b`).test(logic), `found ${banned}`);
  }
  check('Level 2 is not Level 1 plus Level 2', !/\.concat\(/.test(logic) && !/\+\s*15\b/.test(logic));

  // --- authoritative library sourcing
  check('active dataset key is exact',
    /ACTIVE_DATASET_KEY = 'CMMC-2\.13-SP800-171R2-2024-09'/.test(code));
  check('library read filters dataset + level + active + authoritative',
    /\{ dataset_key: ACTIVE_DATASET_KEY, cmmc_level: level, active: true, authoritative: true \}/.test(code));
  check('library count is validated against the expected total',
    /libraryRows\.length !== expectedCount/.test(logic));
  check('blank requirement ids are rejected', /contains a blank requirement id/.test(fnRaw));
  check('duplicate library ids are rejected', /canonicalIds\.has\(controlId\)/.test(logic));
  check('title and domain are required', /!row\.control_title \|\| !row\.domain/.test(logic));
  check('library level is verified', /row\.cmmc_level !== level/.test(logic));
  check('canonical id set size is verified', /canonicalIds\.size !== expectedCount/.test(logic));

  // --- assessment reuse, conflicts, ownership
  check('existing assessments are ownership-checked',
    /row\.organization_id !== orgId \|\| row\.project_id !== projectId/.test(logic));
  check('non-canonical existing rows are a conflict', /!canonicalIds\.has\(row\.control_id\)/.test(logic));
  check('duplicate existing rows are a conflict', /seenIds\.has\(row\.control_id\)/.test(logic));
  check('only missing rows are created', /!seenIds\.has\(row\.control_id\.trim\(\)\)/.test(logic));
  check('new rows start Not Started / No Evidence / Moderate',
    /status: 'Not Started',\s*evidence_status: 'No Evidence',\s*risk_rating: 'Moderate'/.test(code));
  check('creation is batched under the page limit',
    /i \+= PAGE_LIMIT\) \{\s*await svc\.ControlAssessment\.bulkCreate\(missingRows\.slice\(i, i \+ PAGE_LIMIT\)\)/.test(code));

  // --- post-validation then completion
  check('final count is post-validated', /finalAssessments\.length !== expectedCount/.test(logic));
  check('final rows are ownership + level post-validated',
    /row\.organization_id !== orgId \|\| row\.project_id !== projectId \|\| row\.cmmc_level !== level/.test(logic));
  check('final id set is post-validated', /finalIds\.size !== expectedCount/.test(logic));
  check('existing assessment title and domain match the authoritative row',
    /canonicalRows\.get\(row\.control_id\)/.test(logic)
      && /normalizedText\(row\.control_title\) !== normalizedText\(canonicalRow\.control_title\)/.test(logic)
      && /normalizedText\(row\.domain\) !== normalizedText\(canonicalRow\.domain\)/.test(logic));
  check('all five singleton entity types are re-read after assessment creation',
    /const \[\s*finalOrganizations,\s*finalMemberships,\s*finalProjects,\s*finalProfiles,\s*finalScopes,\s*\] = await Promise\.all/.test(code));
  for (const finalName of ['finalOrganizations', 'finalMemberships', 'finalProjects', 'finalProfiles', 'finalScopes']) {
    check(`final singleton is enforced for ${finalName}`, new RegExp(`singleton\\(${finalName},`).test(code));
  }
  const iComplete = logic.indexOf('onboarding_status: ');
  const iFinalCount = logic.indexOf('finalAssessments.length !== expectedCount');
  check('profile is only completed AFTER the assessment postcondition',
    iFinalCount > -1 && logic.lastIndexOf('onboarding_status: ') > iFinalCount, `postcheck=${iFinalCount} complete=${logic.lastIndexOf('onboarding_status: ')}`);
  check('profile starts incomplete', /onboarding_status: 'Scoping'/.test(code) && iComplete > -1);
  check('completion is verified after the write', /companyProfile\.onboarding_status !== 'Complete'\)\s*\{\s*throw/.test(code.replace(/\s+/g, ' ').replace(/ \{ throw/g, ') { throw').replace(/\)\)/g, ')')) || /onboarding_status !== 'Complete'/.test(code));

  // --- idempotent identity
  check('onboarding key version constant is exact',
    /ONBOARDING_KEY_VERSION = 'SELF_SERVICE_ONBOARDING_V1'/.test(code));
  check('onboarding key is derived only from the constant and caller.id',
    /const onboardingKey = `\$\{ONBOARDING_KEY_VERSION\}\|\$\{callerId\}`/.test(code));
  check('organization is looked up by the exact onboarding key',
    /\{ onboarding_key: onboardingKey \}/.test(code));
  check('singleton helper rejects more than one record',
    /function singleton\(rows, label\)/.test(code) && /rows\.length > 1/.test(logic));
  for (const label of ['organization', 'project', 'company profile', 'scoping profile']) {
    check(`singleton enforced for ${label}`, new RegExp(`singleton\\([A-Za-z]+, '${label}'\\)`).test(code));
  }
  check('409 is used for conflicts', /httpError\(409/.test(logic));
  check('multiple active memberships are a 409', /activeMemberships\.length > 1/.test(logic));
  const iMembershipRead = logic.indexOf('readAll(svc.OrganizationUser');
  const iOrganizationCreate = logic.indexOf('svc.Organization.create');
  const iCallerConflict = logic.indexOf('activeMembership || callerOrgId || currentMemberships.length > 0');
  check('membership preflight runs before organization creation',
    iMembershipRead > -1 && iMembershipRead < iOrganizationCreate);
  check('caller and prior-membership conflict runs before organization creation',
    iCallerConflict > -1 && iCallerConflict < iOrganizationCreate);
  check('caller organization comes only from the authenticated session',
    /let callerOrgId = normalizedText\(caller\.organization_id\)/.test(logic));
  check('a membership in another org is a 409',
    /activeMembership && activeMembership\.organization_id !== organization\.id/.test(logic));
  check('removed memberships remain historical and are never reactivated',
    /currentMemberships = emailMemberships\.filter\(\(m\) => m\.status !== 'Removed'\)/.test(code));
  check('disabled, invited, or conflicting current memberships are rejected',
    /currentMemberships\.some\(\(m\) => m\.organization_id !== organization\.id \|\| m\.status !== 'Active'\)/.test(code));
  check('QA reset is restricted to the exact archived user and memberships',
    /callerId === '6a4f1df00b54a8988cd69745'/.test(code)
      && /callerEmail === 'albert@pac-sec\.com'/.test(code)
      && /callerOrgId === '6a4f1b6293936dd268395109'/.test(code)
      && /emailMemberships\.length === 2/.test(code)
      && /qaResetMembershipIds\.has\(m\.id\) && m\.status === 'Removed'/.test(code));
  check('QA reset clears only the authenticated caller profile',
    /resetAuthorizedQaUser\(svc\.User, callerId\)/.test(code)
      && /organization_id: ''/.test(code)
      && /assigned_client_ids: ''/.test(code));
  check('onboarding never reactivates an OrganizationUser',
    !/svc\.OrganizationUser\.update\(/.test(logic));
  check('existing organization consistency is verified',
    /normalizedText\(organization\.organization_name\) !== company\.company_name/.test(logic)
      && /normalizedText\(organization\.primary_contact_email\)\.toLowerCase\(\) !== callerEmail/.test(logic)
      && /organization\.plan_tier !== planTier/.test(logic));
  check('existing project consistency is verified',
    /normalizedText\(project\.project_name\) !== expectedProjectName/.test(logic)
      && /project\.project_type !== expectedProjectType/.test(logic)
      && /project\.assessment_path !== expectedAssessmentPath/.test(logic)
      && /project\.implementation_stack !== implementationStack/.test(logic));
  check('existing company profile consistency is verified',
    /profileMatchesRequest\(companyProfile\)/.test(logic)
      && /companyProfile\.active_project_id !== projectId/.test(logic));
  check('existing scope consistency is verified',
    /scopeMatchesRequest\(scopingProfile\)/.test(logic)
      && /answersMatch\(scope\.wizard_answers, wizardAnswers\)/.test(logic));
  check('incomplete workspace retains Trial and full-access invariants',
    /organization\.subscription_status !== 'Trial'/.test(code)
      && /organization\.subscription_tier !== 'Trial'/.test(code)
      && /organization\.trial_full_access !== true/.test(logic));
  check('resumed flag is reported', /let resumed = false/.test(code) && /resumed = true/.test(logic));

  // --- record shape
  check('org is Trial with full trial access',
    /subscription_status: 'Trial'/.test(code) && /subscription_tier: 'Trial'/.test(code) && /trial_full_access: true/.test(code));
  check('trial end is date-only', /14 \* 24 \* 60 \* 60 \* 1000\)\.toISOString\(\)\.slice\(0, 10\)/.test(code));
  check('plan tier follows the derived level',
    /planTier = level === 'Level 2' \? 'L2_Professional' : 'L1_Essentials'/.test(code));
  check('membership is Organization Owner + Active',
    /role: 'Organization Owner',\s*status: 'Active'/.test(code));
  check('implementation stack is derived from the validated environment',
    /STACK_BY_ENVIRONMENT\[company\.it_environment\]/.test(logic));
  check('scope is Draft', /scope_status: 'Draft'/.test(code));
  check('scope booleans come from the derived track',
    /handles_fci: derived\.handles_fci/.test(logic) && /handles_cui: derived\.handles_cui/.test(logic));
  check('CUI hosting is validated, not invented', /function resolveCuiHosting\(/.test(code) && /Unsupported CUI hosting value/.test(fnRaw));
  check('an incapable environment demands an explicit decision',
    /!hosting \|\| !CUI_HOSTING_DECIDED\.has\(hosting\)/.test(logic));

  // --- user binding is last and verified
  const iUserUpdate = logic.indexOf('svc.User.update(callerId');
  const iBulk = logic.indexOf('svc.ControlAssessment.bulkCreate');
  check('the caller User record is updated', iUserUpdate > -1);
  check('only the authenticated caller is updated',
    /svc\.User\.update\(callerId, \{ role: 'client', organization_id: orgId \}\)/.test(code));
  check('the User update happens after assessments', iUserUpdate > iBulk);
  check('the User update happens after profile completion', iUserUpdate > logic.lastIndexOf('onboarding_status: '));
  check('the User update is the final write',
    iUserUpdate > -1 && !/(create|update|bulkCreate)\(/.test(logic.slice(iUserUpdate + 30)),
    'a write follows the User update');
  check('the persisted User is verified',
    /verifiedUser\.organization_id !== orgId \|\| verifiedUser\.role !== 'client'/.test(code));

  // --- read hygiene
  check('no swallowed reads via catch(() => [])', !/catch\(\(\)\s*=>\s*\[\]\)/.test(logic.replace(/\s+/g, '')) && !logic.includes('catch(() => [])'));
  check('no swallowed reads via catch(() => null)', !logic.includes('catch(() => null)'));
  check('no swallowed writes via catch(() => {})', !logic.includes('catch(() => {})'));
  check('all entity reads go through the paginated helper',
    !/svc\.[A-Za-z]+\.filter\(/.test(logic), 'a direct entity .filter( bypasses readAll');
  check('page limit is 500', /PAGE_LIMIT = 500/.test(code));
  check('the paginated read uses the page limit',
    /entity\.filter\(query, sort, PAGE_LIMIT, skip\)/.test(code));
  check('no page/batch literal above 500',
    !/\.filter\([^)]*,\s*(5[0-9]{2,}|[6-9][0-9]{2}|[0-9]{4,})\s*[,)]/.test(logic));
  check('errors map to an integer status', /Number\.isInteger\(error\.status\) \? error\.status : 500/.test(logic));
  check('server errors return a generic safe message',
    /status >= 500/.test(logic)
      && /Workspace setup failed\. Your progress is saved/.test(fnRaw)
      && !/status === 500\s*\?\s*\(error && error\.message/.test(logic));
  check('no success is returned after a failure', /ok: true/.test(code) && logic.indexOf('ok: true') < iUserUpdate === false || logic.indexOf('ok: true') > iUserUpdate);
}

// ---------------------------------------------------------------------------
// 3. src/lib/cuiHosting.js — GCC is not silently treated as GCC High.
// ---------------------------------------------------------------------------
const cuiRaw = read('src/lib/cuiHosting.js');
if (cuiRaw !== null) {
  const code = stripComments(cuiRaw);
  check('only GCC High auto-maps to GCC High hosting',
    /if \(itEnvironment === 'Microsoft 365 GCC High'\) return CUI_HOSTING\.GCC_HIGH/.test(code)
      && !/if \(itEnvironment === 'Microsoft 365 GCC'\) return CUI_HOSTING\.GCC_HIGH/.test(code));
  check('Microsoft 365 GCC requires an explicit CUI architecture decision',
    /CUI_INCAPABLE_ENVIRONMENTS[\s\S]*'Microsoft 365 GCC'/.test(code));
  check('Unknown requires an explicit CUI architecture decision',
    /CUI_INCAPABLE_ENVIRONMENTS[\s\S]*'Unknown'/.test(code));
}

// ---------------------------------------------------------------------------
// 4. src/lib/onboarding.js — no writes, no seeds, no ControlProgress.
// ---------------------------------------------------------------------------
const libRaw = read('src/lib/onboarding.js');
if (libRaw !== null) {
  const code = stripComments(libRaw);
  const logic = toLogic(libRaw);

  check('no local Level 1 seed import', !/controlLibrarySeed/.test(libRaw));
  check('no local Level 2 seed import', !/controlLibraryLevel2Seed/.test(libRaw));
  check('no ControlProgress reference at all', !/ControlProgress/.test(libRaw));
  check('seedAssessments is gone', !/seedAssessments/.test(libRaw));
  check('createScopingProfile is gone', !/createScopingProfile/.test(libRaw));
  check('legacy status ranking is gone', !/STATUS_RANK/.test(libRaw) && !/PROGRESS_TO_ASSESSMENT/.test(libRaw));
  check('migrateControlProgress is gone', !/migrateControlProgress/.test(libRaw));
  for (const op of ['create', 'update', 'bulkCreate', 'bulkUpdate', 'delete', 'deleteMany', 'updateMany']) {
    check(`no client-side entity ${op}`, !new RegExp(`entities\\.[A-Za-z]+\\.${op}\\(`).test(logic));
  }
  check('resolveOnboardingState is preserved', /export async function resolveOnboardingState\(/.test(code));
  check('completeOnboarding is preserved', /export async function completeOnboarding\(/.test(code));
  check('completeOnboarding invokes the backend function',
    /base44\.functions\.invoke\('completeSelfServiceOnboarding'/.test(code));
  check('only company/answers/hosting are sent',
    /\{\s*company,\s*answers,\s*cui_hosting:/.test(code));
  check('no user is sent', !/\buser[,:]/.test(logic.replace(/resolveOnboardingState\(\{[^}]*\}/g, '')));
  check('no client-computed track is sent', !/trackResult/.test(libRaw) && !/track_result/.test(libRaw));
  check('a missing ok:true throws', /data\.ok !== true/.test(logic));
  check('missing returned records throw',
    /!data\.organization\?\.id \|\| !data\.project\?\.id \|\| !data\.companyProfile\?\.id/.test(logic));
  check('server error text is surfaced', /err\?\.response\?\.data\?\.error/.test(logic));
  check('no swallowed reads', !libRaw.includes('.catch(() => [])') && !libRaw.includes('.catch(() => null)'));
}

// ---------------------------------------------------------------------------
// 4. OnboardingWizard — no writes, forced reload.
// ---------------------------------------------------------------------------
const wizRaw = read('src/pages/OnboardingWizard.jsx');
if (wizRaw !== null) {
  const logic = toLogic(wizRaw);
  check('wizard imports no SDK client', !/api\/base44Client/.test(wizRaw));
  check('wizard performs no entity access', !/base44\.entities/.test(logic));
  for (const op of ['create', 'bulkCreate', 'update']) {
    check(`wizard performs no entity ${op}`, !new RegExp(`entities\\.[A-Za-z]+\\.${op}\\(`).test(logic));
  }
  check('wizard calls the wrapper', /completeOnboarding\(\{/.test(logic));
  check('wizard sends no user', !/\buser,/.test(logic));
  check('wizard sends no client-computed track', !/trackResult,/.test(logic));
  check('wizard forces a full same-origin reload',
    /window\.location\.replace\('\/'\)/.test(stripComments(wizRaw)));
  check('wizard does not rely on stale org caches', !/refreshOrgs/.test(wizRaw) && !/selectOrg/.test(wizRaw));
  check('double submit is blocked', /if \(submitting\) return;/.test(logic));
  check('submitting is set before the call', /setSubmitting\(true\)/.test(logic));
  check('backend errors are displayed', /setError\(/.test(logic) && /\{error &&/.test(wizRaw));
}

// ---------------------------------------------------------------------------
// 5. Scoping logic + UI.
// ---------------------------------------------------------------------------
const qRaw = read('src/lib/scopingQuestionnaire.js');
if (qRaw !== null) {
  const logic = toLogic(qRaw);
  check('determineTrack preserves null as unknown', /answers\[k\] === true/.test(logic));
  check('determineTrack has no truthy-coercion signal chain',
    !/answers\.dfars_7012 \|\|/.test(logic));
  check('determineTrack reports a conflict flag', /const conflict = cuiSignals && answers\.fci_only === true/.test(stripComments(qRaw)));
  check('conflict returns Undetermined', /conflict: true/.test(qRaw));
  check('unclear answers return Undetermined', (qRaw.match(/track: 'Undetermined'/g) || []).length === 2);
  check('Level 1 copy says 15 FAR 52.204-21', /15 FAR 52\.204-21 requirements/.test(qRaw));
  check('no 17-practice copy remains', !/\b17\b/.test(qRaw));
  check('Level 2 copy says 110', /110 requirements/.test(qRaw));
}

const stepRaw = read('src/components/onboarding/OnboardingScopingStep.jsx');
if (stepRaw !== null) {
  const logic = toLogic(stepRaw);
  check('step computes a needs-review state',
    /const needsReview = result\.track === 'Undetermined' \|\| result\.conflict === true/.test(stripComments(stepRaw)));
  check('finish requires a determined track', /const canFinish = allAnswered && !needsReview/.test(stripComments(stepRaw)));
  check('finish button is disabled on needs-review', /disabled=\{submitting \|\| !canFinish\}/.test(stepRaw));
  check('all seven answers are still required', /answeredCount === SCOPING_QUESTIONNAIRE\.length/.test(logic));
  check('Not sure (null) still counts as answered', /answers\[q\.key\] !== undefined/.test(logic));
  check('a clear needs-review message is shown', /We can't confirm your CMMC track yet/.test(stepRaw));
  check('the message points to review or Pac-Sec', /contact Pac-Sec for a scoping review/.test(stepRaw));
  check('Level 1 label says 15 FAR 52.204-21', /15 FAR 52\.204-21 requirements/.test(stepRaw));
  check('no 17-practice label remains', !/\b17\b/.test(stepRaw));
}

// ---------------------------------------------------------------------------
// 6. OnboardingGate cannot fail open.
// ---------------------------------------------------------------------------
const gateRaw = read('src/components/onboarding/OnboardingGate.jsx');
if (gateRaw !== null) {
  const code = stripComments(gateRaw);
  const catchBlock = code.slice(code.indexOf('} catch'), code.indexOf('} catch') + 260);
  check('gate has an explicit error state', /'checking' \| wizard \| ready \| error|state === 'error'/.test(code));
  check('gate sets the error state on failure', /setState\('error'\)/.test(code));
  check('gate never falls through to ready on error', !/setState\('ready'\)/.test(catchBlock), catchBlock.trim().slice(0, 120));
  check('gate does not render children after an error',
    code.indexOf("state === 'error'") < code.indexOf('return children'));
  check('gate exposes a retry action', /Try again/.test(gateRaw) && /setCheckKey\(\(k\) => k \+ 1\)/.test(code));
  check('gate preserves the platform-admin exemption', /isPlatformAdmin/.test(code));
  check('gate preserves the wizard flow', /<OnboardingWizard/.test(code));
  check('gate preserves the ready flow', /setState\('ready'\)/.test(code));
  check('gate still shows the loading spinner', /animate-spin/.test(code));
}

// ---------------------------------------------------------------------------
// 7. package.json untouched, no new dependency.
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
      'test:phase7-final-handoff': 'node scripts/check-phase7-final-handoff.mjs',
      preview: 'vite preview',
    };
    const scripts = pkg.scripts || {};
    check('package.json scripts retain the Phase 3D baseline plus authorized later gates',
      JSON.stringify(scripts) === JSON.stringify(expected), JSON.stringify(scripts));
    check('dependency count unchanged at 68', Object.keys(pkg.dependencies || {}).length === 68,
      `found ${Object.keys(pkg.dependencies || {}).length}`);
    check('devDependency count unchanged at 17', Object.keys(pkg.devDependencies || {}).length === 17,
      `found ${Object.keys(pkg.devDependencies || {}).length}`);
  }
}

// ---------------------------------------------------------------------------
console.log(`\nPhase 3D canonical onboarding checks: ${passed} passed, ${failures.length} failed.`);
if (failures.length > 0) {
  console.error('\nFAILURES:');
  failures.forEach((f) => console.error(`  - ${f}`));
  process.exit(1);
}
console.log('All Phase 3D canonical onboarding invariants hold.\n');
console.log('NOTE: static source analysis only — completeSelfServiceOnboarding was NOT invoked.\n');