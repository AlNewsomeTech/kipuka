// Onboarding engine (client side).
//
// This module decides whether a user needs the first-run wizard and hands the
// actual tenant creation to the server. It performs NO entity writes: the whole
// Organization → membership → Project → CompanyProfile → ScopingProfile →
// ControlAssessment sequence lives in the completeSelfServiceOnboarding backend
// function, which derives identity and track server-side and is idempotent and
// resumable. The browser never seeds requirement rows.
import { base44 } from '@/api/base44Client';

// Determine the onboarding state for the current user.
// Returns { needsWizard, companyProfile, organizationId }.
// isPlatformAdmin / isPacSec users are exempt (they manage orgs manually).
// Read failures intentionally propagate so the gate can fail closed.
export async function resolveOnboardingState({ user, memberships, isPlatformAdmin }) {
  if (!user) return { needsWizard: false };

  // Platform super-admins and active Pac-Sec staff are exempt from the
  // wizard. Invited, Disabled, and Removed memberships grant no privilege.
  if (isPlatformAdmin) return { needsWizard: false };
  const activeMemberships = (memberships || []).filter((m) => m.status === 'Active');
  const isPacSecMember = activeMemberships.some(
    (m) => m.role === 'Pac-Sec Admin' || m.role === 'Pac-Sec Support'
  );
  if (isPacSecMember) return { needsWizard: false };

  // Users with one active membership join their assigned organization.
  if (activeMemberships.length > 0) {
    const orgId = activeMemberships[0].organization_id;
    const profiles = await base44.entities.CompanyProfile.filter({ organization_id: orgId });
    return {
      needsWizard: false,
      companyProfile: profiles[0] || null,
      organizationId: orgId,
    };
  }

  // No memberships at all, and not exempt → brand-new self-service signup.
  return { needsWizard: true };
}

// Complete onboarding. Thin wrapper over the canonical backend function.
// Only company details, the questionnaire answers, and the CUI hosting decision
// are sent — never a user, role, tenant id, or a client-computed track.
export async function completeOnboarding({ company, answers, cuiHosting, cuiHostingNotes }) {
  let response;
  try {
    response = await base44.functions.invoke('completeSelfServiceOnboarding', {
      company,
      answers,
      cui_hosting: cuiHosting || '',
      cui_hosting_notes: cuiHostingNotes || '',
    });
  } catch (err) {
    const serverMessage = err?.response?.data?.error;
    throw new Error(serverMessage || err?.message || 'We could not set up your workspace. Please try again.');
  }

  const data = response?.data;
  if (!data || data.ok !== true) {
    throw new Error(data?.error || 'We could not set up your workspace. Please try again.');
  }
  if (!data.organization?.id || !data.project?.id || !data.companyProfile?.id) {
    throw new Error('Your workspace was not fully created. Please try again or contact Pac-Sec support.');
  }
  return data;
}