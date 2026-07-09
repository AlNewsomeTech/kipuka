import { useState, useEffect, useCallback } from 'react';
import { useParams, Outlet, useLocation, Navigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useOrg } from '@/lib/orgContext';
import { canAccessModule } from '@/lib/projectAccess';
import { moduleByKey } from '@/lib/projectModules';
import { isClientView } from '@/lib/clientView';
import ProjectNav from '@/components/project/ProjectNav';
import ProjectBreadcrumb from '@/components/project/ProjectBreadcrumb';
import ConfidentialityFooter from '@/components/legal/ConfidentialityFooter';

export default function ProjectWorkspace() {
  const { id } = useParams();
  const location = useLocation();
  const { organizations, orgRole, readOnly, hasFeature, isPlatformAdmin } = useOrg();
  const isClient = isClientView(orgRole, isPlatformAdmin);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProject = useCallback(async () => {
    const p = await base44.entities.Project.get(id).catch(() => null);
    setProject(p);
    setLoading(false);
  }, [id]);

  useEffect(() => { setLoading(true); loadProject(); }, [loadProject]);

  const refreshProject = useCallback(async () => {
    const p = await base44.entities.Project.get(id).catch(() => null);
    setProject(p);
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }
  if (!project) return <Navigate to="/projects" replace />;

  // Determine current module key from the URL.
  const parts = location.pathname.split('/').filter(Boolean); // projects, :id, [module]
  const moduleKey = parts[2] || 'dashboard';
  const isGuided = moduleKey === 'guided';
  const moduleDef = isGuided ? { label: 'Guided Setup' } : moduleByKey(moduleKey);

  // Read-only roles blocked from restricted modules → send to dashboard.
  // Guided setup is an implementation surface — treated like the assessment module.
  if (!isGuided && !canAccessModule(orgRole, moduleKey)) {
    return <Navigate to={`/projects/${id}`} replace />;
  }

  const org = organizations.find((o) => o.id === project.organization_id) || null;
  const orgName = org?.organization_name || 'Organization';

  return (
    <div className="space-y-4">
      <ProjectBreadcrumb
        orgName={orgName}
        projectName={project.project_name}
        projectId={project.id}
        moduleLabel={moduleDef.label}
      />

      <div className="flex flex-col lg:flex-row gap-4">
        <ProjectNav projectId={project.id} orgRole={orgRole} isClient={isClient} />
        <div className="flex-1 min-w-0">
          <Outlet context={{ project, refreshProject, orgRole, readOnly, hasFeature, orgName, org }} />
        </div>
      </div>

      <ConfidentialityFooter />
    </div>
  );
}