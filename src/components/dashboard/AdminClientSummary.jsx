import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ShieldCheck, Layers, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useClient } from '@/lib/clientContext';
import ProgressBar from '@/components/ProgressBar';
import EmptyState from '@/components/EmptyState';

export default function AdminClientSummary() {
  const { clients, setSelectedClientId } = useClient();
  const navigate = useNavigate();
  const [controls, setControls] = useState({ l1: [], l2: [] });
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.CMMCControl.filter({ level: 'Level 1' }).catch(() => []),
      base44.entities.CMMCControl.filter({ level: 'Level 2' }).catch(() => []),
      base44.entities.ControlProgress.list().catch(() => []),
    ]).then(([l1, l2, prog]) => {
      setControls({ l1, l2 });
      setProgress(prog);
      setLoading(false);
    });
  }, []);

  const handleSelectClient = (clientId) => {
    setSelectedClientId(clientId);
    navigate('/board');
  };

  // Group completed controls by client_id -> Set of control IDs
  const completedByClient = {};
  progress.forEach(p => {
    if (!p.client_id || !p.control_id) return;
    if (p.status !== 'Complete' && !p.ready_for_assessment) return;
    if (!completedByClient[p.client_id]) completedByClient[p.client_id] = new Set();
    completedByClient[p.client_id].add(p.control_id);
  });

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-[#0F1E3C] rounded-full animate-spin" /></div>;

  if (clients.length === 0) {
    return <EmptyState icon={Building2} title="No clients yet" description="Create a client in the Clients section to get started." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Client Overview</h1>
        <p className="text-sm text-slate-500 mt-1">Summary of all client projects — completion reflects controls marked Complete or ready for assessment. Select a client to view their dashboard.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map((client) => {
          const completedControls = completedByClient[client.id] || new Set();
          const l1Complete = controls.l1.filter(c => completedControls.has(c.control_id)).length;
          const l2Complete = controls.l2.filter(c => completedControls.has(c.control_id)).length;
          const l1Pct = controls.l1.length ? (l1Complete / controls.l1.length) * 100 : 0;
          const l2Pct = controls.l2.length ? (l2Complete / controls.l2.length) * 100 : 0;

          const levelStatus = (complete, total) => {
            if (!total || complete === 0) return { label: 'Not Started', cls: 'bg-slate-100 text-slate-600' };
            if (complete >= total) return { label: 'Complete', cls: 'bg-green-50 text-green-700' };
            return { label: 'In Progress', cls: 'bg-blue-50 text-blue-700' };
          };
          const l1Status = levelStatus(l1Complete, controls.l1.length);
          const l2Status = levelStatus(l2Complete, controls.l2.length);

          return (
            <div
              key={client.id}
              onClick={() => handleSelectClient(client.id)}
              className="bg-white rounded-xl border border-slate-200 p-5 cursor-pointer hover:shadow-md hover:border-slate-300 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-[#0F1E3C] flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-white" />
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