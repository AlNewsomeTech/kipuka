import { Link } from 'react-router-dom';
import { Eye, Crosshair, FileStack, AlertTriangle, ListChecks, ClipboardCheck, BarChart3 } from 'lucide-react';
import { DashCard, StatTile, MiniList } from './dashboardPrimitives';
import { deriveMetrics } from '@/lib/useProjectDashboardData';

// Read-only summary for auditor viewers. No edit controls.
export default function AuditorViewerDashboard({ project, data }) {
  const m = deriveMetrics(project, data);
  const base = `/projects/${project.id}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-100 rounded-lg px-3 py-2 w-fit">
        <Eye className="w-3.5 h-3.5" /> Read-only auditor view
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile icon={ClipboardCheck} label="Controls Implemented" value={`${m.implemented}/${m.total}`} tone="green" />
        <StatTile icon={BarChart3} label="Overall Readiness" value={`${m.readiness}%`} tone="blue" />
        <StatTile icon={AlertTriangle} label="Open POA&M" value={m.poamOpenCount} tone="amber" />
        <StatTile icon={FileStack} label="SSP Status" value={m.sspStatus} />
      </div>

      <DashCard title="Scope Summary" icon={Crosshair} action={<Link to={`${base}/scoping`} className="text-xs text-blue-600 hover:underline">View</Link>}>
        {data.scoping ? (
          <div className="text-sm text-slate-700 space-y-1">
            <div>Handles FCI: <span className="font-semibold">{data.scoping.handles_fci ? 'Yes' : 'No'}</span></div>
            <div>Handles CUI: <span className="font-semibold">{data.scoping.handles_cui ? 'Yes' : 'No'}</span></div>
            <div>Environment: <span className="font-semibold">{data.scoping.environment_type}</span></div>
            <div>Status: <span className="font-semibold">{data.scoping.scope_status}</span></div>
          </div>
        ) : <p className="text-sm text-slate-400">No scoping profile recorded.</p>}
      </DashCard>

      <div className="grid lg:grid-cols-2 gap-4">
        <DashCard title="Control Assessment Status" icon={ClipboardCheck} action={<Link to={`${base}/assessment`} className="text-xs text-blue-600 hover:underline">View</Link>}>
          <MiniList items={['Implemented', 'Partially Implemented', 'Not Implemented', 'Not Started', 'Not Applicable'].map((s) => `${s}: ${data.assessments.filter((a) => a.status === s).length}`)} empty="No assessments." />
        </DashCard>
        <DashCard title="POA&M Summary" icon={AlertTriangle} action={<Link to={`${base}/poam`} className="text-xs text-blue-600 hover:underline">View</Link>}>
          <MiniList items={data.poams.slice(0, 12).map((p) => `${p.poam_title} — ${p.status}`)} empty="No POA&M items." />
        </DashCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <DashCard title="Evidence Index" icon={ListChecks} action={<Link to={`${base}/evidence`} className="text-xs text-blue-600 hover:underline">View</Link>}>
          <MiniList items={data.evidence.slice(0, 12).map((e) => `${e.evidence_title} [${e.evidence_type}] — ${e.review_status}`)} empty="No evidence recorded." />
        </DashCard>
        <DashCard title="Reports" icon={BarChart3} action={<Link to={`${base}/reports`} className="text-xs text-blue-600 hover:underline">View</Link>}>
          <MiniList items={data.exports.map((e) => `${e.report_title || e.report_type} — ${e.generated_date ? new Date(e.generated_date).toLocaleDateString() : ''}`)} empty="No reports generated." />
        </DashCard>
      </div>
    </div>
  );
}