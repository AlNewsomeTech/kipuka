import { Link } from 'react-router-dom';
import { BarChart3, ListChecks, AlertTriangle, FileStack, ScrollText, BadgeCheck, Wrench, Clock } from 'lucide-react';
import { DashCard, MiniList, BarRow } from './dashboardPrimitives';
import { deriveMetrics, byDomain } from '@/lib/useProjectDashboardData';

export default function ComplianceManagerDashboard({ project, data }) {
  const m = deriveMetrics(project, data);
  const domains = byDomain(data.assessments);
  const base = `/projects/${project.id}`;

  const reviewQueue = data.evidence.filter((e) => ['Draft', 'Needs Review'].includes(e.review_status)).map((e) => e.evidence_title);
  const openPoam = m.openPoam.map((p) => `${p.poam_title} — ${p.status}`);
  const missingSsp = data.assessments.filter((a) => {
    // controls without an implementation statement in the SSP context (approximate: not implemented + no summary)
    return !a.implementation_summary;
  }).map((a) => `${a.control_id} — ${a.control_title}`);
  const policiesToReview = data.policies.filter((p) => ['Draft', 'In Review'].includes(p.approval_status) ||
    (p.review_date && new Date(p.review_date) < new Date())).map((p) => p.policy_name);
  const maintenance = data.maintenance.filter((t) => t.status !== 'Complete').map((t) => `${t.task_title}${t.due_date ? ` (due ${t.due_date})` : ''}`);

  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-2 gap-4">
        <DashCard title="Control Completion by Domain" icon={BarChart3}>
          {domains.length === 0 ? <p className="text-sm text-slate-400">No controls assessed yet.</p> : (
            <div className="space-y-3">{domains.map((d) => <BarRow key={d.domain} label={d.domain} done={d.done} total={d.total} />)}</div>
          )}
        </DashCard>
        <DashCard title="Evidence Review Queue" icon={ListChecks} action={<Link to={`${base}/evidence`} className="text-xs text-blue-600 hover:underline">Open</Link>}>
          <MiniList items={reviewQueue} empty="No evidence pending review." />
        </DashCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <DashCard title="Open POA&M Items" icon={AlertTriangle} action={<Link to={`${base}/poam`} className="text-xs text-blue-600 hover:underline">Open</Link>}>
          <MiniList items={openPoam} empty="No open POA&M items." />
        </DashCard>
        <DashCard title="Missing SSP Statements" icon={FileStack} action={<Link to={`${base}/ssp`} className="text-xs text-blue-600 hover:underline">Open</Link>}>
          <MiniList items={missingSsp.slice(0, 12)} empty="All controls have implementation statements." />
        </DashCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <DashCard title="Policies Needing Review" icon={ScrollText} action={<Link to={`${base}/policies`} className="text-xs text-blue-600 hover:underline">Open</Link>}>
          <MiniList items={policiesToReview} empty="No policies awaiting review." />
        </DashCard>
        <DashCard title="Maintenance Tasks" icon={Wrench} action={<Link to={`${base}/maintenance`} className="text-xs text-blue-600 hover:underline">Open</Link>}>
          <MiniList items={maintenance.slice(0, 12)} empty="No open maintenance tasks." />
        </DashCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <DashCard title="SPRS / PIEE Status" icon={BadgeCheck} action={<Link to={`${base}/sprs`} className="text-xs text-blue-600 hover:underline">Open</Link>}>
          <div className="text-sm text-slate-700 space-y-1">
            <div>PIEE account: <span className="font-semibold">{data.sprs?.piee_account_status || 'Not Started'}</span></div>
            <div>SPRS access: <span className="font-semibold">{data.sprs?.sprs_access_status || 'Not Started'}</span></div>
            <div>CMMC status: <span className="font-semibold">{data.sprs?.cmmc_status || 'Unknown'}</span></div>
          </div>
        </DashCard>
        <DashCard title="Recent Activity" icon={Clock}>
          <MiniList items={data.exports.map((e) => `${e.report_title || e.report_type} — ${e.generated_date ? new Date(e.generated_date).toLocaleDateString() : ''}`)} empty="No recent exports." />
        </DashCard>
      </div>
    </div>
  );
}