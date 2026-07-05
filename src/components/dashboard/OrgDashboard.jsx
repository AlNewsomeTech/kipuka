import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Image, FileWarning, Layers, ArrowRight } from 'lucide-react';
import { computeSprs } from '@/lib/sprsScoring';
import { readinessPct } from '@/lib/controlStatus';
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
  const { loading, company, project, assessments, evidence, poams } = useOrgDashboardData(organizationId);

  const sprs = useMemo(() => computeSprs(assessments), [assessments]);
  const readiness = useMemo(() => readinessPct(assessments), [assessments]);

  const isLevel2 = (company?.cmmc_track === 'Level 2') || project?.target_cmmc_level === 'Level 2';
  const openPoams = poams.filter((p) => p.status !== 'Closed' && p.status !== 'Resolved' && p.status !== 'Complete').length;
  const closedPoams = poams.length - openPoams;
  const acceptedEvidence = evidence.filter((e) => e.review_status === 'Accepted').length;

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
          <h1 className="text-2xl font-bold text-slate-900">{company?.company_name || orgName || 'Dashboard'}</h1>
          <p className="text-sm text-slate-500 mt-1">
            CMMC {isLevel2 ? 'Level 2' : 'Level 1'} readiness dashboard
            {project?.project_name ? ` · ${project.project_name}` : ''}
          </p>
        </div>
        <Link to={`/projects/${project.id}`} className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-[#0F1E3C] text-white hover:bg-[#1E2D4A] flex-shrink-0">
          Open project workspace <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Top row: readiness + SPRS (L2 only) */}
      <div className={`grid gap-4 ${isLevel2 ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-5 h-5 text-green-600" />
            <h3 className="text-sm font-semibold text-slate-800">Overall Readiness</h3>
          </div>
          <div className="flex items-end gap-3 mb-2">
            <span className="text-4xl font-bold text-slate-900">{readiness}%</span>
            <span className="text-xs text-slate-500 mb-1.5">controls met</span>
          </div>
          <ProgressBar value={readiness} color="green" size="md" />
          <p className="mt-2 text-xs text-slate-500">{sprs.met} of {assessments.length} tracked controls are verified or implemented.</p>
        </div>
        {isLevel2 && <SprsScoreWidget sprs={sprs} />}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-4">
        <ControlStatusDonut assessments={assessments} />
        <FamilyProgressBars assessments={assessments} />
      </div>

      {/* Evidence + POA&M + Next actions */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Link to={`/projects/${project.id}/evidence`} className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300">
          <div className="flex items-center gap-2 mb-2"><Image className="w-5 h-5 text-blue-600" /><h3 className="text-sm font-semibold text-slate-800">Evidence Collected</h3></div>
          <div className="text-3xl font-bold text-slate-900">{evidence.length}</div>
          <p className="text-xs text-slate-500 mt-1">{acceptedEvidence} accepted · {evidence.length - acceptedEvidence} pending review</p>
        </Link>
        <Link to={`/projects/${project.id}/poam`} className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300">
          <div className="flex items-center gap-2 mb-2"><FileWarning className="w-5 h-5 text-amber-600" /><h3 className="text-sm font-semibold text-slate-800">POA&amp;M Items</h3></div>
          <div className="text-3xl font-bold text-slate-900">{openPoams}<span className="text-base text-slate-400 font-medium"> open</span></div>
          <p className="text-xs text-slate-500 mt-1">{closedPoams} closed · {poams.length} total</p>
        </Link>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-2"><Layers className="w-5 h-5 text-slate-600" /><h3 className="text-sm font-semibold text-slate-800">Track</h3></div>
          <div className="text-2xl font-bold text-slate-900">CMMC {isLevel2 ? 'Level 2' : 'Level 1'}</div>
          <p className="text-xs text-slate-500 mt-1">{isLevel2 ? '110 NIST SP 800-171 practices' : '17 FAR 52.204-21 practices'}</p>
        </div>
      </div>

      <NextActionsList assessments={assessments} projectId={project.id} />
    </div>
  );
}