import { createClientFromRequest } from 'npm:@base44/sdk@0.8.41';

// ============================================================================
// CANONICAL SELF-SERVICE ONBOARDING (Phase 3D)
//
// The single server-side path that turns a brand-new self-service signup into a
// complete tenant: one Organization, one active OrganizationUser membership, one
// Project, one CompanyProfile, one ScopingProfile, and EXACTLY 15 (Level 1) OR
// 110 (Level 2) ControlAssessment rows sourced from the active authoritative
// ControlLibrary dataset. Level 1 and Level 2 are never combined into 125.
//
// THIS IS NOT AN ATOMIC DATABASE TRANSACTION. The Base44 SDK exposes no
// multi-entity transaction. This is a deterministic, idempotent, resumable state
// machine: every step is keyed off a server-derived onboarding_key, every step
// re-reads and validates what it wrote, and a failure part-way through leaves a
// partial state that a later retry resumes rather than duplicates.
//
// Nothing about the caller's identity, tenant, or track is taken from the
// request body. Identity comes from base44.auth.me(); the track is derived from
// validated questionnaire answers; the requirement rows come from the database.
// ============================================================================

// Versioned constant used to derive the resume key. Bump only with a migration.
const ONBOARDING_KEY_VERSION = 'SELF_SERVICE_ONBOARDING_V1';

// The single active authoritative dataset (Phase 2B).
const ACTIVE_DATASET_KEY = 'CMMC-2.13-SP800-171R2-2024-09';

// Authoritative requirement counts. Level 2 is 110 total, NOT 15 + 110.
const LEVEL_REQUIREMENT_COUNTS = { 'Level 1': 15, 'Level 2': 110 };

// SDK page / batch ceiling.
const PAGE_LIMIT = 500;

// Platform roles permitted to self-onboard. Staff roles are rejected outright.
const SELF_SERVICE_ROLES = new Set(['user', 'client']);

// The seven questionnaire keys. All must be present; each value must be
// exactly true, false, or null (null means "Not sure").
const QUESTION_KEYS = [
  'far_52204_21',
  'dfars_7012',
  'dfars_7019_7020',
  'dfars_7021',
  'receives_cui',
  'controlled_technical',
  'fci_only',
];
const CUI_SIGNAL_KEYS = ['dfars_7012', 'dfars_7019_7020', 'dfars_7021', 'receives_cui', 'controlled_technical'];
const FCI_SIGNAL_KEYS = ['far_52204_21', 'fci_only'];

const COMPANY_KEYS = [
  'company_name', 'cage_code', 'duns_uei', 'dod_contracts',
  'employee_count', 'it_environment', 'uses_msp', 'msp_name', 'has_existing_ssp',
];
const BODY_KEYS = ['company', 'answers', 'cui_hosting', 'cui_hosting_notes'];

const IT_ENVIRONMENTS = [
  'Microsoft 365 Commercial', 'Microsoft 365 GCC', 'Microsoft 365 GCC High',
  'Google Workspace', 'On-Premises', 'Hybrid', 'Unknown',
];
// Environments that are already CUI-capable — hosting is fixed by the environment.
const CUI_CAPABLE_ENVIRONMENTS = new Set(['Microsoft 365 GCC High']);
// Environments that cannot be accepted as the CUI boundary without an explicit
// architecture decision. GCC is not silently treated as GCC High, and an
// Unknown environment must be resolved before CUI onboarding can complete.
const CUI_INCAPABLE_ENVIRONMENTS = new Set([
  'Microsoft 365 Commercial', 'Microsoft 365 GCC', 'Google Workspace',
  'On-Premises', 'Hybrid', 'Unknown',
]);
const CUI_HOSTING_VALUES = new Set(['preveil_enclave', 'gcc_high', 'other_fedramp', 'undecided']);
const CUI_HOSTING_DECIDED = new Set(['preveil_enclave', 'gcc_high', 'other_fedramp']);

