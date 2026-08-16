import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, FolderKanban, ShieldCheck, ArrowRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useOrg } from '@/lib/orgContext';
import { visibleProjects } from '@/lib/projectAccess';
import { PERMS } from '@/lib/orgRoles';
import { computeCanonicalReadiness } from '@/lib/canonicalReadiness';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';

export default function Projects() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedOrgId, selectedOrg, orgRole, isPlatformAdmin, memberships, organizations, can } = useOrg();
  const [projects, setProjects] = useState([]);
  const [readinessById, setReadinessById] = useState({});
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
      const objectiveLibrary = await base44.entities.AssessmentObjectiveLibrary.list('sort_order', 500).catch(() => []);
      const readinessEntries = await Promise.all(scoped.map(async (project) => {
        const [assessments, objectiveLinks, evidence, poams] = await Promise.all([
          base44.entities.ControlAssessment.filter({ project_id: project.id }).catch(() => []),
          base44.entities.ObjectiveEvidenceLink.filter({ project_id: project.id }).catch(() => []),
          base44.entities.ProjectEvidence.filter({ project_id: project.id }).catch(() => []),
          base44.entities.ProjectPOAM.filter({ project_id: project.id }).catch(() => []),
        ]);
        return [project.id, computeCanonicalReadiness({ project, assessments, objectiveLibrary, objectiveLinks, evidence, poams })];
      }));
      if (alive) { setProjects(scoped); setReadinessById(Object.fromEntries(readinessEntries)); setLoading(false); }
    })();
    return () => { alive = false; };
  }, [selectedOrgId, orgRole, isPlatformAdmin, memberships, user]);

  const orgName = (id) => organizations.find((o) => o.id === id)?.organization_name || '—';
  const canCreate = isPlatformAdmin || can(PERMS.CREATE_PROJECT);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="page-kicker">Engagements</div>
          <h1 className="page-title mt-2">CMMC projects</h1>
          <p className="page-subtitle mt-2">{selectedOrg ? selectedOrg.organization_name : 'All accessible organizations'}</p>
        </div>
        {canCreate && (
          <Link
            to="/projects/new"
            className="btn-primary"
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
            description="Start a new CMMC project to run the guided level-determination wizard and build its implementation modules."
            action={canCreate ? (
              <Link to="/projects/new" className="btn-primary">
                <Plus className="w-4 h-4" /> New CMMC Project
              </Link>
            ) : null}
          />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => {
            const readiness = readinessById[p.id];
            const score = readiness?.integrity_ok ? readiness.readiness_pct : null;
            return (
            <button
              key={p.id}
              onClick={() => navigate(`/projects/${p.id}`)}
              className="app-surface app-surface-interactive overflow-hidden p-5 text-left"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#0b1930] to-[#1d4a73] shadow-md">
                  <ShieldCheck className="h-5 w-5 text-[#9bd9f7]" />
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
              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between">
                  <div className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-slate-400">Readiness</div>
                  <span className="metric-value text-sm font-extrabold text-slate-800">{score == null ? 'Integrity check required' : `${score}%`}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#479dcf] to-[#2f7eaa]" style={{ width: `${score == null ? 0 : Math.min(100, Math.max(0, score))}%` }} />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-end">
                <span className="flex items-center gap-1 text-xs font-extrabold text-blue-600">Open project <ArrowRight className="h-3.5 w-3.5" /></span>
              </div>
            </button>
            );
          })}
        </div>
      )}
    </div>
  );
}