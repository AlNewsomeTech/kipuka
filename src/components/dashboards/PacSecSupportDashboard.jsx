import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Building2, AlertTriangle, CalendarClock, PauseCircle, Clock, StickyNote } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { DashCard, StatTile, MiniList } from './dashboardPrimitives';
import StatusBadge from '@/components/StatusBadge';

const STALLED_STATUSES = ['On Hold', 'Not Started'];

export default function PacSecSupportDashboard({ organizations, projects }) {
  const [exports, setExports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const orgIds = organizations.map((o) => o.id);
      const all = await base44.entities.ReportExport.list('-generated_date', 200).catch(() => []);
      if (!alive) return;
      setExports(all.filter((e) => orgIds.includes(e.organization_id)).slice(0, 12));
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [organizations]);

  const now = new Date();
  const soon = new Date(); soon.setDate(soon.getDate() + 60);

  const clientsNeedingReview = projects.filter((p) => ['Ready for Review', 'Documentation', 'Evidence Collection'].includes(p.project_status));
  const highRisk = projects.filter((p) => (p.current_readiness_score || 0) < 50 && p.project_status !== 'Complete');
  const stalled = projects.filter((p) => STALLED_STATUSES.includes(p.project_status));
  const renewals = organizations
    .filter((o) => o.subscription_end_date && new Date(o.subscription_end_date) <= soon && new Date(o.subscription_end_date) >= now)
    .map((o) => `${o.organization_name} — renews ${o.subscription_end_date}`);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile icon={Building2} label="Assigned Organizations" value={organizations.length} tone="blue" />
        <StatTile icon={AlertTriangle} label="Clients Needing Review" value={clientsNeedingReview.length} tone="amber" />
        <StatTile icon={AlertTriangle} label="High-Risk Projects" value={highRisk.length} tone="red" />
        <StatTile icon={PauseCircle} label="Stalled Projects" value={stalled.length} />
      </div>

      <DashCard title="Project Status by Client" icon={Building2}>
        {projects.length === 0 ? <p className="text-sm text-slate-400">No assigned projects.</p> : (
          <div className="divide-y divide-slate-100">
            {projects.map((p) => {
              const org = organizations.find((o) => o.id === p.organization_id);
              return (
                <Link key={p.id} to={`/projects/${p.id}`} className="flex items-center gap-3 py-2.5 hover:bg-slate-50 -mx-2 px-2 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-800 truncate">{p.project_name}</div>
                    <div className="text-xs text-slate-400 truncate">{org?.organization_name || '—'}</div>
                  </div>
                  <span className="text-xs text-slate-500">{Math.round(p.current_readiness_score || 0)}%</span>
                  <StatusBadge status={p.project_status} size="xs" />
                </Link>
              );
            })}
          </div>
        )}
      </DashCard>

      <div className="grid lg:grid-cols-2 gap-4">
        <DashCard title="Clients Needing Review" icon={AlertTriangle}>
          <MiniList items={clientsNeedingReview.map((p) => `${p.project_name} — ${p.project_status}`)} empty="No clients awaiting review." />
        </DashCard>
        <DashCard title="High-Risk Projects" icon={AlertTriangle}>
          <MiniList items={highRisk.map((p) => `${p.project_name} — ${Math.round(p.current_readiness_score || 0)}% readiness`)} empty="No high-risk projects." />
        </DashCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <DashCard title="Upcoming Renewal Dates" icon={CalendarClock}>
          <MiniList items={renewals} empty="No renewals in the next 60 days." />
        </DashCard>
        <DashCard title="Stalled Projects" icon={PauseCircle}>
          <MiniList items={stalled.map((p) => `${p.project_name} — ${p.project_status}`)} empty="No stalled projects." />
        </DashCard>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <DashCard title="Recent Exports" icon={Clock}>
          <MiniList items={exports.map((e) => `${e.report_title || e.report_type} — ${e.generated_date ? new Date(e.generated_date).toLocaleDateString() : ''}`)} empty="No recent exports." />
        </DashCard>
        <DashCard title="Support Notes" icon={StickyNote}>
          <MiniList items={organizations.filter((o) => o.notes).map((o) => `${o.organization_name}: ${o.notes}`)} empty="No support notes recorded on organizations." />
        </DashCard>
      </div>
    </div>
  );
}