// CompanyProfile.it_environment -> Project/CompanyProfile.implementation_stack.
const STACK_BY_ENVIRONMENT = {
  'Microsoft 365 Commercial': 'Microsoft 365 Commercial',
  'Microsoft 365 GCC': 'Microsoft 365 GCC',
  'Microsoft 365 GCC High': 'Microsoft 365 GCC High',
  'Google Workspace': 'Google Workspace',
  'On-Premises': 'Hybrid/Other',
  'Hybrid': 'Hybrid/Other',
  'Unknown': 'Hybrid/Other',
};

// --- small helpers ---------------------------------------------------------

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function rejectUnknownKeys(obj, allowed, label) {
  for (const key of Object.keys(obj)) {
    if (!allowed.includes(key)) {
      throw httpError(400, `Unexpected field in ${label}: ${key}`);
    }
  }
}

function readString(obj, key, max, required) {
  const raw = obj[key];
  if (raw === undefined || raw === null || raw === '') {
    if (required) throw httpError(400, `${key} is required.`);
    return '';
  }
  if (typeof raw !== 'string') throw httpError(400, `${key} must be text.`);
  const trimmed = raw.trim();
  if (required && trimmed.length === 0) throw httpError(400, `${key} is required.`);
  if (trimmed.length > max) throw httpError(400, `${key} must be ${max} characters or fewer.`);
  return trimmed;
}

function readBoolean(obj, key) {
  const raw = obj[key];
  if (raw === undefined || raw === null) return false;
  if (raw !== true && raw !== false) throw httpError(400, `${key} must be true or false.`);
  return raw;
}

function normalizedText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function answersMatch(actual, expected) {
  if (!isPlainObject(actual)) return false;
  return QUESTION_KEYS.every((key) => actual[key] === expected[key]);
}

// Exactly one record is permitted per singleton entity on this onboarding
// boundary. Zero means "create it"; more than one is a hard conflict.
function singleton(rows, label) {
  if (!Array.isArray(rows)) throw httpError(500, `Unreadable ${label} result.`);
  if (rows.length > 1) {
    throw httpError(409, `Multiple ${label} records already exist for your account. Contact Pac-Sec support.`);
  }
  return rows[0] || null;
}

// Paginated read with a hard page ceiling. Read failures propagate — they are
// never swallowed into an empty list, which would look like "nothing exists".
async function readAll(entity, query, sort) {
  const out = [];
  for (let skip = 0; skip < 20 * PAGE_LIMIT; skip += PAGE_LIMIT) {
    const page = await entity.filter(query, sort, PAGE_LIMIT, skip);
    if (!Array.isArray(page)) throw httpError(500, 'Unexpected database response.');
    out.push(...page);
    if (page.length < PAGE_LIMIT) break;
  }
  return out;
}

// --- request validation ----------------------------------------------------

function parseCompany(raw) {
  if (!isPlainObject(raw)) throw httpError(400, 'Company details are missing.');
  rejectUnknownKeys(raw, COMPANY_KEYS, 'company');

  const itEnvironment = raw.it_environment === undefined || raw.it_environment === null || raw.it_environment === ''
    ? 'Unknown'
    : raw.it_environment;
  if (!IT_ENVIRONMENTS.includes(itEnvironment)) throw httpError(400, 'Unsupported IT environment.');

  let employeeCount = 0;
  if (raw.employee_count !== undefined && raw.employee_count !== null && raw.employee_count !== '') {
    employeeCount = Number(raw.employee_count);
    if (!Number.isFinite(employeeCount) || employeeCount < 0 || employeeCount > 1000000) {
      throw httpError(400, 'Employee count must be a number between 0 and 1,000,000.');
    }
    employeeCount = Math.floor(employeeCount);
  }

  return {
    company_name: readString(raw, 'company_name', 200, true),
    cage_code: readString(raw, 'cage_code', 32, false),
    duns_uei: readString(raw, 'duns_uei', 64, false),
    dod_contracts: readString(raw, 'dod_contracts', 4000, false),
    msp_name: readString(raw, 'msp_name', 200, false),
    employee_count: employeeCount,
    it_environment: itEnvironment,
    uses_msp: readBoolean(raw, 'uses_msp'),
    has_existing_ssp: readBoolean(raw, 'has_existing_ssp'),
  };
}

