import { useState, useEffect, useCallback } from 'react';
import { ScrollText, Filter } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useOrg } from '@/lib/orgContext';
import EmptyState from '@/components/EmptyState';

// Read-only audit trail. Platform admins see all; org users see their org only.
export default function AuditLogPage() {
  const { selectedOrgId, isPlatformAdmin } = useOrg();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    let rows;
    if (isPlatformAdmin && !selectedOrgId) {
      rows = await base44.entities.AuditLog.list('-created_date', 500).catch(() => []);
    } else if (selectedOrgId) {
      rows = await base44.entities.AuditLog.filter({ organization_id: selectedOrgId }, '-created_date', 500).catch(() => []);
    } else {
      rows = [];
    }
    setLogs(rows);
    setLoading(false);
  }, [selectedOrgId, isPlatformAdmin]);

  useEffect(() => { load(); }, [load]);

  const actionTypes = [...new Set(logs.map((l) => l.action_type).filter(Boolean))];
  const filtered = actionFilter ? logs.filter((l) => l.action_type === actionFilter) : logs;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2"><ScrollText className="w-5 h-5 text-[#0F1E3C]" /> Audit Log</h1>
          <p className="text-sm text-slate-500 mt-0.5">Record of major user and administrative actions.</p>
        </div>
        {actionTypes.length > 0 && (
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700">
              <option value="">All actions</option>
              {actionTypes.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-16 flex justify-center"><div className="w-6 h-6 border-2 border-slate-200 border-t-slate-700 rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200">
          <EmptyState icon={ScrollText} title="No audit entries" description="Major actions such as exports, user role changes, and evidence uploads will appear here." />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-slate-500 border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Target</th>
                  <th className="px-4 py-3">Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{l.created_date ? new Date(l.created_date).toLocaleString() : '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{l.user_name || l.user_email || '—'}</td>
                    <td className="px-4 py-3"><span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{l.action_type}</span></td>
                    <td className="px-4 py-3 text-slate-500">{l.target_entity || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{l.action_summary || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}