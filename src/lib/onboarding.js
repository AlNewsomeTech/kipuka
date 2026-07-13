// Onboarding engine: decides whether a user needs the first-run wizard, and
// performs the atomic setup (Organization → OrganizationUser → CompanyProfile →
// default Project → seeded ScopingProfile + ControlAssessments).
//
// Also handles the one-time migration of legacy ControlProgress → ControlAssessment.
import { base44 } from '@/api/base44Client';
import { CONTROL_LIBRARY_SEED } from '@/lib/controlLibrarySeed';
import { CONTROL_LIBRARY_LEVEL2_SEED } from '@/lib/controlLibraryLevel2Seed';

// Map a legacy ControlProgress status → a ControlAssessment status.
const PROGRESS_TO_ASSESSMENT = {
  'Not Started': 'Not Started',
  'In Progress': 'Implementation In Progress',
  'Evidence Needed': 'Implemented Pending Evidence',
  'Ready for Review': 'Evidence Needs Review',
  'Reviewed': 'Evidence Accepted',
  'Complete': 'Ready for Documentation',
};

// Rank assessment statuses so migration only overwrites when the legacy record is
// MORE advanced than the existing assessment.
const STATUS_RANK = {
  'Not Started': 0,
  'Implementation Planned': 1,
  'Implementation In Progress': 2,
  'Implemented Pending Evidence': 3,
  'Evidence Uploaded': 4,
  'Evidence Needs Review': 5,
  'Gap Identified': 2,
  'POA&M Linked': 3,
  'Partially Implemented': 3,
  'Not Implemented': 1,
  'Not Applicable': 1,
  'Needs Review': 4,
  'Evidence Accepted': 6,
  'Implemented': 6,
  'Ready for Documentation': 7,
  'Ready for Assessment': 7,
};

function rank(status) {
  return STATUS_RANK[status] != null ? STATUS_RANK[status] : 0;
}

// Determine the onboarding state for the current user.
// Returns { needsWizard, companyProfile, organizationId }.
// isPlatformAdmin / isPacSec users are exempt (they manage orgs manually).
export async function resolveOnboardingState({ user, memberships, isPlatformAdmin }) {
  if (!user) return { needsWizard: false };

  // Platform super-admins and Pac-Sec staff are exempt from the wizard.
  if (isPlatformAdmin) return { needsWizard: false };
  const isPacSecMember = (memberships || []).some(
    (m) => m.role === 'Pac-Sec Admin' || m.role === 'Pac-Sec Support'
  );
  if (isPacSecMember) return { needsWizard: false };

  // Users who were invited into an existing org (any membership) never see the
  // wizard — they join with their assigned role.
  const activeMemberships = (memberships || []).filter((m) => m.status !== 'Removed');
  if (activeMemberships.length > 0) {
    // They belong to at least one org. Check that org has a company profile; if a
    // company profile exists (or they are not the owner), no wizard.
    const orgId = activeMemberships[0].organization_id;
    const profiles = await base44.entities.CompanyProfile
      .filter({ organization_id: orgId }).catch(() => []);
    return {
      needsWizard: false,
      companyProfile: profiles[0] || null,
      organizationId: orgId,
    };
  }

  // No memberships at all, and not exempt → brand-new self-service signup.
  return { needsWizard: true };
}

// Seed the ScopingProfile for the default project from the questionnaire result.
async function createScopingProfile({ organizationId, projectId, companyName, track, answers, trackResult, cuiHosting, cuiHostingNotes }) {
  return base44.entities.ScopingProfile.create({
    organization_id: organizationId,
    project_id: projectId,
    scope_name: `${companyName} — Assessment Scope`,
    handles_fci: trackResult.handles_fci,
    handles_cui: trackResult.handles_cui,
    environment_type: 'Unknown',
    ...(cuiHosting ? { cui_hosting: cuiHosting } : {}),
    ...(cuiHostingNotes ? { cui_hosting_notes: cuiHostingNotes } : {}),
    wizard_answers: Object.fromEntries(
      Object.entries(answers).map(([k, v]) => [k, v ? 'Yes' : 'No'])
    ),
    scope_status: 'Draft',
  }).catch(() => null);
}

// Seed ControlAssessment rows for the chosen track from the local seed constants.
// Level 1 → 17 practices. Level 2 → Level 1 + Level 2 practices (110 total).
async function seedAssessments({ organizationId, projectId, track }) {
  let seed = [...CONTROL_LIBRARY_SEED];
  if (track === 'Level 2') seed = [...CONTROL_LIBRARY_SEED, ...CONTROL_LIBRARY_LEVEL2_SEED];
  const rows = seed.map((c) => ({
    organization_id: organizationId,
    project_id: projectId,
    control_id: c.control_id,
    control_title: c.control_title,
    domain: c.domain,
    cmmc_level: c.cmmc_level,
    status: 'Not Started',
    evidence_status: 'No Evidence',
    risk_rating: 'Moderate',
  }));
  if (rows.length) await base44.entities.ControlAssessment.bulkCreate(rows).catch(() => {});
}

