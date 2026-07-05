import { Pencil, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';

export default function IncidentLogTable({ logs, readOnly, onEdit, onDelete }) {
  if (!logs.length) {
    return <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-500">No incidents logged. The incident log itself is IR evidence — record incidents here.</div>;
  }
  return (
    <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
      {logs.map((l) => (
        <div key={l.id} className="flex items-start gap-3 px-4 py-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-slate-800 truncate">{l.title}</span>
              <StatusBadge status={l.status} size="xs" />
              {l.involved_cui && <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-semibold">CUI</span>}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {l.incident_date || 'No date'} · {l.category} · {l.severity}
            </div>
            {l.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{l.description}</p>}
            <div className="mt-1.5 text-[11px] flex items-center gap-1.5">
              {l.reported_to_dibnet ? (
                <span className="inline-flex items-center gap-1 text-green-700 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Reported to DIBNet
                  {l.dibnet_report_date ? ` (${l.dibnet_report_date})` : ''}{l.icf_number ? ` · ICF ${l.icf_number}` : ''}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-600 font-semibold">
                  <AlertCircle className="w-3.5 h-3.5" /> Not reported to DIBNet
                </span>
              )}
            </div>
          </div>
          {!readOnly && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => onEdit(l)} className="text-slate-400 hover:text-[#0F1E3C]"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => onDelete(l.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}