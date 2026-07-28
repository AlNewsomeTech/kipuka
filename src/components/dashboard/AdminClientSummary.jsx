import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ShieldCheck, Layers, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useClient } from '@/lib/clientContext';
import { loadControlProgressSets } from '@/lib/clientControlCompletion';
import ProgressBar from '@/components/ProgressBar';
import EmptyState from '@/components/EmptyState';

export default function AdminClientSummary() {
  const { clients, setSelectedClientId } = useClient();
  const navigate = useNavigate();
  const [controls, setControls] = useState({ l1: [], l2: [] });
  // Map of client_id -> { done: Set, started: Set }, merged from ControlAssessment + ControlProgress.
  const [progressByClient, setProgressByClient] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const [l1, l2] = await Promise.all([
        base44.entities.CMMCControl.filter({ level: 'Level 1' }).catch(() => []),
        base44.entities.CMMCControl.filter({ level: 'Level 2' }).catch(() => []),
      ]);
      const entries = await Promise.all(
        clients.map(async (c) => [c.id, await loadControlProgressSets(c.id)])
      );
      if (!active) return;
      setControls({ l1, l2 });
      setProgressByClient(Object.fromEntries(entries));
      setLoading(false);
    })();
    return () => { active = false; };
  }, [clients]);

  const handleSelectClient = (clientId) => {
    setSelectedClientId(clientId);
    navigate('/board');
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-[#0F1E3C] rounded-full animate-spin" /></div>;

  if (clients.length === 0) {
    return <EmptyState icon={Building2} title="No clients yet" description="Create a client in the Clients section to get started." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="page-kicker">Portfolio</div>
        <h1 className="page-title mt-2">Client overview</h1>
        <p className="page-subtitle mt-2 max-w-3xl">Evidence-verified progress across every managed CMMC engagement. Select a client to open its command center.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {clients.map((client) => {
          const sets = progressByClient[client.id] || { done: new Set(), started: new Set() };
          const l1Complete = controls.l1.filter(c => sets.done.has(c.control_id)).length;
          const l2Complete = controls.l2.filter(c => sets.done.has(c.control_id)).length;
          const l1Started = controls.l1.filter(c => sets.started.has(c.control_id)).length;
          const l2Started = controls.l2.filter(c => sets.started.has(c.control_id)).length;
          const l1Pct = controls.l1.length ? (l1Complete / controls.l1.length) * 100 : 0;
          const l2Pct = controls.l2.length ? (l2Complete / controls.l2.length) * 100 : 0;

          const levelStatus = (complete, started, total) => {
            if (!total) return { label: 'Not Started', cls: 'bg-slate-100 text-slate-600' };
            if (complete >= total) return { label: 'Complete', cls: 'bg-green-50 text-green-700' };
            if (complete > 0 || started > 0) return { label: 'In Progress', cls: 'bg-blue-50 text-blue-700' };
            return { label: 'Not Started', cls: 'bg-slate-100 text-slate-600' };
          };
          const l1Status = levelStatus(l1Complete, l1Started, controls.l1.length);
          const l2Status = levelStatus(l2Complete, l2Started, controls.l2.length);

          return (
            <div
              key={client.id}
              onClick={() => handleSelectClient(client.id)}
              className="app-surface app-surface-interactive cursor-pointer p-5"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0b1930] to-[#1d4a73] shadow-md">
                    <Building2 className="h-5 w-5 text-[#9bd9f7]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 truncate">{client.legal_name}</h3>
                    <p className="text-xs text-slate-500 truncate">{client.environment_type} • {client.target_cmmc_level}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-green-600" /> Level 1 Controls
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${l1Status.cls}`}>{l1Status.label}</span>
                      <span className="text-xs font-bold text-slate-700">{l1Complete}/{controls.l1.length}</span>
                    </div>
                  </div>
                  <ProgressBar value={l1Pct} color="green" size="sm" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-amber-600" /> Level 2 Controls
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${l2Status.cls}`}>{l2Status.label}</span>
                      <span className="text-xs font-bold text-slate-700">{l2Complete}/{controls.l2.length}</span>
                    </div>
                  </div>
                  <ProgressBar value={l2Pct} color="amber" size="sm" />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">Evidence-verified completion</span>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${l1Status.cls}`}>L1 {l1Status.label}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${l2Status.cls}`}>L2 {l2Status.label}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}