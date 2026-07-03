import { useState } from 'react';
import { FileText, ExternalLink, Pencil, Trash2, ChevronDown, Calendar, User, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import StatusBadge from '@/components/StatusBadge';
import { EVIDENCE_QUALITY_ITEMS, isExpired } from '@/lib/evidenceQuality';

export default function EvidenceCard({ item, compact, readOnly, onEdit, onDelete, onRefresh }) {
  const [open, setOpen] = useState(false);
  const stale = isExpired(item);

  const toggleQuality = async (key) => {
    const next = { ...(item.quality_checklist || {}), [key]: !(item.quality_checklist || {})[key] };
    await base44.entities.ProjectEvidence.update(item.id, { quality_checklist: next });
    onRefresh();
  };

  return (
    <div className={`bg-white rounded-lg border ${stale ? 'border-amber-300' : 'border-slate-200'} ${compact ? '' : 'p-4'}`}>
      <div className={`flex items-center gap-3 ${compact ? 'p-3' : ''}`}>
        <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-slate-800 truncate">{item.evidence_title}</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{item.evidence_type}</span>
            {stale && <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Stale</span>}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
            {item.evidence_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {item.evidence_date}</span>}
            {item.owner && <span className="flex items-center gap-1"><User className="w-3 h-3" /> {item.owner}</span>}
            {(item.control_ids || []).length > 0 && <span>{item.control_ids.length} control{item.control_ids.length !== 1 ? 's' : ''}</span>}
          </div>
        </div>
        <StatusBadge status={item.review_status} size="xs" />
        {item.file_url && <a href={item.file_url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-slate-700"><ExternalLink className="w-4 h-4" /></a>}
        {!readOnly && <button onClick={onEdit} className="text-slate-400 hover:text-slate-700"><Pencil className="w-4 h-4" /></button>}
        {!readOnly && <button onClick={onDelete} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>}
        <button onClick={() => setOpen(!open)} className="text-slate-400"><ChevronDown className={`w-4 h-4 transition-transform ${open ? '' : '-rotate-90'}`} /></button>
      </div>

      {open && (
        <div className={`space-y-3 ${compact ? 'px-3 pb-3' : 'mt-3 pt-3 border-t border-slate-100'}`}>
          {item.description && <div className="prose prose-sm max-w-none text-slate-600" dangerouslySetInnerHTML={{ __html: item.description }} />}
          <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500">
            {item.expiration_date && <div>Expires: <span className="text-slate-700">{item.expiration_date}</span></div>}
            {item.source_system && <div>Source: <span className="text-slate-700">{item.source_system}</span></div>}
            {item.uploaded_by && <div>Uploaded by: <span className="text-slate-700">{item.uploaded_by}</span></div>}
            {(item.control_ids || []).length > 0 && <div className="font-mono text-slate-600">{item.control_ids.join(', ')}</div>}
          </div>

          {/* Quality checklist */}
          <div>
            <div className="text-xs font-semibold text-slate-600 mb-1.5">Evidence Quality Checklist</div>
            <div className="grid sm:grid-cols-2 gap-1.5">
              {EVIDENCE_QUALITY_ITEMS.map((q) => (
                <label key={q.key} className="flex items-start gap-2 text-xs text-slate-700">
                  <input type="checkbox" className="mt-0.5" disabled={readOnly}
                    checked={!!(item.quality_checklist || {})[q.key]}
                    onChange={() => toggleQuality(q.key)} />
                  {q.label}
                </label>
              ))}
            </div>
          </div>

          {item.quality_notes && (
            <div className="text-xs text-slate-500">Review notes: <span className="text-slate-700" dangerouslySetInnerHTML={{ __html: item.quality_notes }} /></div>
          )}
        </div>
      )}
    </div>
  );
}