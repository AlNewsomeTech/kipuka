import { TrendingUp, ClipboardCheck, ListChecks, AlertTriangle, FileStack, BadgeCheck, CalendarClock, Lightbulb } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import { DashCard, StatTile, MiniList } from './dashboardPrimitives';
import { deriveMetrics } from '@/lib/useProjectDashboardData';

export default function ExecutiveDashboard({ project, data }) {
  const m = deriveMetrics(project, data);
  const sprsStatus = data.sprs?.cmmc_status || 'Not Started';

  const decisions = [];
  if (m.highRisk.length) decisions.push(`Prioritize funding to remediate ${m.highRisk.length} high-risk open gap(s).`);
  if (m.readiness < 80) decisions.push('Approve additional resourcing to accelerate control implementation.');
  if (m.needEvidence.length) decisions.push(`Direct owners to collect evidence for ${m.needEvidence.length} control(s).`);
  if (m.sspStatus !== 'Approved') decisions.push('Review and approve the System Security Plan.');
  if (data.sprs?.expiration_date) decisions.push('Confirm SPRS affirmation renewal ownership before expiration.');
  if (!decisions.length) decisions.push('Project is on track — authorize final assessment preparation.');

  const blockers = data.assessments
    .filter((a) => a.status === 'Not Implemented' && ['High', 'Critical'].includes(a.risk_rating))
    .map((a) => `${a.control_id} — ${a.control_title} (${a.risk_rating})`);

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-3 text-sm bg-white rounded-xl border border-slate-200 p-5">
        <div><span className="text-slate-500">Target CMMC level:</span> <span className="font-semibold text-slate-800">{project.target_cmmc_level}</span></div>
        <div><span className="text-slate-500">Assessment path:</span> <span className="font-semibold text-slate-800">{project.assessment_path}</span></div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile icon={TrendingUp} label="Overall Readiness" value={`${m.readiness}%`} tone="blue" />
        <StatTile icon={ClipboardCheck} label="Controls Complete" value={`${m.implemented}/${m.total}`} tone="green" />
        <StatTile icon={ListChecks} label="Controls Needing Evidence" value={m.needEvidence.length} tone="amber" />
        <StatTile icon={AlertTriangle} label="High-Risk Gaps" value={m.highRisk.length} tone="red" />
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <StatTile icon={FileStack} label="SSP Status" value={m.sspStatus} />
        <StatTile icon={AlertTriangle} label="Open POA&M" value={m.poamOpenCount} tone="amber" />
        <StatTile icon={BadgeCheck} label="SPRS Status" value={sprsStatus} tone="purple" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <DashCard title="Upcoming Dates" icon={CalendarClock}>
          <MiniList items={m.upcoming.map((u) => `${u.date} — ${u.label}`)} empty="No upcoming dates recorded." />
        </DashCard>
        <DashCard title="Major Blockers" icon={AlertTriangle}>
          <MiniList items={blockers} empty="No high/critical blockers." />
        </DashCard>
      </div>

      <DashCard title="Recommended Executive Decisions" icon={Lightbulb}>
        <div className="space-y-2">
          {decisions.map((d, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-2.5">
              <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" /> {d}
            </div>
          ))}
        </div>
      </DashCard>

      <div className="flex items-center gap-2 text-xs text-slate-500">
        Project status: <StatusBadge status={project.project_status} size="xs" />
      </div>
    </div>
  );
}