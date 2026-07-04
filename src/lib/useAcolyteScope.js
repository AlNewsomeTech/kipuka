import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useOrg } from '@/lib/orgContext';
import { visibleProjects } from '@/lib/projectAccess';

const LS_KEY = 'acolyte_selected_project';

// Resolves ACOLYTE tenant + project scope for the app-level ACOLYTE pages.
// Loads projects the user can see (scoped to the selected org), tracks the
// active project, and exposes org/project context + a read-only flag.
export function useAcolyteScope() {
  const { user } = useAuth();
  const { selectedOrgId, selectedOrg, organizations, orgRole, isPlatformAdmin, memberships, readOnly } = useOrg();
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState(() => localStorage.getItem(LS_KEY) || null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const all = await base44.entities.Project.list('-created_date', 500).catch(() => []);
    const supportOrgIds = (memberships || [])
      .filter((m) => m.role === 'Pac-Sec Support')
      .map((m) => m.organization_id);
    let scoped = visibleProjects(all, {
      orgRole, isPlatformAdmin, selectedOrgId, userEmail: user?.email, supportOrgIds,
    });
    if (selectedOrgId) scoped = scoped.filter((p) => p.organization_id === selectedOrgId);
    setProjects(scoped);

    // Ensure the active project is valid within the current scope.
    setProjectId((prev) => {
      if (prev && scoped.some((p) => p.id === prev)) return prev;
      return scoped.length ? scoped[0].id : null;
    });
    setLoading(false);
  }, [user, selectedOrgId, orgRole, isPlatformAdmin, memberships]);

  useEffect(() => { load(); }, [load]);

  const selectProject = (id) => {
    setProjectId(id || null);
    if (id) localStorage.setItem(LS_KEY, id);
    else localStorage.removeItem(LS_KEY);
  };

  const project = projects.find((p) => p.id === projectId) || null;
  const orgName = (id) => organizations.find((o) => o.id === id)?.organization_name || '\u2014';

  return {
    loading,
    projects,
    project,
    projectId,
    selectProject,
    selectedOrg,
    selectedOrgId,
    orgName,
    orgNameForProject: project ? orgName(project.organization_id) : (selectedOrg?.organization_name || '\u2014'),
    readOnly,
    orgRole,
    user,
    refresh: load,
  };
}