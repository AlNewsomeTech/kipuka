import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ShieldCheck, ChevronRight, AlertTriangle } from 'lucide-react';
import { useClient } from '@/lib/clientContext';
import { loadCanonicalClientProgress } from '@/lib/clientControlCompletion';
import ProgressBar from '@/components/ProgressBar';
import EmptyState from '@/components/EmptyState';

// Portfolio overview. Every card reads the client's canonical Project and shows
// exactly one progress row against that project's authoritative denominator
// (Level 1 = 15, Level 2 = 110). A client whose data is unavailable or
// structurally invalid shows an integrity state — never a percentage.
export default function AdminClientSummary() {
  const { clients, setSelectedClientId } = useClient();
  const navigate = useNavigate();
  const [progressByClient, setProgressByClient] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      // Per-client isolation: one broken client never hides the portfolio.
      const entries = await Promise.all(clients.map(async (client) => {
        try {
          return [client.id, await loadCanonicalClientProgress(client.id)];
        } catch (err) {
          return [client.id, {
            projectId: null, project: null, assessments: [],
            done: new Set(), started: new Set(),
            expectedTotal: null, actualUniqueTotal: 0,
            integrityOk: false, integrityIssues: [],
            error: err?.message || 'Progress could not be loaded.',
          }];
        }
      }));
      if (!active) return;
      setProgressByClient(Object.fromEntries(entries));
      setLoading(false);
    })();
    return () => { active = false; };
  }, [clients]);

  const openClient = (client, result) => {
    setSelectedClientId(client.id);
    navigate(result?.projectId ? `/projects/${result.projectId}` : '/projects');
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-[#0F1E3C] rounded-full animate-spin" /></div>;

  if (clients.length === 0) {
    return <EmptyState icon={Building2} title="No clients yet" description="Create a client in the Clients section to get started." action={null} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="page-kicker">Portfolio</div>
        <h1 className="page-title mt-2">Client overview</h1>
        <p className="page-subtitle mt-2 max-w-3xl">Canonical project progress across every managed CMMC engagement. Select a client to open its CMMC project.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {clients.map((client) => {
          const result = progressByClient[client.id];
          const targetLevel = result?.project?.target_cmmc_level || null;
          const expectedTotal = result?.expectedTotal || null;
          const integrityOk = !!result?.integrityOk;
          const completed = integrityOk ? result.done.size : 0;
          const startedCount = integrityOk ? result.started.size : 0;
          const pct = integrityOk && expectedTotal ? (completed / expectedTotal) * 100 : 0;

          let statusLabel = null;
          let statusCls = 'bg-slate-100 text-slate-600';
          if (integrityOk) {
            if (completed >= expectedTotal) { statusLabel = 'Complete'; statusCls = 'bg-green-50 text-green-700'; }
            else if (completed > 0 || startedCount > 0) { statusLabel = 'In Progress'; statusCls = 'bg-blue-50 text-blue-700'; }
            else { statusLabel = 'Not Started'; }
          }

          const issueText = result?.error
            || (result?.integrityIssues?.length ? result.integrityIssues[0] : 'Canonical control data is unavailable.');

          return (
            <div
              key={client.id}
              onClick={() => openClient(client, result)}
              className="app-surface app-surface-interactive cursor-pointer p-5"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0b1930] to-[#1d4a73] shadow-md">
                    <Building2 className="h-5 w-5 text-[#9bd9f7]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 truncate">{client.legal_name}</h3>
                    <p className="text-xs text-slate-500 truncate">
                      {client.environment_type || 'Environment not set'} • {targetLevel ? `CMMC ${targetLevel}` : 'No linked project'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
              </div>

              {integrityOk ? (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-green-600" /> CMMC {targetLevel} Requirements
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusCls}`}>{statusLabel}</span>
                      <span className="text-xs font-bold text-slate-700">{completed}/{expectedTotal}</span>
                    </div>
                  </div>
                  <ProgressBar value={pct} label={null} color="green" size="sm" />
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">Canonical project progress</span>
                    <span className="text-[10px] font-semibold text-slate-500">{startedCount} in progress</span>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    {result?.error ? 'Data unavailable' : 'Integrity issue'}
                  </div>
                  <p className="mt-1 text-[11px] leading-4 text-amber-700">{issueText}</p>
                  <p className="mt-1.5 text-[10px] text-amber-600">Progress is not shown until the canonical control set is valid.</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}