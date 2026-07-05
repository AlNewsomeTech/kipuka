import { FileDown, Pencil, Trash2, Cloud } from 'lucide-react';

export default function ProviderCard({ provider, readOnly, onEdit, onDelete, onExport }) {
  const resp = provider.responsibilities || [];
  const counts = resp.reduce((m, r) => { m[r.responsibility] = (m[r.responsibility] || 0) + 1; return m; }, {});
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
          <Cloud className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-slate-900">{provider.provider_name}</div>
          <div className="text-[11px] text-slate-400">{provider.provider_type} · {provider.fedramp_status}</div>
          {provider.service_description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{provider.service_description}</p>}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {['Provider', 'Shared', 'Customer', 'Not Applicable'].map((k) => counts[k] ? (
              <span key={k} className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">{k}: {counts[k]}</span>
            ) : null)}
            {resp.length === 0 && <span className="text-[11px] text-amber-600">No controls mapped yet</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={onExport} className="text-slate-400 hover:text-slate-700" title="Export SRM"><FileDown className="w-4 h-4" /></button>
          {!readOnly && <button onClick={onEdit} className="text-slate-400 hover:text-[#0F1E3C]" title="Edit"><Pencil className="w-4 h-4" /></button>}
          {!readOnly && <button onClick={onDelete} className="text-slate-400 hover:text-red-600" title="Delete"><Trash2 className="w-4 h-4" /></button>}
        </div>
      </div>
    </div>
  );
}