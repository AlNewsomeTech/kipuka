import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Building2, ShieldCheck, Image, FileText, AlertTriangle, ListChecks,
  Clock, CheckCircle2, AlertCircle, Package, Layers, FileBarChart, BadgeCheck
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useClient } from '@/lib/clientContext';
import { useAuth } from '@/lib/AuthContext';
import AdminClientSummary from '@/components/dashboard/AdminClientSummary';
import StatCard from '@/components/StatCard';
import ProgressBar from '@/components/ProgressBar';
import StatusBadge from '@/components/StatusBadge';
import WarningBanner from '@/components/WarningBanner';
import EmptyState from '@/components/EmptyState';
import ProgressSummary from '@/components/dashboard/ProgressSummary';
import ClientProgressOverview from '@/components/dashboard/ClientProgressOverview';
import WeeklyReportModal from '@/components/dashboard/WeeklyReportModal';

export default function Dashboard() {
  const { selectedClient, selectedClientId } = useClient();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ controls: [], l2Controls: [], tasks: [], screenshots: [], documents: [], evidence: [] });
  const [loading, setLoading] = useState(true);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    if (!selectedClientId) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      base44.entities.CMMCControl.filter({ level: 'Level 1' }).catch(() => []),
      base44.entities.CMMCControl.filter({ level: 'Level 2' }).catch(() => []),
      base44.entities.DeploymentTask.filter({ client_id: selectedClientId }).catch(() => []),
      base44.entities.Screenshot.filter({ client_id: selectedClientId }).catch(() => []),
      base44.entities.GeneratedDocument.filter({ client_id: selectedClientId }).catch(() => []),
      base44.entities.EvidenceItem.filter({ client_id: selectedClientId }).catch(() => []),
    ]).then(([l1Controls, l2Controls, tasks, screenshots, documents, evidence]) => {
      setStats({ controls: l1Controls, l2Controls, tasks, screenshots, documents, evidence });
      setLoading(false);
    });
  }, [selectedClientId]);

  if (!selectedClient) {
    if (user?.role === 'admin' || user?.role === 'technician') {
      return <AdminClientSummary />;
    }
    return <EmptyState icon={Building2} title="No client selected" description="Create a client in the Clients section to get started." action={<Link to="/clients" className="text-sm text-blue-600 font-medium hover:underline">Go to Clients →</Link>} />;
  }

  const l1Controls = stats.controls;
  const l1Complete = l1Controls.filter(c => c.status === 'Complete' || c.ready_for_assessment).length;
  const l1Pct = l1Controls.length ? (l1Complete / l1Controls.length) * 100 : 0;
  const l2Controls = stats.l2Controls;
  const l2Complete = l2Controls.filter(c => c.status === 'Complete' || c.ready_for_assessment).length;
  const l2Pct = l2Controls.length ? (l2Complete / l2Controls.length) * 100 : 0;

  const openTasks = stats.tasks.filter(t => t.status !== 'Complete' && t.status !== 'Reviewed');
  const blockers = stats.tasks.filter(t => t.status === 'Blocker' || t.priority === 'Critical');
  const missingScreenshots = stats.tasks.filter(t => t.required_screenshots && t.status !== 'Complete').length;
  const missingExports = stats.tasks.filter(t => t.required_exports && t.status !== 'Complete').length;
  const evidenceItems = stats.evidence.length + stats.screenshots.length;
  const recentScreenshots = [...stats.screenshots].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 5);
  const recentDocs = [...stats.documents].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 5);
  const currentPhase = stats.tasks.find(t => t.status === 'In Progress')?.phase || 'Not Started';
  const packageReady = l1Pct >= 100 && stats.evidence.filter(e => e.reviewer_status === 'Approved').length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{selectedClient.legal_name}</h1>
          <p className="text-sm text-slate-500 mt-1">CMMC deployment dashboard — Level 1 first, Level 2 ready second</p>
        </div>
        <button
          onClick={() => setShowReport(true)}
          className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-[#0F1E3C] text-white hover:bg-[#1E2D4A] flex-shrink-0"
        >
          <FileBarChart className="w-4 h-4" /> Generate Weekly Report
        </button>
      </div>

      <WarningBanner compact indices={[3]} />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <StatCard icon={Building2} label="Active Client" value={selectedClient.legal_name?.split(' ')[0] || '—'} sublabel={selectedClient.environment_type} color="navy" onClick={() => navigate('/clients')} />
        <StatCard icon={Clock} label="Current Phase" value={currentPhase?.split(' ').slice(0, 2).join(' ') || '—'} sublabel={currentPhase} color="blue" onClick={() => navigate('/board')} />
        <StatCard icon={ShieldCheck} label="L1 Controls Done" value={`${l1Complete}/${l1Controls.length}`} sublabel={`${Math.round(l1Pct)}% complete`} color="green" onClick={() => navigate('/controls')} />
        <StatCard icon={Layers} label="Level 2 Controls" value={`${l2Complete}/${l2Controls.length}`} sublabel={`${Math.round(l2Pct)}% complete`} color="amber" onClick={() => navigate('/level2')} />
        <StatCard icon={Image} label="Evidence Items" value={evidenceItems} sublabel="Collected" color="white" onClick={() => navigate('/evidence')} />
        <StatCard icon={AlertCircle} label="Missing Screenshots" value={missingScreenshots} sublabel="Tasks needing capture" color="amber" onClick={() => navigate('/screenshots')} />
        <StatCard icon={AlertCircle} label="Missing Exports" value={missingExports} sublabel="Tasks needing export" color="amber" onClick={() => navigate('/evidence')} />
        <StatCard icon={ListChecks} label="Open Tasks" value={openTasks.length} sublabel="In progress" color="white" onClick={() => navigate('/board')} />
        <StatCard icon={AlertTriangle} label="High Priority Blockers" value={blockers.length} sublabel="Critical items" color="red" onClick={() => navigate('/board')} />
        <StatCard icon={Package} label="Package Readiness" value={packageReady ? 'Ready' : 'Not Ready'} sublabel={packageReady ? 'Level 1 complete' : 'Complete L1 first'} color={packageReady ? 'green' : 'white'} onClick={() => navigate('/package')} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-5 h-5 text-green-600" />
            <h3 className="text-sm font-semibold text-slate-800">CMMC Level 1 Completion</h3>
          </div>
          <ProgressBar value={l1Pct} color="green" size="md" />
          <div className="mt-3 text-xs text-slate-500">{l1Complete} of {l1Controls.length} controls complete. Level 1 must be finished before Level 2 evidence is finalized.</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-5 h-5 text-amber-600" />
            <h3 className="text-sm font-semibold text-slate-800">CMMC Level 2 Controls</h3>
          </div>
          <ProgressBar value={l2Pct} color="amber" size="md" />
          <div className="mt-3 text-xs text-slate-500">{l2Complete} of {l2Controls.length} controls complete. Level 2 builds on Level 1 — finish Level 1 first, then advance Level 2 controls.</div>
        </div>
      </div>

      <ProgressSummary l1Controls={l1Controls} l2Controls={l2Controls} tasks={stats.tasks} />

      <Link to="/piee" className="block bg-gradient-to-r from-[#0F1E3C] to-[#1E2D4A] rounded-xl p-5 text-white hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
              <BadgeCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">PIEE / SPRS CMMC Self-Certification Walkthrough</h3>
              <p className="text-xs text-white/60 mt-0.5">Guide clients through PIEE access, SPRS role requests, assessment entry, and AO affirmation.</p>
            </div>
          </div>
          <span className="text-xs text-white/70 hidden sm:inline">Start Walkthrough →</span>
        </div>
      </Link>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2"><Image className="w-4 h-4 text-slate-500" /><h3 className="text-sm font-semibold text-slate-800">Recent Screenshots</h3></div>
            <Link to="/screenshots" className="text-xs text-blue-600 hover:underline">View all</Link>
          </div>
          {recentScreenshots.length === 0 ? <p className="text-xs text-slate-400 py-4">No screenshots uploaded yet.</p> : (
            <div className="space-y-2">
              {recentScreenshots.map(s => (
                <div key={s.id} className="flex items-center gap-3 py-1.5">
                  {s.file_url ? <img src={s.file_url} alt="" className="w-10 h-10 rounded object-cover border border-slate-200" /> : <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center"><Image className="w-4 h-4 text-slate-400" /></div>}
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-slate-700 truncate">{s.actual_file_name || s.suggested_file_name || 'Untitled'}</div>
                    <div className="text-[10px] text-slate-400">{s.related_control || 'No control mapped'}</div>
                  </div>
                  <StatusBadge status={s.validation_status} size="xs" />
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-slate-500" /><h3 className="text-sm font-semibold text-slate-800">Recent Documents</h3></div>
            <Link to="/documents" className="text-xs text-blue-600 hover:underline">View all</Link>
          </div>
          {recentDocs.length === 0 ? <p className="text-xs text-slate-400 py-4">No documents generated yet.</p> : (
            <div className="space-y-2">
              {recentDocs.map(d => (
                <div key={d.id} className="flex items-center gap-3 py-1.5">
                  <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-slate-700 truncate">{d.title}</div>
                    <div className="text-[10px] text-slate-400">v{d.version}</div>
                  </div>
                  <StatusBadge status={d.status} size="xs" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ClientProgressOverview />

      <WarningBanner indices={[0, 1, 2]} />

      <div className="bg-[#0F1E3C] rounded-xl p-5 text-white">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Implementation Order</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
          {['Create Client','Confirm Scope','Confirm E5 License','Evidence Structure','Tenant Baseline','Users & Groups','Admin Accounts','MFA','Conditional Access','SharePoint Archive','FCI Storage','Exchange Security','Defender Security','NinjaOne Evidence','Upload Screenshots','Label Evidence','L1 Validation','SPRS Workpapers','Final L1 Package','Level 2 Readiness'].map((step, i) => (
            <div key={i} className="flex items-center gap-1.5 text-white/70">
              <span className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[9px] font-bold flex-shrink-0">{i + 1}</span>
              <span className="truncate">{step}</span>
            </div>
          ))}
        </div>
      </div>

      {showReport && (
        <WeeklyReportModal
          client={selectedClient}
          l1Controls={l1Controls}
          l2Controls={l2Controls}
          tasks={stats.tasks}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}