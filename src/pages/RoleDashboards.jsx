import { useState, useEffect, useMemo } from 'react';
import { Loader2, LayoutDashboard } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useOrg } from '@/lib/orgContext';
import { useAuth } from '@/lib/AuthContext';
import { visibleProjects } from '@/lib/projectAccess';
import { FEATURES } from '@/lib/subscriptionTiers';
import { useProjectDashboardData } from '@/lib/useProjectDashboardData';
import UpgradePrompt from '@/components/commercial/UpgradePrompt';
import ExecutiveDashboard from '@/components/dashboards/ExecutiveDashboard';
import ComplianceManagerDashboard from '@/components/dashboards/ComplianceManagerDashboard';
import ITAdminDashboard from '@/components/dashboards/ITAdminDashboard';
import AuditorViewerDashboard from '@/components/dashboards/AuditorViewerDashboard';
import PacSecSupportDashboard from '@/components/dashboards/PacSecSupportDashboard';

// Maps org role → available dashboard views. Order = default preference.
const ROLE_VIEWS = {
  'Organization Owner': ['executive', 'compliance'],
  'Organization Admin': ['executive', 'compliance', 'it'],
  'Compliance Manager': ['compliance', 'executive'],
  'IT Admin': ['it', 'compliance'],
  'Evidence Contributor': ['compliance'],
  'Executive Viewer': ['executive'],
  'Auditor Viewer': ['auditor'],
  'Pac-Sec Support': ['support', 'executive', 'compliance'],
  'Pac-Sec Admin': ['support', 'executive', 'compliance', 'it'],
};

const VIEW_LABELS = {
  executive: 'Executive', compliance: 'Compliance Manager', it: 'IT Admin',
  auditor: 'Auditor', support: 'Pac-Sec Support',
};

function ProjectDashboardView({ view, project, org }) {
  const { data, loading } = useProjectDashboardData(project?.id);
  const { hasFeature } = useOrg();

  if (!project) return <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-500">Select a project to view this dashboard.</div>;
  if (loading || !data) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  if (view === 'executive' && !hasFeature(FEATURES.EXECUTIVE_DASHBOARD)) {
    return <UpgradePrompt feature="Executive Dashboard" description="Roll-up readiness, blockers, and executive decisions are available on Premium and Pac-Sec Managed plans." />;
  }

  if (view === 'executive') return <ExecutiveDashboard project={project} data={data} />;
  if (view === 'compliance') return <ComplianceManagerDashboard project={project} data={data} />;
  if (view === 'it') return <ITAdminDashboard project={project} data={data} />;
  if (view === 'auditor') return <AuditorViewerDashboard project={project} data={data} />;
  return null;
}

export default function RoleDashboards() {
  const { user } = useAuth();
  const { orgRole, isPlatformAdmin, selectedOrgId, organizations, memberships } = useOrg();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState(null);
  const [projectId, setProjectId] = useState(null);

  const views = ROLE_VIEWS[orgRole] || (isPlatformAdmin ? ROLE_VIEWS['Pac-Sec Admin'] : ['compliance']);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const all = await base44.entities.Project.list('-created_date', 500).catch(() => []);
      if (!alive) return;
      const supportOrgIds = memberships.filter((m) => m.role === 'Pac-Sec Support').map((m) => m.organization_id);
      const visible = visibleProjects(all, { orgRole, isPlatformAdmin, selectedOrgId, userEmail: user?.email, supportOrgIds });
      setProjects(visible);
      setProjectId((prev) => prev || visible[0]?.id || null);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [orgRole, isPlatformAdmin, selectedOrgId, memberships, user?.email]);

  useEffect(() => { if (!view && views.length) setView(views[0]); }, [views, view]);

  const project = useMemo(() => projects.find((p) => p.id === projectId) || null, [projects, projectId]);
  const projectOrg = organizations.find((o) => o.id === project?.organization_id) || null;

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2.5 mb-3">
          <LayoutDashboard className="w-5 h-5 text-[#0F1E3C]" />
          <h1 className="text-lg font-bold text-slate-900">Role Dashboards</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1.5">
            {views.map((v) => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${view === v ? 'bg-[#0F1E3C] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {VIEW_LABELS[v]}
              </button>
            ))}
          </div>
          {view !== 'support' && (
            <select value={projectId || ''} onChange={(e) => setProjectId(e.target.value || null)}
              className="ml-auto text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 min-w-[220px]">
              {projects.length === 0 && <option value="">No projects</option>}
              {projects.map((p) => <option key={p.id} value={p.id}>{p.project_name}</option>)}
            </select>
          )}
        </div>
      </div>

      {view === 'support'
        ? <PacSecSupportDashboard organizations={organizations} projects={projects} />
        : <ProjectDashboardView view={view} project={project} org={projectOrg} />}
    </div>
  );
}