// Perform the full atomic onboarding. Returns { organization, project, companyProfile }.
export async function completeOnboarding({ user, company, answers, trackResult, cuiHosting, cuiHostingNotes }) {
  const track = trackResult.track;
  const projectLevel = track === 'Level 2' ? 'Level 2' : 'Level 1';

  // 1) Organization
  const organization = await base44.entities.Organization.create({
    organization_name: company.company_name,
    legal_name: company.company_name,
    primary_contact_name: user.full_name || '',
    primary_contact_email: user.email || '',
    cage_codes: company.cage_code ? [company.cage_code] : [],
    uei: company.duns_uei || '',
    subscription_status: 'Trial',
    plan_tier: 'L1_Essentials',
    trial_full_access: true,
    trial_ends_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  });

  // 2) Membership — sole Org Admin
  await base44.entities.OrganizationUser.create({
    organization_id: organization.id,
    user_email: user.email,
    user_name: user.full_name || '',
    role: 'Organization Admin',
    status: 'Active',
  }).catch(() => {});

  // 3) Default implementation Project
  const project = await base44.entities.Project.create({
    organization_id: organization.id,
    project_name: `${company.company_name} — CMMC ${projectLevel}`,
    project_type: track === 'Level 2' ? 'CMMC Level 2 Self-Assessment' : 'CMMC Level 1',
    target_cmmc_level: projectLevel,
    assessment_path: track === 'Level 2' ? 'Level 2 Self-Assessment' : 'Level 1 Self-Assessment',
    project_status: 'Project Setup',
    project_owner_name: user.full_name || '',
    project_owner_email: user.email || '',
    start_date: new Date().toISOString().slice(0, 10),
  });

  // 4) CompanyProfile
  const companyProfile = await base44.entities.CompanyProfile.create({
    organization_id: organization.id,
    company_name: company.company_name,
    cage_code: company.cage_code || '',
    duns_uei: company.duns_uei || '',
    dod_contracts: company.dod_contracts || '',
    employee_count: Number(company.employee_count) || 0,
    it_environment: company.it_environment || 'Unknown',
    uses_msp: !!company.uses_msp,
    msp_name: company.msp_name || '',
    has_existing_ssp: !!company.has_existing_ssp,
    cmmc_track: track,
    active_project_id: project.id,
    onboarding_status: 'Complete',
    onboarding_completed_date: new Date().toISOString(),
  });

  // 5) ScopingProfile + ControlAssessments (parallel)
  await Promise.all([
    createScopingProfile({ organizationId: organization.id, projectId: project.id, companyName: company.company_name, track, answers, trackResult, cuiHosting, cuiHostingNotes }),
    seedAssessments({ organizationId: organization.id, projectId: project.id, track }),
  ]);

  return { organization, project, companyProfile };
}

// One-time migration: fold legacy ControlProgress rows into ControlAssessment on
// the given project. Only upgrades when the legacy status is more advanced.
// clientId is the legacy client/project key ControlProgress used.
export async function migrateControlProgress({ organizationId, projectId, clientId }) {
  const [progressRows, assessments] = await Promise.all([
    base44.entities.ControlProgress.filter({ client_id: clientId }).catch(() => []),
    base44.entities.ControlAssessment.filter({ project_id: projectId }).catch(() => []),
  ]);
  if (!progressRows.length) return { migrated: 0 };

  const byControl = {};
  assessments.forEach((a) => { byControl[a.control_id] = a; });

  let migrated = 0;
  for (const pr of progressRows) {
    const mappedStatus = PROGRESS_TO_ASSESSMENT[pr.status] || 'Not Started';
    const existing = byControl[pr.control_id];
    const patch = {};
    if (pr.control_narrative) patch.implementation_summary = pr.control_narrative;
    if (pr.assigned_owner) patch.responsible_owner = pr.assigned_owner;
    if (pr.reviewer_notes) patch.assessor_notes = pr.reviewer_notes;

    if (existing) {
      if (rank(mappedStatus) > rank(existing.status)) patch.status = mappedStatus;
      if (Object.keys(patch).length) {
        await base44.entities.ControlAssessment.update(existing.id, patch).catch(() => {});
        migrated += 1;
      }
    } else {
      await base44.entities.ControlAssessment.create({
        organization_id: organizationId,
        project_id: projectId,
        control_id: pr.control_id,
        cmmc_level: pr.level || 'Level 1',
        status: mappedStatus,
        evidence_status: 'No Evidence',
        risk_rating: 'Moderate',
        ...patch,
      }).catch(() => {});
      migrated += 1;
    }
  }
  return { migrated };
}