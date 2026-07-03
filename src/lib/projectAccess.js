// Role-based project visibility & access helpers. Pure functions.
import { isReadOnly } from '@/lib/orgRoles';

// Which projects a user can see, given their org context.
// - Pac-Sec Admin / platform admin: all projects.
// - Pac-Sec Support: projects for assigned orgs OR explicitly assigned to them.
// - Everyone else: projects in their currently selected org.
export function visibleProjects(projects, { orgRole, isPlatformAdmin, selectedOrgId, userEmail, supportOrgIds = [] }) {
  if (isPlatformAdmin || orgRole === 'Pac-Sec Admin') return projects;

  if (orgRole === 'Pac-Sec Support') {
    const emailLower = (userEmail || '').toLowerCase();
    return projects.filter((p) =>
      supportOrgIds.includes(p.organization_id) ||
      (p.assigned_pacsec_support || []).some((e) => (e || '').toLowerCase() === emailLower)
    );
  }

  if (!selectedOrgId) return [];
  return projects.filter((p) => p.organization_id === selectedOrgId);
}

// Auditor Viewer read-only modules within a project.
export const AUDITOR_MODULES = ['dashboard', 'ssp', 'poam', 'evidence', 'reports'];

// Whether the current org role may open a given module.
export function canAccessModule(orgRole, moduleKey) {
  if (isReadOnly(orgRole)) {
    return AUDITOR_MODULES.includes(moduleKey);
  }
  return true;
}

// Whether the role can edit within a project at all.
export function canEditProject(orgRole) {
  return !isReadOnly(orgRole);
}