// Every key present; every value exactly true, false, or null.
function parseAnswers(raw) {
  if (!isPlainObject(raw)) throw httpError(400, 'Scoping answers are missing.');
  rejectUnknownKeys(raw, QUESTION_KEYS, 'answers');
  const parsed = {};
  for (const key of QUESTION_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(raw, key)) {
      throw httpError(400, `Scoping answer missing: ${key}.`);
    }
    const value = raw[key];
    if (value !== true && value !== false && value !== null) {
      throw httpError(400, `Scoping answer ${key} must be true, false, or null.`);
    }
    parsed[key] = value;
  }
  return parsed;
}

// Server-side track derivation. Only an explicit true is a signal; null stays
// unknown and never counts as false-negative evidence.
function deriveTrack(answers) {
  const cuiSignal = CUI_SIGNAL_KEYS.some((k) => answers[k] === true);
  const fciSignal = FCI_SIGNAL_KEYS.some((k) => answers[k] === true);

  if (cuiSignal && answers.fci_only === true) {
    throw httpError(422, 'Your answers conflict: you selected FCI-only but also indicated CUI is in scope. Review your answers or contact Pac-Sec before continuing.');
  }
  if (cuiSignal) {
    return { track: 'Level 2', handles_cui: true, handles_fci: true };
  }
  if (fciSignal) {
    return { track: 'Level 1', handles_cui: false, handles_fci: true };
  }
  // Undetermined is never silently downgraded to Level 1.
  throw httpError(422, 'Your answers do not clearly establish FCI or CUI in scope. A scoping review is required before a workspace can be created — review your answers or contact Pac-Sec.');
}

// Validate the hosting choice. The value is validated, never silently invented:
// a CUI-capable environment fixes it, a CUI-incapable environment demands an
// explicit decision, and an unknown environment may defer.
function resolveCuiHosting({ handlesCui, itEnvironment, hosting, notes }) {
  if (hosting && !CUI_HOSTING_VALUES.has(hosting)) throw httpError(400, 'Unsupported CUI hosting value.');
  if (!handlesCui) return { hosting: '', notes: '' };

  if (CUI_CAPABLE_ENVIRONMENTS.has(itEnvironment)) {
    if (hosting && hosting !== 'gcc_high') {
      throw httpError(422, 'The selected CUI hosting choice is not compatible with a Microsoft 365 GCC / GCC High environment.');
    }
    return { hosting: 'gcc_high', notes };
  }
  if (CUI_INCAPABLE_ENVIRONMENTS.has(itEnvironment)) {
    if (!hosting || !CUI_HOSTING_DECIDED.has(hosting)) {
      throw httpError(422, 'Your environment cannot store, process, or transmit CUI. Choose a compliant CUI hosting architecture before finishing setup.');
    }
    if (hosting === 'other_fedramp' && !notes) {
      throw httpError(422, 'Name the FedRAMP Moderate (or higher) environment in the notes field.');
    }
    return { hosting, notes };
  }
  throw httpError(422, 'A compatible CUI hosting architecture must be selected before setup can continue.');
}

