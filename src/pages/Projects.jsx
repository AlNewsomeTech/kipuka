import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, FolderKanban, ShieldCheck, ArrowRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useOrg } from '@/lib/orgContext';
import { visibleProjects } from '@/lib/projectAccess';
import { PERMS } from '@/lib/orgRoles';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';

export default function Projects() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedOrgId, selectedOrg, orgRole, isPlatformAdmin, memberships, organizations, can } = useOrg();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const all = await base44.entities.Project.list('-created_date', 500).catch(() => []);
      const supportOrgIds = (memberships || [])
        .filter((m) => m.role === 'Pac-Sec Support')
        .map((m) => m.organization_id);
      const scoped = visibleProjects(all, {
        orgRole, isPlatformAdmin, selectedOrgId, userEmail: user?.email, supportOrgIds,
      });
      if (alive) { setProjects(scoped); setLoading(false); }
    })();
    return () => { alive = false; };
  }, [selectedOrgId, orgRole, isPlatformAdmin, memberships, user]);

  const orgName = (id) => organizations.find((o) => o.id === id)?.organization_name || '—';
  const canCreate = isPlatformAdmin || can(PERMS.CREATE_PROJECT);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {selectedOrg ? selectedOrg.organization_name : 'All accessible organizations'}
          </p>
        </div>
        {canCreate && (
          <Link
            to="/projects/new"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52]"
          >
            <Plus className="w-4 h-4" /> New CMMC Project
          </Link>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200">
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            description="Start a new CMMC project to run the guided level-determination wizard and generate a project workspace."
            action={canCreate ? (
              <Link to="/projects/new" className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52]">
                <Plus className="w-4 h-4" /> New CMMC Project
              </Link>
            ) : null}
          />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => navigate(`/projects/${p.id}`)}
              className="bg-white rounded-xl border border-slate-200 p-5 text-left hover:border-blue-300 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-[#0F1E3C] flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-white" />
                </div>
                <StatusBadge status={p.project_status} size="xs" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 truncate">{p.project_name}</h3>
              {(isPlatformAdmin || orgRole?.startsWith('Pac-Sec')) && (
                <p className="text-[11px] text-slate-400 mt-0.5">{orgName(p.organization_id)}</p>
              )}
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                <span className="bg-slate-100 px-2 py-0.5 rounded-full font-medium">{p.target_cmmc_level}</span>
                <span className="truncate">{p.assessment_path}</span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="text-xs text-slate-500">Readiness <span className="font-bold text-slate-800">{Math.round(p.current_readiness_score || 0)}%</span></div>
                <span className="flex items-center gap-1 text-xs font-semibold text-blue-600">Open <ArrowRight className="w-3.5 h-3.5" /></span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}