import { useState, useEffect } from 'react';
import { Users, AlertTriangle, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useClient } from '@/lib/clientContext';
import ProgressBar from '@/components/ProgressBar';
import EmptyState from '@/components/EmptyState';

const l1Phases = [
  'Intake', 'Scope', 'Tenant Baseline', 'Google Migration Planning', 'Identity Setup',
  'MFA and Conditional Access', 'SharePoint Evidence Archive', 'FCI Storage Setup',
  'Exchange Security', 'Defender and Security Baseline', 'NinjaOne Endpoint Setup',
  'Level 1 Control Validation', 'Level 1 Evidence Review', 'SPRS and Attestation',
];
const l2Phases = ['Level 2 Readiness'];

export default function ClientProgressOverview({ onlyClientId = null }) {
  const { clients, setSelectedClientId } = useClient();
  const navigate = useNavigate();
  const scopedClients = onlyClientId ? clients.filter(c => c.id === onlyClientId) : clients;
  const [allTasks, setAllTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('completion');

  useEffect(() => {
    base44.entities.DeploymentTask.list('-created_date', 500)
      .then(setAllTasks)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse h-48" />;
  }

  if (scopedClients.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <EmptyState icon={Users} title="No clients yet" description="Add clients to see cross-client progress." />
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];

  const rows = scopedClients.map((client) => {
    const tasks = allTasks.filter(t => t.client_id === client.id);
    const l1Tasks = tasks.filter(t => l1Phases.includes(t.phase));
    const l2Tasks = tasks.filter(t => l2Phases.includes(t.phase));
    const complete = tasks.filter(t => t.status === 'Complete').length;
    const l1Complete = l1Tasks.filter(t => t.status === 'Complete').length;
    const l2Complete = l2Tasks.filter(t => t.status === 'Complete').length;
    const overdue = tasks.filter(t => t.due_date && t.due_date < today && t.status !== 'Complete');
    const blockers = tasks.filter(t => t.status === 'Blocker');
    const completionPct = tasks.length ? (complete / tasks.length) * 100 : 0;
    const l1Pct = l1Tasks.length ? (l1Complete / l1Tasks.length) * 100 : 0;
    const l2Pct = l2Tasks.length ? (l2Complete / l2Tasks.length) * 100 : 0;
    const fallingBehind = overdue.length > 0 || blockers.length > 0;
    return { client, tasks: tasks.length, complete, l1Complete, l1Total: l1Tasks.length, l2Complete, l2Total: l2Tasks.length, overdue: overdue.length, blockers: blockers.length, completionPct, l1Pct, l2Pct, fallingBehind };
  });

  rows.sort((a, b) => {
    if (sortBy === 'completion') return a.completionPct - b.completionPct;
    if (sortBy === 'overdue') return b.overdue - a.overdue;
    if (sortBy === 'blockers') return b.blockers - a.blockers;
    if (sortBy === 'name') return a.client.legal_name.localeCompare(b.client.legal_name);
    return 0;
  });

  const handleSelect = (clientId) => {
    setSelectedClientId(clientId);
    navigate('/');
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-[#0F1E3C]" />
          <h3 className="text-sm font-semibold text-slate-800">Client Progress Overview</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-400 hidden sm:inline">Sort by:</span>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1 text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            <option value="completion">Lowest Completion</option>
            <option value="overdue">Most Overdue</option>
            <option value="blockers">Most Blockers</option>
            <option value="name">Client Name</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
              <th className="text-left font-semibold px-4 py-2.5">Client</th>
              <th className="text-left font-semibold px-3 py-2.5 hidden md:table-cell">Level 1</th>
              <th className="text-left font-semibold px-3 py-2.5 hidden md:table-cell">Level 2</th>
              <th className="text-left font-semibold px-3 py-2.5">Overall</th>
              <th className="text-center font-semibold px-3 py-2.5">Overdue</th>
              <th className="text-center font-semibold px-3 py-2.5">Blockers</th>
              <th className="text-center font-semibold px-3 py-2.5">Status</th>
              <th className="px-2 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr
                key={row.client.id}
                onClick={() => handleSelect(row.client.id)}
                className="hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3">
                  <div className="text-xs font-semibold text-slate-800 truncate max-w-[160px]">{row.client.legal_name}</div>
                  <div className="text-[10px] text-slate-400">{row.client.target_cmmc_level}</div>
                </td>
                <td className="px-3 py-3 hidden md:table-cell">
                  <div className="w-28">
                    <ProgressBar value={row.l1Pct} color="green" size="sm" />
                    <div className="text-[10px] text-slate-400 mt-0.5">{row.l1Complete}/{row.l1Total}</div>
                  </div>
                </td>
                <td className="px-3 py-3 hidden md:table-cell">
                  <div className="w-28">
                    <ProgressBar value={row.l2Pct} color="amber" size="sm" />
                    <div className="text-[10px] text-slate-400 mt-0.5">{row.l2Complete}/{row.l2Total}</div>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="w-28">
                    <ProgressBar value={row.completionPct} color="navy" size="sm" />
                    <div className="text-[10px] text-slate-400 mt-0.5">{row.complete}/{row.tasks}</div>
                  </div>
                </td>
                <td className="px-3 py-3 text-center">
                  {row.overdue > 0 ? (
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-50 text-red-700 text-xs font-bold">{row.overdue}</span>
                  ) : (
                    <span className="text-slate-300 text-xs">—</span>
                  )}
                </td>
                <td className="px-3 py-3 text-center">
                  {row.blockers > 0 ? (
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-50 text-red-700 text-xs font-bold">{row.blockers}</span>
                  ) : (
                    <span className="text-slate-300 text-xs">—</span>
                  )}
                </td>
                <td className="px-3 py-3 text-center">
                  {row.fallingBehind ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                      <AlertTriangle className="w-3 h-3" /> Behind
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                      On Track
                    </span>
                  )}
                </td>
                <td className="px-2 py-3 text-right">
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}