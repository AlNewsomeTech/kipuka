import { useState, useEffect } from 'react';
import { Inbox, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import ConfidentialityFooter from '@/components/legal/ConfidentialityFooter';

const STATUSES = ['Open', 'In Progress', 'Waiting on Customer', 'Resolved', 'Closed'];

export default function SupportInbox() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  const load = async () => {
    setLoading(true);
    const list = await base44.entities.SupportRequest.list('-created_date', 200).catch(() => []);
    setRequests(list);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const setStatus = async (id, status) => {
    await base44.entities.SupportRequest.update(id, { status });
    setRequests((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  const shown = filter === 'All' ? requests : requests.filter((r) => r.status === filter);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Inbox className="w-5 h-5 text-[#0F1E3C]" />
          <div>
            <h1 className="text-lg font-bold text-slate-900">Support Inbox</h1>
            <p className="text-sm text-slate-500">Support requests submitted from the Help Center.</p>
          </div>
        </div>
        <select className="form-input w-auto" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="All">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
      ) : shown.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200">
          <EmptyState icon={Inbox} title="No support requests" description="Requests submitted from the Help Center will appear here." />
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((r) => (
            <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-slate-800">{r.subject}</h3>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">{r.request_type}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">{r.priority}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {r.requester_name || 'Unknown'} · {r.requester_email || '—'}
                  </p>
                  {r.description && (
                    <div className="prose prose-slate prose-sm max-w-none mt-2 text-slate-600" dangerouslySetInnerHTML={{ __html: r.description }} />
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <StatusBadge status={r.status} />
                  <select className="form-input w-auto text-xs" value={r.status} onChange={(e) => setStatus(r.id, e.target.value)}>
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfidentialityFooter />
    </div>
  );
}