import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, Send, RotateCcw, UploadCloud, Archive, AlertTriangle } from 'lucide-react';
import EmptyState from '@/components/EmptyState';

const actionFor = {
  Draft: [{ id: 'submit_review', label: 'Submit for Review', icon: Send }],
  'Changes Requested': [{ id: 'resubmit', label: 'Resubmit', icon: RotateCcw }],
  'In Review': [
    { id: 'request_changes', label: 'Request Changes', icon: AlertTriangle },
    { id: 'approve', label: 'Approve v1.0', icon: CheckCircle2 },
  ],
  Approved: [{ id: 'publish', label: 'Publish', icon: UploadCloud }],
  Published: [],
};

export default function DocumentLifecycle({ docs, events, onChanged }) {
  const [busy, setBusy] = useState('');
  const [notes, setNotes] = useState({});
  const [dates, setDates] = useState({});
  const [error, setError] = useState('');

  const transition = async (doc, action) => {
    setBusy(doc.id + action); setError('');
    try {
      await base44.functions.invoke('manageProjectDocumentLifecycle', {
        document_id: doc.id,
        action,
        transition_id: crypto.randomUUID(),
        note: notes[doc.id] || '',
        ...(action === 'approve' && dates[doc.id] ? { effective_date: dates[doc.id] } : {}),
      });
      setNotes((n) => ({ ...n, [doc.id]: '' }));
      await onChanged();
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally { setBusy(''); }
  };

  const active = docs.filter((d) => !['Superseded', 'Archived'].includes(d.status));
  if (!active.length) return <EmptyState icon={Send} title="No generated documents" description="Generate a DOCX draft before starting review." action={null} />;

  return <div className="space-y-4">
    {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    {active.map((doc) => {
      const actions = actionFor[doc.status] || [];
      const history = events.filter((e) => e.project_document_id === doc.id).sort((a, b) => new Date(b.event_date) - new Date(a.event_date));
      return <div key={doc.id} className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-slate-900">{doc.title}</h3>
            <p className="text-xs text-slate-500 mt-1">v{doc.document_version} · {doc.status} · SHA-256 {doc.output_sha256?.slice(0, 12)}…</p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{doc.status}</span>
        </div>
        {doc.stale && <p className="mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-700">Stale: {(doc.stale_reasons || []).join('; ')}</p>}
        {actions.length > 0 && <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <div className="space-y-2">
            <textarea className="form-input min-h-[72px]" value={notes[doc.id] || ''} onChange={(e) => setNotes((n) => ({ ...n, [doc.id]: e.target.value }))} placeholder={doc.status === 'In Review' ? 'Review note or required change details' : 'Optional lifecycle note'} />
            {doc.status === 'In Review' && <label className="flex items-center gap-2 text-xs text-slate-600">Effective date
              <input type="date" className="form-input !w-auto" value={dates[doc.id] || ''} onChange={(e) => setDates((d) => ({ ...d, [doc.id]: e.target.value }))} />
            </label>}
          </div>
          <div className="flex flex-wrap items-start gap-2">
            {actions.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => transition(doc, id)} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F1E3C] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
              <Icon className="h-3.5 w-3.5" />{busy === doc.id + id ? 'Working…' : label}
            </button>)}
            <button onClick={() => transition(doc, 'archive')} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 disabled:opacity-50"><Archive className="h-3.5 w-3.5" />Archive</button>
          </div>
        </div>}
        {history.length > 0 && <div className="mt-4 border-t border-slate-100 pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Audit history</p>
          <div className="mt-2 space-y-1">{history.map((e) => <div key={e.id} className="text-xs text-slate-600">
            {e.event_date?.replace('T', ' ').slice(0, 19)} · {e.action} · {e.actor_name}{e.note ? ` · ${e.note}` : ''}
          </div>)}</div>
        </div>}
      </div>;
    })}
  </div>;
}