// --- handler ---------------------------------------------------------------

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);

    // 1) AUTHENTICATE FIRST. No service-role access before this succeeds.
    let caller = null;
    try {
      caller = await base44.auth.me();
    } catch (_authError) {
      caller = null;
    }
    if (!caller || !caller.id || !caller.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2) EXACT CALLER-ROLE GATE. Only a self-service user/client may onboard.
    if (!SELF_SERVICE_ROLES.has(caller.role)) {
      return Response.json(
        { error: 'Self-service onboarding is only available to new customer accounts. Pac-Sec staff create organizations from the consultant console.' },
        { status: 403 },
      );
    }

    // Identity is taken from the verified session only.
    const callerId = caller.id;
    const callerEmail = String(caller.email).trim().toLowerCase();
    const callerName = typeof caller.full_name === 'string' ? caller.full_name.trim().slice(0, 200) : '';

    // 3) STRICT BODY PARSE. Only these four fields are accepted.
    let body = null;
    try {
      body = await req.json();
    } catch (_parseError) {
      throw httpError(400, 'Invalid request body.');
    }
    if (!isPlainObject(body)) throw httpError(400, 'Invalid request body.');
    rejectUnknownKeys(body, BODY_KEYS, 'request');

    const company = parseCompany(body.company);
    const answers = parseAnswers(body.answers);
    const hostingInput = readString(body, 'cui_hosting', 64, false);
    const hostingNotesInput = readString(body, 'cui_hosting_notes', 2000, false);

    // 4) DERIVE THE TRACK SERVER-SIDE. 422 before any write on conflict/unknown.
    const derived = deriveTrack(answers);
    const level = derived.track;
    const expectedCount = LEVEL_REQUIREMENT_COUNTS[level];
    if (expectedCount !== 15 && expectedCount !== 110) {
      throw httpError(500, 'Unsupported CMMC level.');
    }
    const cui = resolveCuiHosting({
      handlesCui: derived.handles_cui,
      itEnvironment: company.it_environment,
      hosting: hostingInput,
      notes: hostingNotesInput,
    });
    const implementationStack = STACK_BY_ENVIRONMENT[company.it_environment] || 'Hybrid/Other';
    const planTier = level === 'Level 2' ? 'L2_Professional' : 'L1_Essentials';

    // Deterministic resume key — derived only from the constant and caller.id.
    const onboardingKey = `${ONBOARDING_KEY_VERSION}|${callerId}`;
    const wizardAnswers = {};
    for (const key of QUESTION_KEYS) {
      wizardAnswers[key] = answers[key] === true ? 'Yes' : answers[key] === false ? 'No' : 'Not sure';
    }

    const svc = base44.asServiceRole.entities;
    let resumed = false;

    // ---- STEP A: preflight identity and Organization --------------------
    // Membership and caller-tenant conflicts must be resolved BEFORE any
    // organization is created. Otherwise a rejected caller could leave an
    // orphan tenant behind.
    const emailMemberships = await readAll(svc.OrganizationUser, { user_email: callerEmail }, 'created_date');
    const activeMemberships = emailMemberships.filter((m) => m.status === 'Active');
    if (activeMemberships.length > 1) {
      throw httpError(409, 'Your account already has multiple active organization memberships. Contact Pac-Sec support.');
    }
    const activeMembership = activeMemberships[0] || null;
    const callerOrgId = normalizedText(caller.organization_id);

    const orgMatches = await readAll(svc.Organization, { onboarding_key: onboardingKey }, 'created_date');
    let organization = singleton(orgMatches, 'organization');
    if (!organization) {
      if (activeMembership || callerOrgId || emailMemberships.length > 0) {
        throw httpError(409, 'Your account is already linked to an organization or has a prior membership. Contact Pac-Sec support before creating a new workspace.');
      }
      const trialEnds = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      organization = await svc.Organization.create({
        organization_name: company.company_name,
        legal_name: company.company_name,
        primary_contact_name: callerName,
        primary_contact_email: callerEmail,
        cage_codes: company.cage_code ? [company.cage_code] : [],
        uei: company.duns_uei,
        subscription_status: 'Trial',
        subscription_tier: 'Trial',
        plan_tier: planTier,
        trial_full_access: true,
        trial_ends_date: trialEnds,
        onboarding_key: onboardingKey,
      });
    } else {
      resumed = true;
      if (activeMembership && activeMembership.organization_id !== organization.id) {
        throw httpError(409, 'Your account already belongs to another organization. Contact Pac-Sec support.');
      }
      if (callerOrgId && callerOrgId !== organization.id) {
        throw httpError(409, 'Your signed-in account is linked to a different organization. Contact Pac-Sec support.');
      }
      if (emailMemberships.some((m) => m.organization_id !== organization.id || m.status !== 'Active')) {
        throw httpError(409, 'Your account has a removed, disabled, invited, or conflicting membership. Contact Pac-Sec support; onboarding will not reactivate it.');
      }
      if (
        normalizedText(organization.organization_name) !== company.company_name
        || normalizedText(organization.legal_name) !== company.company_name
        || normalizedText(organization.primary_contact_email).toLowerCase() !== callerEmail
        || organization.plan_tier !== planTier
      ) {
        throw httpError(409, 'The existing workspace does not match this onboarding request. Contact Pac-Sec support.');
      }
    }
    if (!organization || !organization.id) throw httpError(500, 'Workspace creation failed.');
    const orgId = organization.id;
    organization = await svc.Organization.get(orgId);
    if (
      !organization
      || organization.onboarding_key !== onboardingKey
      || organization.plan_tier !== planTier
      || normalizedText(organization.organization_name) !== company.company_name
      || normalizedText(organization.primary_contact_email).toLowerCase() !== callerEmail
    ) {
      throw httpError(500, 'Workspace could not be verified. Please retry.');
    }

    // ---- STEP B: OrganizationUser membership ---------------------------
    let membership = activeMembership;
    if (membership) {
      resumed = true;
      if (
        emailMemberships.length !== 1
        || membership.organization_id !== orgId
        || membership.role !== 'Organization Owner'
        || normalizedText(membership.user_email).toLowerCase() !== callerEmail
      ) {
        throw httpError(409, 'Your active organization membership is inconsistent. Contact Pac-Sec support.');
      }
    } else {
      if (emailMemberships.length > 0) {
        throw httpError(409, 'A prior membership exists for your account. Contact Pac-Sec support; onboarding will not reactivate it.');
      }
      membership = await svc.OrganizationUser.create({
        organization_id: orgId,
        user_email: callerEmail,
        user_name: callerName,
        role: 'Organization Owner',
        status: 'Active',
      });
    }
    if (!membership || !membership.id) throw httpError(500, 'Membership creation failed.');
    membership = await svc.OrganizationUser.get(membership.id);
    if (
      !membership
      || membership.organization_id !== orgId
      || membership.status !== 'Active'
      || membership.role !== 'Organization Owner'
      || normalizedText(membership.user_email).toLowerCase() !== callerEmail
    ) {
      throw httpError(500, 'Membership could not be verified. Please retry.');
    }

    // ---- STEP C: Project ------------------------------------------------
    const expectedProjectName = `${company.company_name} — CMMC ${level}`;
    const expectedProjectType = level === 'Level 2' ? 'CMMC Level 2 Self-Assessment' : 'CMMC Level 1';
    const expectedAssessmentPath = level === 'Level 2' ? 'Level 2 Self-Assessment' : 'Level 1 Self-Assessment';
    const projectMatches = await readAll(svc.Project, { organization_id: orgId }, 'created_date');
    let project = singleton(projectMatches, 'project');
    if (project) {
      resumed = true;
      if (
        project.organization_id !== orgId
        || normalizedText(project.project_name) !== expectedProjectName
        || project.target_cmmc_level !== level
        || project.project_type !== expectedProjectType
        || project.assessment_path !== expectedAssessmentPath
        || project.implementation_stack !== implementationStack
        || normalizedText(project.project_owner_email).toLowerCase() !== callerEmail
      ) {
        throw httpError(409, 'The existing project does not match this onboarding request. Contact Pac-Sec support.');
      }
    } else {
      project = await svc.Project.create({
        organization_id: orgId,
        project_name: expectedProjectName,
        project_type: expectedProjectType,
        target_cmmc_level: level,
        assessment_path: expectedAssessmentPath,
        implementation_stack: implementationStack,
        project_status: 'Project Setup',
        project_owner_name: callerName,
        project_owner_email: callerEmail,
        start_date: new Date().toISOString().slice(0, 10),
      });
    }
    if (!project || !project.id) throw httpError(500, 'Project creation failed.');
    const projectId = project.id;
    project = await svc.Project.get(projectId);
    if (
      !project
      || project.organization_id !== orgId
      || normalizedText(project.project_name) !== expectedProjectName
      || project.target_cmmc_level !== level
      || project.project_type !== expectedProjectType
      || project.assessment_path !== expectedAssessmentPath
      || project.implementation_stack !== implementationStack
      || normalizedText(project.project_owner_email).toLowerCase() !== callerEmail
    ) {
      throw httpError(500, 'Project could not be verified. Please retry.');
    }

    // ---- STEP D: CompanyProfile (stays incomplete until step G) ---------
    const profileMatches = await readAll(svc.CompanyProfile, { organization_id: orgId }, 'created_date');
    let companyProfile = singleton(profileMatches, 'company profile');
    const profileMatchesRequest = (profile) => (
      profile
      && profile.organization_id === orgId
      && normalizedText(profile.company_name) === company.company_name
      && normalizedText(profile.cage_code) === company.cage_code
      && normalizedText(profile.duns_uei) === company.duns_uei
      && normalizedText(profile.dod_contracts) === company.dod_contracts
      && Number(profile.employee_count) === company.employee_count
      && profile.it_environment === company.it_environment
      && profile.implementation_stack === implementationStack
      && profile.uses_msp === company.uses_msp
      && normalizedText(profile.msp_name) === company.msp_name
      && profile.has_existing_ssp === company.has_existing_ssp
      && profile.cmmc_track === level
      && (!profile.active_project_id || profile.active_project_id === projectId)
    );
    if (companyProfile) {
      resumed = true;
      if (!profileMatchesRequest(companyProfile)) {
        throw httpError(409, 'The existing company profile does not match this onboarding request. Contact Pac-Sec support.');
      }
      if (!companyProfile.active_project_id) {
        companyProfile = await svc.CompanyProfile.update(companyProfile.id, { active_project_id: projectId });
      }
    } else {
      companyProfile = await svc.CompanyProfile.create({
        organization_id: orgId,
        company_name: company.company_name,
        cage_code: company.cage_code,
        duns_uei: company.duns_uei,
        dod_contracts: company.dod_contracts,
        employee_count: company.employee_count,
        it_environment: company.it_environment,
        implementation_stack: implementationStack,
        uses_msp: company.uses_msp,
        msp_name: company.msp_name,
        has_existing_ssp: company.has_existing_ssp,
        cmmc_track: level,
        active_project_id: projectId,
        onboarding_status: 'Scoping',
      });
    }
    if (!companyProfile || !companyProfile.id) throw httpError(500, 'Company profile creation failed.');
    const companyProfileId = companyProfile.id;
    companyProfile = await svc.CompanyProfile.get(companyProfileId);
    if (!profileMatchesRequest(companyProfile) || companyProfile.active_project_id !== projectId) {
      throw httpError(500, 'Company profile could not be verified. Please retry.');
    }
    if (
      companyProfile.onboarding_status !== 'Complete'
      && (
        organization.subscription_status !== 'Trial'
        || organization.subscription_tier !== 'Trial'
        || organization.trial_full_access !== true
      )
    ) {
      throw httpError(409, 'The incomplete workspace no longer has its original onboarding trial state. Contact Pac-Sec support.');
    }

    // ---- STEP E: ScopingProfile ----------------------------------------
    const expectedScopeName = `${company.company_name} — Assessment Scope`;
    const scopeMatchesRequest = (scope) => (
      scope
      && scope.organization_id === orgId
      && scope.project_id === projectId
      && normalizedText(scope.scope_name) === expectedScopeName
      && scope.handles_fci === derived.handles_fci
      && scope.handles_cui === derived.handles_cui
      && normalizedText(scope.cui_hosting) === cui.hosting
      && normalizedText(scope.cui_hosting_notes) === cui.notes
      && answersMatch(scope.wizard_answers, wizardAnswers)
    );
    const scopeMatches = await readAll(svc.ScopingProfile, { project_id: projectId }, 'created_date');
    let scopingProfile = singleton(scopeMatches, 'scoping profile');
    if (scopingProfile) {
      resumed = true;
      if (!scopeMatchesRequest(scopingProfile)) {
        throw httpError(409, 'The existing scope record does not match this onboarding request. Contact Pac-Sec support.');
      }
    } else {
      scopingProfile = await svc.ScopingProfile.create({
        organization_id: orgId,
        project_id: projectId,
        scope_name: expectedScopeName,
        handles_fci: derived.handles_fci,
        handles_cui: derived.handles_cui,
        environment_type: 'Unknown',
        ...(cui.hosting ? { cui_hosting: cui.hosting } : {}),
        ...(cui.notes ? { cui_hosting_notes: cui.notes } : {}),
        wizard_answers: wizardAnswers,
        scope_status: 'Draft',
      });
    }
    if (!scopingProfile || !scopingProfile.id) throw httpError(500, 'Scope record creation failed.');
    scopingProfile = await svc.ScopingProfile.get(scopingProfile.id);
    if (!scopeMatchesRequest(scopingProfile)) {
      throw httpError(500, 'Scope record could not be verified. Please retry.');
    }

    // ---- STEP F: ControlAssessment set ---------------------------------
    // Source of truth: the ACTIVE AUTHORITATIVE library rows for this exact
    // level and dataset. Level 2 means the 110 Level 2 rows only.
    const libraryRows = await readAll(
      svc.ControlLibrary,
      { dataset_key: ACTIVE_DATASET_KEY, cmmc_level: level, active: true, authoritative: true },
      'sort_order',
    );
    if (libraryRows.length !== expectedCount) {
      throw httpError(500, `The authoritative ${level} requirement set is unavailable (expected ${expectedCount}, found ${libraryRows.length}). Setup cannot continue.`);
    }
    const canonicalIds = new Set();
    const canonicalRows = new Map();
    for (const row of libraryRows) {
      const controlId = typeof row.control_id === 'string' ? row.control_id.trim() : '';
      if (!controlId) throw httpError(500, 'The authoritative requirement set contains a blank requirement id.');
      if (canonicalIds.has(controlId)) throw httpError(500, `The authoritative requirement set contains a duplicate id: ${controlId}.`);
      if (!row.control_title || !row.domain) throw httpError(500, `The authoritative requirement ${controlId} is missing a title or domain.`);
      if (row.cmmc_level !== level) throw httpError(500, `The authoritative requirement ${controlId} is not ${level}.`);
      canonicalIds.add(controlId);
      canonicalRows.set(controlId, row);
    }
    if (canonicalIds.size !== expectedCount) {
      throw httpError(500, 'The authoritative requirement set failed its uniqueness check.');
    }

    const existingAssessments = await readAll(svc.ControlAssessment, { project_id: projectId }, 'created_date');
    const seenIds = new Set();
    for (const row of existingAssessments) {
      if (row.organization_id !== orgId || row.project_id !== projectId) {
        throw httpError(409, 'Existing requirement records are linked to the wrong workspace. Contact Pac-Sec support.');
      }
      if (!canonicalIds.has(row.control_id)) {
        throw httpError(409, `An unexpected requirement record (${row.control_id || 'blank'}) already exists on this project. Contact Pac-Sec support.`);
      }
      const canonicalRow = canonicalRows.get(row.control_id);
      if (
        row.cmmc_level !== level
        || normalizedText(row.control_title) !== normalizedText(canonicalRow.control_title)
        || normalizedText(row.domain) !== normalizedText(canonicalRow.domain)
      ) {
        throw httpError(409, `Requirement ${row.control_id} does not match the authoritative library row. Contact Pac-Sec support.`);
      }
      if (seenIds.has(row.control_id)) {
        throw httpError(409, `Requirement ${row.control_id} is duplicated on this project. Contact Pac-Sec support.`);
      }
      seenIds.add(row.control_id);
    }
    if (existingAssessments.length > 0) resumed = true;

    const missingRows = libraryRows
      .filter((row) => !seenIds.has(row.control_id.trim()))
      .map((row) => ({
        organization_id: orgId,
        project_id: projectId,
        control_id: row.control_id.trim(),
        control_title: row.control_title,
        domain: row.domain,
        cmmc_level: level,
        status: 'Not Started',
        evidence_status: 'No Evidence',
        risk_rating: 'Moderate',
      }));
    for (let i = 0; i < missingRows.length; i += PAGE_LIMIT) {
      await svc.ControlAssessment.bulkCreate(missingRows.slice(i, i + PAGE_LIMIT));
    }

    // ---- STEP G: post-validate everything, then complete the profile ----
    const finalAssessments = await readAll(svc.ControlAssessment, { project_id: projectId }, 'created_date');
    if (finalAssessments.length !== expectedCount) {
      throw httpError(500, `Requirement setup is incomplete (${finalAssessments.length} of ${expectedCount}). Please retry.`);
    }
    const finalIds = new Set();
    for (const row of finalAssessments) {
      if (row.organization_id !== orgId || row.project_id !== projectId || row.cmmc_level !== level) {
        throw httpError(500, 'Requirement records failed verification. Please retry.');
      }
      const canonicalRow = canonicalRows.get(row.control_id);
      if (
        !canonicalRow
        || finalIds.has(row.control_id)
        || normalizedText(row.control_title) !== normalizedText(canonicalRow.control_title)
        || normalizedText(row.domain) !== normalizedText(canonicalRow.domain)
      ) {
        throw httpError(500, 'Requirement records failed verification. Please retry.');
      }
      finalIds.add(row.control_id);
    }
    if (finalIds.size !== expectedCount) {
      throw httpError(500, 'Requirement records failed verification. Please retry.');
    }

    // Re-query every singleton after all creates. This detects duplicate rows
    // produced by concurrent retries before onboarding is marked complete.
    const [
      finalOrganizations,
      finalMemberships,
      finalProjects,
      finalProfiles,
      finalScopes,
    ] = await Promise.all([
      readAll(svc.Organization, { onboarding_key: onboardingKey }, 'created_date'),
      readAll(svc.OrganizationUser, { user_email: callerEmail }, 'created_date'),
      readAll(svc.Project, { organization_id: orgId }, 'created_date'),
      readAll(svc.CompanyProfile, { organization_id: orgId }, 'created_date'),
      readAll(svc.ScopingProfile, { project_id: projectId }, 'created_date'),
    ]);
    organization = singleton(finalOrganizations, 'organization');
    membership = singleton(finalMemberships, 'organization membership');
    project = singleton(finalProjects, 'project');
    companyProfile = singleton(finalProfiles, 'company profile');
    scopingProfile = singleton(finalScopes, 'scoping profile');
    if (
      !organization
      || organization.id !== orgId
      || organization.onboarding_key !== onboardingKey
      || !membership
      || membership.organization_id !== orgId
      || membership.status !== 'Active'
      || membership.role !== 'Organization Owner'
      || normalizedText(membership.user_email).toLowerCase() !== callerEmail
      || !project
      || project.id !== projectId
      || project.organization_id !== orgId
      || !profileMatchesRequest(companyProfile)
      || companyProfile.active_project_id !== projectId
      || !scopeMatchesRequest(scopingProfile)
    ) {
      throw httpError(500, 'Workspace singleton verification failed. Please retry.');
    }

    if (companyProfile.onboarding_status !== 'Complete') {
      companyProfile = await svc.CompanyProfile.update(companyProfileId, {
        onboarding_status: 'Complete',
        onboarding_completed_date: new Date().toISOString(),
      });
    }
    companyProfile = await svc.CompanyProfile.get(companyProfileId);
    if (!companyProfile || companyProfile.onboarding_status !== 'Complete') {
      throw httpError(500, 'Setup could not be finalized. Please retry.');
    }

    // ---- STEP H: LAST — bind the authenticated user to the workspace ----
    // Only ever the caller's own record, identified by the verified session id.
    await svc.User.update(callerId, { role: 'client', organization_id: orgId });
    const verifiedUser = await svc.User.get(callerId);
    if (!verifiedUser || verifiedUser.id !== callerId || verifiedUser.organization_id !== orgId || verifiedUser.role !== 'client') {
      throw httpError(500, 'Your account could not be linked to the new workspace. Please retry.');
    }

    return Response.json({
      ok: true,
      resumed,
      organization,
      project,
      companyProfile,
      counts: {
        controlAssessments: finalAssessments.length,
        expectedControlAssessments: expectedCount,
        targetLevel: level,
      },
    });
  } catch (error) {
    const status = error && Number.isInteger(error.status) ? error.status : 500;
    const message = status >= 500
      ? 'Workspace setup failed. Your progress is saved — please retry.'
      : (error && error.message ? error.message : 'The onboarding request could not be completed.');
    return Response.json({ error: message }, { status });
  }
}