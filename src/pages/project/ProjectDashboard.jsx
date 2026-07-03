import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  ShieldCheck, ClipboardCheck, ListChecks, AlertTriangle, FileStack,
  Package, BadgeCheck, TrendingUp, ArrowRight,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { FEATURES } from '@/lib/subscriptionTiers';
import StatusBadge from '@/components/StatusBadge';
import OnboardingChecklist from '@/components/project/OnboardingChecklist';

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
  const { project, refreshProject, readOnly, hasFeature, orgName } = useOutletContext();
  const [counts, setCounts] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [poams, ssps] = await Promise.all([
        base44.entities.POAMItem.filter({ client_id: project.id }).catch(() => []),
        base44.entities.SSPRecord.filter({ client_id: project.id }).catch(() => []),
      ]);
      if (!alive) return;
      setCounts({
        openPoam: poams.filter((p) => p.status !== 'Closed').length,
        highRisk: poams.filter((p) => p.severity === 'High' && p.status !== 'Closed').length,
        sspStatus: ssps[0]?.status || 'Not Started',
      });
    })();
    return () => { alive = false; };
  }, [project.id]);

  const toggleStep = async (key, value) => {
    const next = { ...(project.onboarding_checklist || {}), [key]: value };
    await base44.entities.Project.update(project.id, { onboarding_checklist: next });
    refreshProject();
  };

  const nextSteps = [
    { key: 'cui_fci_scoping', label: 'Complete CUI/FCI scoping' },
    { key: 'control_assessment', label: 'Run the control assessment' },
    { key: 'upload_evidence', label: 'Upload supporting evidence' },
    { key: 'build_ssp', label: 'Build the System Security Plan' },
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
          <StatusBadge status={project.project_status} size="md" />
        </div>
        <div className="grid sm:grid-cols-3 gap-3 mt-4 text-sm">
          <div><span className="text-slate-500">Target level:</span> <span className="font-semibold text-slate-800">{project.target_cmmc_level}</span></div>
          <div><span className="text-slate-500">Assessment path:</span> <span className="font-semibold text-slate-800">{project.assessment_path}</span></div>
          <div><span className="text-slate-500">Overall readiness:</span> <span className="font-semibold text-slate-800">{Math.round(project.current_readiness_score || 0)}%</span></div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric icon={TrendingUp} label="Overall Readiness" value={`${Math.round(project.current_readiness_score || 0)}%`} tone="blue" />
        <Metric icon={AlertTriangle} label="Open POA&M" value={counts?.openPoam ?? '—'} tone="amber" />
        <Metric icon={AlertTriangle} label="High-Risk Gaps" value={counts?.highRisk ?? '—'} tone="red" />
        <Metric icon={FileStack} label="SSP Status" value={counts?.sspStatus ?? '—'} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric icon={ClipboardCheck} label="Controls Complete" value="—" tone="green" />
        <Metric icon={ListChecks} label="Controls Needing Evidence" value="—" tone="amber" />
        <Metric icon={Package} label="Evidence Package" value="Not Started" />
        <Metric icon={BadgeCheck} label="SPRS / PIEE" value="Not Started" />
      </div>

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
                <div key={s.key} className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-2.5">
                  <ArrowRight className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  {s.label}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}