import { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import {
  ShieldCheck, ClipboardCheck, ListChecks, AlertTriangle, FileStack,
  BadgeCheck, TrendingUp, ArrowRight, FileDown, Loader2, Gavel, Rocket, Sparkles, PlayCircle,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { FEATURES } from '@/lib/subscriptionTiers';
import { generateProjectStatusReport } from '@/lib/projectStatusReport';
import { nextIncomplete, targetLevelsFor } from '@/lib/doNextEngine';
import { canonicalSprsView, computeCanonicalReadiness } from '@/lib/canonicalReadiness';
import { stepLink } from '@/lib/guidanceLinks';
import { deriveAutoChecklist, mergeChecklist } from '@/lib/checklistAuto';
import StatusBadge from '@/components/StatusBadge';
import OnboardingChecklist from '@/components/project/OnboardingChecklist';
import AcolyteSummaryCard from '@/components/acolyte/AcolyteSummaryCard';
import CuiHostingBanner from '@/components/cui/CuiHostingBanner';
import { cuiHostingRequired } from '@/lib/cuiHosting';

function Metric({ icon: Icon, label, value, tone = 'slate' }) {
  const tones = {
    slate: 'text-slate-500', green: 'text-green-600', amber: 'text-amber-600',
    red: 'text-red-600', blue: 'text-blue-600',
  };
  return (
    <div className="app-surface app-surface-interactive min-h-[104px] p-4">
      <div className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.09em] text-slate-400">
        <Icon className={`h-4 w-4 ${tones[tone]}`} /> {label}
      </div>
      <div className="metric-value mt-3 truncate text-2xl font-extrabold text-slate-900">{value}</div>
    </div>
  );
}

export default function ProjectDashboard() {
  const { project, refreshProject, readOnly, hasFeature, orgName, org } = useOutletContext();
  const { user } = useAuth();
  const [counts, setCounts] = useState(null);
  const [reporting, setReporting] = useState(false);
  const [doNext, setDoNext] = useState(null); // { hasAssessments, allDone, nextControlId, done, total, sprsCurrent, sprsProjected }
  const [cuiBanner, setCuiBanner] = useState(null); // { scoping } when a CUI hosting decision is needed
  const [reloadKey, setReloadKey] = useState(0);

  const handleReport = async () => {
    setReporting(true);
    try {
      const genBy = (await base44.auth.me().catch(() => null))?.full_name;
      await generateProjectStatusReport({ project, org, generatedBy: genBy });
    } finally {
      setReporting(false);
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      const levels = targetLevelsFor(project);
      const [poams, ssps, assessments, evidence, mockSessions, library, objectiveLibrary, objectiveLinks, sprsRecs, scopingList, reportExports, assets, profiles] = await Promise.all([
        base44.entities.ProjectPOAM.filter({ project_id: project.id }).catch(() => []),
        base44.entities.SystemSecurityPlan.filter({ project_id: project.id }).catch(() => []),
        base44.entities.ControlAssessment.filter({ project_id: project.id }).catch(() => []),
        base44.entities.ProjectEvidence.filter({ project_id: project.id }).catch(() => []),
        base44.entities.MockAssessmentSession.filter({ project_id: project.id }, '-created_date', 1).catch(() => []),
        base44.entities.ControlLibrary.filter({ active: true }).catch(() => []),
        base44.entities.AssessmentObjectiveLibrary.filter({ active: true, cmmc_level: project.target_cmmc_level }, 'sort_order', 500).catch(() => []),
        base44.entities.ObjectiveEvidenceLink.filter({ project_id: project.id }, 'objective_id', 500).catch(() => []),
        base44.entities.SPRSRecord.filter({ project_id: project.id }).catch(() => []),
        base44.entities.ScopingProfile.filter({ project_id: project.id }).catch(() => []),
        base44.entities.ReportExport.filter({ project_id: project.id }).catch(() => []),
        base44.entities.Asset.filter({ project_id: project.id }).catch(() => []),
        project.organization_id
          ? base44.entities.CompanyProfile.filter({ organization_id: project.organization_id }).catch(() => [])
          : Promise.resolve([]),
      ]);
      if (!alive) return;

      // CUI hosting decision gate — show the banner when this project handles CUI in an
      // environment that cannot lawfully hold it and no compliant hosting has been chosen.
      const scoping = scopingList[0] || null;
      const itEnvironment = profiles[0]?.it_environment;
      const handlesCui = !!scoping?.handles_cui
        || project.target_cmmc_level === 'Level 2'
        || project.assessment_path?.includes('Level 2');
      const needsCuiHosting = cuiHostingRequired({
        handlesCui,
        itEnvironment,
        currentHosting: scoping?.cui_hosting,
      });
      setCuiBanner(needsCuiHosting ? { scoping } : null);
      const closed = ['Closed', 'Accepted Risk'];
      const canonical = computeCanonicalReadiness({
        project, assessments, objectiveLibrary, objectiveLinks, evidence, poams,
      });
      // Readiness is objective-based and fail-closed. Implementation progress is
      // reported separately and is never written back as an assessment result.
      const readiness = canonical.integrity_ok ? canonical.readiness_pct : null;
      const sprs = sprsRecs[0] || null;
      const sprsStatus = !sprs ? 'Not Started'
        : sprs.affirmed_date ? 'Affirmed'
        : sprs.submitted_date ? 'Submitted'
        : 'In Progress';
      setCounts({
        openPoam: poams.filter((p) => !closed.includes(p.status)).length,
        highRisk: poams.filter((p) => ['High', 'Critical'].includes(p.risk_rating) && !closed.includes(p.status)).length,
        sspStatus: ssps[0]?.approval_status || 'Not Started',
        controlsImplemented: canonical.integrity_ok ? `${canonical.implemented}/${canonical.expected_requirements}` : '—',
        controlsNeedEvidence: canonical.integrity_ok ? canonical.controls_needing_final_evidence : '—',
        mockVerdict: mockSessions[0]?.overall_verdict || null,
        readiness,
        readinessIntegrityIssues: canonical.integrity_issues,
        sprsStatus,
        autoChecklist: deriveAutoChecklist({
          project, scoping: scopingList[0] || null, assessments, evidence, poams,
          ssps, sprs, exports: reportExports, assets,
        }),
      });

      // Do-Next hero data.
      const inScopeLib = library.filter((c) => levels.includes(c.cmmc_level));
      const next = nextIncomplete(inScopeLib, assessments, project);
      const done = canonical.integrity_ok ? canonical.implemented : 0;
      const total = canonical.integrity_ok ? canonical.expected_requirements : inScopeLib.length;
      const sprsScore = canonicalSprsView(canonical);
      setDoNext({
        hasAssessments: assessments.length > 0,
        allDone: total > 0 && done >= total,
        nextControlId: next?.control_id || null,
        done, total,
        sprsCurrent: sprsScore.current,
        sprsProjected: sprsScore.projected,
      });
    })();
    return () => { alive = false; };
  }, [project.id, reloadKey]);

  const toggleStep = async (key, value) => {
    const next = { ...(project.onboarding_checklist || {}), [key]: value };
    await base44.entities.Project.update(project.id, { onboarding_checklist: next });
    refreshProject();
  };

  // Merge manual checkmarks with activity-derived auto-completion.
  const effectiveChecklist = mergeChecklist(project.onboarding_checklist || {}, counts?.autoChecklist || {});

  // Corrected order: scope → implementation → evidence → validation → final inventory → docs.
  const nextSteps = [
    { key: 'confirm_fci_cui', label: 'Confirm FCI/CUI handling (preliminary scope)' },
    { key: 'config_identity', label: 'Configure identity/access controls' },
    { key: 'upload_evidence', label: 'Upload and review evidence' },
    { key: 'mark_ready_for_docs', label: 'Validate controls — mark Ready for Documentation' },
    { key: 'intune_inventory', label: 'Complete final inventory & scope validation' },
    { key: 'gen_final_ssp', label: 'Generate final documentation' },
  ].filter((s) => !effectiveChecklist[s.key]).slice(0, 3);

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="app-surface overflow-hidden p-5 sm:p-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#0b1930] to-[#1d4a73] shadow-lg shadow-slate-950/10">
              <ShieldCheck className="h-6 w-6 text-[#9bd9f7]" />
            </div>
            <div>
              <div className="page-kicker">CMMC project</div>
              <h1 className="mt-1 text-xl font-extrabold text-slate-900">{project.project_name}</h1>
              <p className="mt-0.5 text-xs font-medium text-slate-400">{orgName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleReport}
              disabled={reporting}
              className="btn-primary disabled:opacity-60"
            >
              {reporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              CMMC Status Report
            </button>
            <StatusBadge status={project.project_status} size="md" />
          </div>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          <ProjectMeta label="Target level" value={project.target_cmmc_level} />
          <ProjectMeta label="Assessment path" value={project.assessment_path} />
          <ProjectMeta label="Assessment readiness" value={counts?.readiness == null ? '—' : `${counts.readiness}%`} accent />
        </div>
      </div>

      {/* CUI hosting decision gate */}
      {cuiBanner && (
        <CuiHostingBanner
          project={project}
          scoping={cuiBanner.scoping}
          readOnly={readOnly}
          currentUser={user}
          onResolved={() => setReloadKey((k) => k + 1)}
        />
      )}

      {/* Do-Next hero */}
      <DoNextHero project={project} doNext={doNext} />

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric icon={TrendingUp} label="Assessment Readiness" value={counts?.readiness == null ? '—' : `${counts.readiness}%`} tone="blue" />
        <Metric icon={AlertTriangle} label="Open POA&M" value={counts?.openPoam ?? '—'} tone="amber" />
        <Metric icon={AlertTriangle} label="High-Risk Gaps" value={counts?.highRisk ?? '—'} tone="red" />
        <Metric icon={FileStack} label="SSP Status" value={counts?.sspStatus ?? '—'} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric icon={ClipboardCheck} label="Controls Implemented" value={counts?.controlsImplemented ?? '—'} tone="green" />
        <Metric icon={ListChecks} label="Controls Needing Evidence" value={counts?.controlsNeedEvidence ?? '—'} tone="amber" />
        <Link to={`/projects/${project.id}/mock`} className="block">
          <Metric icon={Gavel} label="Mock Assessment"
            value={counts?.mockVerdict || 'Not Run'}
            tone={counts?.mockVerdict === 'Likely Pass' ? 'green' : counts?.mockVerdict === 'Not Ready' ? 'red' : counts?.mockVerdict === 'Conditional' ? 'amber' : 'slate'} />
        </Link>
        <Link to={`/projects/${project.id}/sprs`} className="block">
          <Metric icon={BadgeCheck} label="SPRS / PIEE" value={counts?.sprsStatus ?? '—'} tone={counts?.sprsStatus === 'Affirmed' ? 'green' : counts?.sprsStatus === 'Submitted' ? 'blue' : 'slate'} />
        </Link>
      </div>

      <AcolyteSummaryCard projectId={project.id} />

      <div className="grid lg:grid-cols-2 gap-4">
        <OnboardingChecklist
          checklist={effectiveChecklist}
          hasHandoff={hasFeature(FEATURES.C3PAO_HANDOFF)}
          readOnly={readOnly}
          onToggle={toggleStep}
          projectId={project.id}
        />

        <div className="app-surface p-5">
          <div className="page-kicker">Recommended</div>
          <h3 className="mb-3 mt-2 text-sm font-extrabold text-slate-800">Next steps</h3>
          {nextSteps.length === 0 ? (
            <p className="text-sm text-slate-500">All onboarding steps are complete. Review your evidence and reports before submission.</p>
          ) : (
            <div className="space-y-2">
              {nextSteps.map((s) => (
                <Link
                  key={s.key}
                  to={stepLink(project.id, s.key)}
                  className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-2.5 hover:bg-blue-50 hover:text-blue-700 transition-colors group"
                >
                  <ArrowRight className="w-4 h-4 text-blue-500 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  {s.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProjectMeta({ label, value, accent = false }) {
  return (
    <div className={`rounded-xl border px-3.5 py-3 ${accent ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-slate-50'}`}>
      <div className="text-[9px] font-extrabold uppercase tracking-[0.1em] text-slate-400">{label}</div>
      <div className={`mt-1 truncate text-xs font-extrabold ${accent ? 'text-blue-800' : 'text-slate-700'}`}>{value || 'Not set'}</div>
    </div>
  );
}

// Do-Next hero — the primary "what should I do now?" call to action.
function DoNextHero({ project, doNext }) {
  if (!doNext) {
    return (
      <div className="soft-grid flex h-[104px] items-center rounded-2xl bg-gradient-to-r from-[#0b1930] to-[#173f66] p-5 shadow-lg shadow-slate-950/10">
        <Loader2 className="h-5 w-5 animate-spin text-white/60" />
      </div>
    );
  }

  let to, label, Icon, sublabel;
  if (!doNext.hasAssessments) {
    to = `/projects/${project.id}/assessment`;
    label = 'Generate your controls';
    Icon = Sparkles;
    sublabel = 'Build your control list to begin guided implementation';
  } else if (doNext.allDone) {
    to = `/projects/${project.id}/mock`;
    label = 'Run a mock assessment';
    Icon = PlayCircle;
    sublabel = 'All controls done — check your readiness with a mock assessment';
  } else {
    to = `/projects/${project.id}/guided/${doNext.nextControlId}`;
    label = 'Continue implementation';
    Icon = Rocket;
    sublabel = 'Pick up the next highest-impact control';
  }

  return (
    <Link to={to} className="soft-grid group block rounded-2xl border border-white/10 bg-gradient-to-r from-[#0b1930] to-[#17456f] p-5 shadow-lg shadow-slate-950/10 transition-all hover:-translate-y-0.5 hover:shadow-xl sm:p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-white font-bold text-lg">
              {label} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="text-xs text-white/60 mt-0.5">{sublabel}</p>
          </div>
        </div>
        {doNext.total > 0 && (
          <div className="text-right text-white/80">
            <div className="text-sm font-semibold text-white">{doNext.done} of {doNext.total} implementations complete</div>
            <div className="text-xs text-white/60">SPRS {doNext.sprsCurrent} → {doNext.sprsProjected}</div>
          </div>
        )}
      </div>
    </Link>
  );
}