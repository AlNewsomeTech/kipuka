import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Image, FileWarning, Layers, ArrowRight, HardDrive, AlertTriangle } from 'lucide-react';
import { canonicalSprsView, computeCanonicalReadiness } from '@/lib/canonicalReadiness';
import { useOrgDashboardData } from '@/lib/useOrgDashboardData';
import SprsScoreWidget from './SprsScoreWidget';
import ControlStatusDonut from './ControlStatusDonut';
import FamilyProgressBars from './FamilyProgressBars';
import NextActionsList from './NextActionsList';
import ProgressBar from '@/components/ProgressBar';
import EmptyState from '@/components/EmptyState';

// Self-service organization dashboard. Reads exclusively from the active
// project's ControlAssessment records (single source of truth).
export default function OrgDashboard({ organizationId, orgName }) {
  const { loading, company, project, assessments, evidence, objectiveLibrary, objectiveLinks, poams, assets } = useOrgDashboardData(organizationId);

  const canonical = useMemo(() => computeCanonicalReadiness({
    project, assessments, objectiveLibrary, objectiveLinks, evidence, poams,
  }), [project, assessments, objectiveLibrary, objectiveLinks, evidence, poams]);
  const sprs = useMemo(() => canonicalSprsView(canonical), [canonical]);
  const readiness = canonical.readiness_pct;

  // Project.target_cmmc_level is the sole target-level authority. CompanyProfile
  // cmmc_track is never allowed to override it.
  const targetLevel = project?.target_cmmc_level || null;
  const isLevel2 = targetLevel === 'Level 2';
  // Authoritative denominators: Level 1 = 15, Level 2 = 110. Never 125.
  const expectedTotal = targetLevel === 'Level 1' ? 15 : targetLevel === 'Level 2' ? 110 : null;

  // Canonical engine validates both the requirement set and objective library.
  // Any incomplete or malformed read fails closed and hides readiness/SPRS claims.
  const integrity = { ok: canonical.integrity_ok, issues: canonical.integrity_issues };
  const openPoams = poams.filter((p) => p.status !== 'Closed' && p.status !== 'Resolved' && p.status !== 'Complete').length;
  const closedPoams = poams.length - openPoams;
  const acceptedEvidence = canonical.valid_evidence;
  const totalAssets = (assets || []).length;
  const categorizedAssets = (assets || []).filter((a) => a.scope_category && a.scope_category !== 'Unknown').length;
  const assetPct = totalAssets ? Math.round((categorizedAssets / totalAssets) * 100) : 0;

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;
  }

  if (!project) {
    return (
      <EmptyState
        icon={Layers}
        title="No active project yet"
        description="Your organization doesn't have an implementation project yet. Create one to start tracking controls."
        action={<Link to="/projects/new" className="text-sm text-blue-600 font-medium hover:underline">Create a project →</Link>}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="page-kicker">Organization readiness</div>
          <h1 className="page-title mt-2">{company?.company_name || orgName || 'Dashboard'}</h1>
          <p className="page-subtitle mt-2">
            CMMC {targetLevel || 'target level not set'} readiness
            {project?.project_name ? ` · ${project.project_name}` : ''}
          </p>
        </div>
        <Link to={`/projects/${project.id}`} className="btn-primary flex-shrink-0">
          Open project workspace <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Top row: readiness + SPRS (L2 only) */}
      <div className={`grid gap-4 ${isLevel2 ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
        <div className="app-surface p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-5 h-5 text-green-600" />
            <h3 className="text-sm font-semibold text-slate-800">Overall Readiness</h3>
          </div>
          {integrity.ok ? (
            <>
              <div className="flex items-end gap-3 mb-2">
                <span className="text-4xl font-bold text-slate-900">{readiness}%</span>
                <span className="text-xs text-slate-500 mb-1.5">assessment-ready</span>
              </div>
              <ProgressBar value={readiness} label={null} color="green" size="md" />
              <p className="mt-2 text-xs text-slate-500">{canonical.met} of {expectedTotal} requirements are MET from objective-level findings and final evidence.</p>
              <p className="mt-1 text-xs text-slate-500">Implementation progress: {canonical.implemented} of {expectedTotal} ({canonical.implementation_pct}%).</p>
            </>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" /> Control data integrity issue
              </div>
              <ul className="mt-1.5 space-y-1 text-[11px] leading-4 text-amber-700">
                {integrity.issues.map((issue) => <li key={issue}>• {issue}</li>)}
              </ul>
              <p className="mt-2 text-[10px] text-amber-600">Readiness is hidden until the canonical control set is valid.</p>
            </div>
          )}
        </div>
        {isLevel2 && <SprsScoreWidget sprs={sprs} />}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4">
        <ControlStatusDonut assessments={assessments} />
        <FamilyProgressBars assessments={assessments} />
      </div>

      {/* Evidence + POA&M + Assets + Track */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to={`/projects/${project.id}/evidence`} className="app-surface app-surface-interactive p-5">
          <div className="flex items-center gap-2 mb-2"><Image className="w-5 h-5 text-blue-600" /><h3 className="text-sm font-semibold text-slate-800">Evidence Collected</h3></div>
          <div className="text-3xl font-bold text-slate-900">{evidence.length}</div>
          <p className="text-xs text-slate-500 mt-1">{acceptedEvidence} accepted · {evidence.length - acceptedEvidence} pending review</p>
        </Link>
        <Link to={`/projects/${project.id}/poam`} className="app-surface app-surface-interactive p-5">
          <div className="flex items-center gap-2 mb-2"><FileWarning className="w-5 h-5 text-amber-600" /><h3 className="text-sm font-semibold text-slate-800">POA&amp;M Items</h3></div>
          <div className="text-3xl font-bold text-slate-900">{openPoams}<span className="text-base text-slate-400 font-medium"> open</span></div>
          <p className="text-xs text-slate-500 mt-1">{closedPoams} closed · {poams.length} total</p>
        </Link>
        <Link to="/org-assets" className="app-surface app-surface-interactive p-5">
          <div className="flex items-center gap-2 mb-2"><HardDrive className="w-5 h-5 text-purple-600" /><h3 className="text-sm font-semibold text-slate-800">Assets Categorized</h3></div>
          <div className="text-3xl font-bold text-slate-900">{categorizedAssets}<span className="text-base text-slate-400 font-medium"> / {totalAssets}</span></div>
          <p className="text-xs text-slate-500 mt-1">{totalAssets === 0 ? 'No assets inventoried yet' : `${assetPct}% of assets scoped`}</p>
        </Link>
        <div className="app-surface p-5">
          <div className="flex items-center gap-2 mb-2"><Layers className="w-5 h-5 text-slate-600" /><h3 className="text-sm font-semibold text-slate-800">Track</h3></div>
          <div className="text-2xl font-bold text-slate-900">CMMC {targetLevel || '—'}</div>
          <p className="text-xs text-slate-500 mt-1">
            {targetLevel === 'Level 2'
              ? '110 NIST SP 800-171 requirements'
              : targetLevel === 'Level 1'
                ? '15 FAR 52.204-21 requirements'
                : 'Target level not set on the project'}
          </p>
        </div>
      </div>

      <NextActionsList assessments={assessments} projectId={project.id} />
    </div>
  );
}