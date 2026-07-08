import { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import {
  ShieldCheck, ClipboardCheck, ListChecks, AlertTriangle, FileStack,
  Package, BadgeCheck, TrendingUp, ArrowRight, FileDown, Loader2, Gavel, Rocket, Sparkles, PlayCircle,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { FEATURES } from '@/lib/subscriptionTiers';
import { generateProjectStatusReport } from '@/lib/projectStatusReport';
import { buildGuidedQueue, nextIncomplete, queueCounts, targetLevelsFor } from '@/lib/doNextEngine';
import { computeSprs } from '@/lib/sprsScoring';
import { stepLink } from '@/lib/guidanceLinks';
import StatusBadge from '@/components/StatusBadge';
import OnboardingChecklist from '@/components/project/OnboardingChecklist';
import AcolyteSummaryCard from '@/components/acolyte/AcolyteSummaryCard';

function Metric({ icon: Icon, label, value, tone = 'slate' }) {
  const tones = {
    slate: 'text-slate-500', green: 'text-green-600', amber: 'text-amber-600',
    red: 'text-red-600', blue: 'text-blue-600',
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <Icon className={`w-4 h-4 ${tones[tone]}`} /> {label}
      </div>
      <div className="text-2xl font-bold text-slate-800 mt-1.5">{value}</div>
    </div>
  );
}

export default function ProjectDashboard() {
  const { project, refreshProject, readOnly, hasFeature, orgName, org } = useOutletContext();
  const [counts, setCounts] = useState(null);
  const [reporting, setReporting] = useState(false);
  const [doNext, setDoNext] = useState(null); // { hasAssessments, allDone, nextControlId, done, total, sprsCurrent, sprsProjected }

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
      const [poams, ssps, assessments, evidence, mockSessions, library] = await Promise.all([
        base44.entities.ProjectPOAM.filter({ project_id: project.id }).catch(() => []),
        base44.entities.SystemSecurityPlan.filter({ project_id: project.id }).catch(() => []),
        base44.entities.ControlAssessment.filter({ project_id: project.id }).catch(() => []),
        base44.entities.ProjectEvidence.filter({ project_id: project.id }).catch(() => []),
        base44.entities.MockAssessmentSession.filter({ project_id: project.id }, '-created_date', 1).catch(() => []),
        base44.entities.ControlLibrary.filter({ active: true }).catch(() => []),
      ]);
      if (!alive) return;
      const closed = ['Closed', 'Accepted Risk'];
      // Statuses that count a control as complete — matches what the control pages write.
      const doneStatuses = ['Ready for Assessment', 'Ready for Documentation', 'Implemented', 'Evidence Accepted'];
      const evByControl = {};
      evidence.forEach((e) => (e.control_ids || []).forEach((c) => (evByControl[c] = true)));
      setCounts({
        openPoam: poams.filter((p) => !closed.includes(p.status)).length,
        highRisk: poams.filter((p) => ['High', 'Critical'].includes(p.risk_rating) && !closed.includes(p.status)).length,
        sspStatus: ssps[0]?.approval_status || 'Not Started',
        controlsComplete: assessments.length ? `${assessments.filter((a) => doneStatuses.includes(a.status)).length}/${assessments.length}` : '—',
        controlsNeedEvidence: assessments.filter((a) => !evByControl[a.control_id]).length,
        mockVerdict: mockSessions[0]?.overall_verdict || null,
      });

      // Do-Next hero data.
      const inScopeLib = library.filter((c) => levels.includes(c.cmmc_level));
      const next = nextIncomplete(inScopeLib, assessments, project);
      const { done, total } = queueCounts(inScopeLib, assessments, project);
      const sprs = computeSprs(assessments);
      setDoNext({
        hasAssessments: assessments.length > 0,
        allDone: total > 0 && done >= total,
        nextControlId: next?.control_id || null,
        done, total,
        sprsCurrent: sprs.current,
        sprsProjected: sprs.projected,
      });
    })();
    return () => { alive = false; };
  }, [project.id]);

  const toggleStep = async (key, value) => {
    const next = { ...(project.onboarding_checklist || {}), [key]: value };
    await base44.entities.Project.update(project.id, { onboarding_checklist: next });
    refreshProject();
  };

  // Corrected order: scope → implementation → evidence → validation → final inventory → docs.
  const nextSteps = [
    { key: 'confirm_fci_cui', label: 'Confirm FCI/CUI handling (preliminary scope)' },
    { key: 'config_identity', label: 'Configure identity/access controls' },
    { key: 'upload_evidence', label: 'Upload and review evidence' },
    { key: 'mark_ready_for_docs', label: 'Validate controls — mark Ready for Documentation' },
    { key: 'intune_inventory', label: 'Complete final inventory & scope validation' },
    { key: 'gen_final_ssp', label: 'Generate final documentation' },
  ].filter((s) => !(project.onboarding_checklist || {})[s.key]).slice(0, 3);

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-[#0F1E3C] flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">{project.project_name}</h1>
              <p className="text-xs text-slate-400">{orgName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleReport}
              disabled={reporting}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#1E2D4A] disabled:opacity-60"
            >
              {reporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
              CMMC Status Report
            </button>
            <StatusBadge status={project.project_status} size="md" />
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-3 mt-4 text-sm">
          <div><span className="text-slate-500">Target level:</span> <span className="font-semibold text-slate-800">{project.target_cmmc_level}</span></div>
          <div><span className="text-slate-500">Assessment path:</span> <span className="font-semibold text-slate-800">{project.assessment_path}</span></div>
          <div><span className="text-slate-500">Overall readiness:</span> <span className="font-semibold text-slate-800">{Math.round(project.current_readiness_score || 0)}%</span></div>
        </div>
      </div>

      {/* Do-Next hero */}
      <DoNextHero project={project} doNext={doNext} />

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric icon={TrendingUp} label="Overall Readiness" value={`${Math.round(project.current_readiness_score || 0)}%`} tone="blue" />
        <Metric icon={AlertTriangle} label="Open POA&M" value={counts?.openPoam ?? '—'} tone="amber" />
        <Metric icon={AlertTriangle} label="High-Risk Gaps" value={counts?.highRisk ?? '—'} tone="red" />
        <Metric icon={FileStack} label="SSP Status" value={counts?.sspStatus ?? '—'} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric icon={ClipboardCheck} label="Controls Complete" value={counts?.controlsComplete ?? '—'} tone="green" />
        <Metric icon={ListChecks} label="Controls Needing Evidence" value={counts?.controlsNeedEvidence ?? '—'} tone="amber" />
        <Link to={`/projects/${project.id}/mock`} className="block">
          <Metric icon={Gavel} label="Mock Assessment"
            value={counts?.mockVerdict || 'Not Run'}
            tone={counts?.mockVerdict === 'Likely Pass' ? 'green' : counts?.mockVerdict === 'Not Ready' ? 'red' : counts?.mockVerdict === 'Conditional' ? 'amber' : 'slate'} />
        </Link>
        <Metric icon={BadgeCheck} label="SPRS / PIEE" value="Not Started" />
      </div>

      <AcolyteSummaryCard projectId={project.id} />

      <div className="grid lg:grid-cols-2 gap-4">
        <OnboardingChecklist
          checklist={project.onboarding_checklist || {}}
          hasHandoff={hasFeature(FEATURES.C3PAO_HANDOFF)}
          readOnly={readOnly}
          onToggle={toggleStep}
        />

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-3">Next Recommended Steps</h3>
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

// Do-Next hero — the primary "what should I do now?" call to action.
function DoNextHero({ project, doNext }) {
  if (!doNext) {
    return (
      <div className="bg-[#0F1E3C] rounded-xl p-5 h-[92px] flex items-center">
        <Loader2 className="w-5 h-5 animate-spin text-white/60" />
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
    <Link to={to} className="block bg-[#0F1E3C] rounded-xl p-5 hover:bg-[#152a52] transition-colors group">
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
            <div className="text-sm font-semibold text-white">{doNext.done} of {doNext.total} controls done</div>
            <div className="text-xs text-white/60">SPRS {doNext.sprsCurrent} → {doNext.sprsProjected}</div>
          </div>
        )}
      </div>
    </Link>
  );
}