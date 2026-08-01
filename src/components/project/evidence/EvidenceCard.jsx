import { useState } from 'react';
import { FileText, Download, Pencil, Archive, ChevronDown, Calendar, User, AlertTriangle, ShieldCheck, Send, XCircle, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import StatusBadge from '@/components/StatusBadge';
import { EVIDENCE_QUALITY_ITEMS, isExpired } from '@/lib/evidenceQuality';

export default function EvidenceCard({ item, compact, readOnly, onEdit, onRefresh }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const stale = isExpired(item);
  const mutable = ['Draft', 'Rejected'].includes(item.review_status);

  const transition = async (action, payload = {}) => {
    setError('');
    setBusy(action);
    try {
      const response = await base44.functions.invoke('manageProjectEvidence', {
        action, transition_id: crypto.randomUUID(), evidence_id: item.id, note, ...payload,
      });
      if (action === 'download') {
        const url = response.data?.signed_url;
        if (!url) throw new Error('A signed download URL was not returned.');
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        setNote('');
        await onRefresh();
      }
    } catch (transitionError) {
      setError(transitionError?.response?.data?.error || transitionError.message || 'Evidence action failed.');
    } finally {
      setBusy('');
    }
  };

  const toggleQuality = async (key) => {
    const next = { ...(item.quality_checklist || {}), [key]: !(item.quality_checklist || {})[key] };
    await transition('update_quality', { quality_checklist: next, quality_notes: item.quality_notes || '' });
  };

  const retentionElapsed = !item.retention_until || item.retention_until <= new Date().toISOString().slice(0, 10);

  return (
    <div className={`bg-white rounded-lg border ${stale ? 'border-amber-300' : 'border-slate-200'} ${compact ? '' : 'p-4'}`}>
      <div className={`flex items-center gap-3 ${compact ? 'p-3' : ''}`}>
        <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-slate-800 truncate">{item.evidence_title}</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{item.evidence_type}</span>
            <span className="text-[11px] text-slate-400">v{item.version || 1}</span>
            {stale && <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Stale</span>}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
            {item.evidence_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {item.evidence_date}</span>}
            {item.owner && <span className="flex items-center gap-1"><User className="w-3 h-3" /> {item.owner}</span>}
            {(item.control_ids || []).length > 0 && <span>{item.control_ids.length} control{item.control_ids.length !== 1 ? 's' : ''}</span>}
            {(item.objective_ids || []).length > 0 && <span>{item.objective_ids.length} objective{item.objective_ids.length !== 1 ? 's' : ''}</span>}
          </div>
        </div>
        <StatusBadge status={item.review_status} size="xs" />
        {item.file_uri && <button onClick={() => transition('download')} disabled={!!busy} title="Verify and download" className="text-slate-400 hover:text-slate-700"><Download className="w-4 h-4" /></button>}
        {!readOnly && mutable && <button onClick={onEdit} title="Create new version" className="text-slate-400 hover:text-slate-700"><Pencil className="w-4 h-4" /></button>}
        <button onClick={() => setOpen(!open)} className="text-slate-400"><ChevronDown className={`w-4 h-4 transition-transform ${open ? '' : '-rotate-90'}`} /></button>
      </div>

      {open && (
        <div className={`space-y-3 ${compact ? 'px-3 pb-3' : 'mt-3 pt-3 border-t border-slate-100'}`}>
          {error && <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-800"><AlertTriangle className="w-4 h-4 flex-shrink-0" />{error}</div>}
          {item.description && <div className="prose prose-sm max-w-none text-slate-600" dangerouslySetInnerHTML={{ __html: item.description }} />}
          <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500">
            {item.expiration_date && <div>Expires: <span className="text-slate-700">{item.expiration_date}</span></div>}
            {item.retention_until && <div>Retain until: <span className="text-slate-700">{item.retention_until}</span></div>}
            {item.source_system && <div>Source: <span className="text-slate-700">{item.source_system}</span></div>}
            {item.provenance_type && <div>Provenance: <span className="text-slate-700">{item.provenance_type}</span></div>}
            {item.uploaded_by && <div>Uploaded by: <span className="text-slate-700">{item.uploaded_by}</span></div>}
            {item.reviewed_by && <div>Reviewed by: <span className="text-slate-700">{item.reviewed_by}</span></div>}
            {(item.control_ids || []).length > 0 && <div className="font-mono text-slate-600">{item.control_ids.join(', ')}</div>}
            {item.hash_value && <div className="font-mono text-[10px] break-all text-slate-500">SHA-256: {item.hash_value}</div>}
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-600 mb-1.5">Evidence Quality Checklist</div>
            <div className="grid sm:grid-cols-2 gap-1.5">
              {EVIDENCE_QUALITY_ITEMS.map((quality) => (
                <label key={quality.key} className="flex items-start gap-2 text-xs text-slate-700">
                  <input type="checkbox" className="mt-0.5" disabled={readOnly || !['Draft', 'Needs Review', 'Rejected'].includes(item.review_status) || !!busy}
                    checked={!!(item.quality_checklist || {})[quality.key]} onChange={() => toggleQuality(quality.key)} />
                  {quality.label}
                </label>
              ))}
            </div>
          </div>

          {item.quality_notes && <div className="text-xs text-slate-500">Quality notes: <span className="text-slate-700">{item.quality_notes}</span></div>}
          {item.rejection_reason && <div className="text-xs text-red-700">Rejection reason: {item.rejection_reason}</div>}

          {!readOnly && !['Accepted', 'Expired', 'Archived', 'Superseded'].includes(item.review_status) && (
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <textarea className="form-input min-h-16 text-xs" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Reviewer or transition note" />
              <div className="flex flex-wrap gap-2">
                {mutable && <ActionButton onClick={() => transition('submit_review')} busy={busy === 'submit_review'} icon={Send} label="Submit for Review" />}
                {item.review_status === 'Needs Review' && <>
                  <ActionButton onClick={() => transition('accept')} busy={busy === 'accept'} icon={ShieldCheck} label="Accept Evidence" />
                  <ActionButton onClick={() => transition('reject')} busy={busy === 'reject'} icon={XCircle} label="Reject" danger />
                </>}
              </div>
            </div>
          )}

          {!readOnly && retentionElapsed && !['Archived', 'Superseded'].includes(item.review_status) && (
            <button onClick={() => transition('archive')} disabled={!!busy} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800">
              {busy === 'archive' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Archive className="w-3.5 h-3.5" />} Archive
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ActionButton({ onClick, busy, icon: Icon, label, danger = false }) {
  return <button onClick={onClick} disabled={busy} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-60 ${danger ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
    {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}{label}
  </button>;
}
