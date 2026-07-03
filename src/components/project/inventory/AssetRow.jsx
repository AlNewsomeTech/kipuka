import { useState } from 'react';
import { ChevronDown, Pencil, Trash2, ShieldCheck } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';

const CAT_TONE = {
  'CUI Asset': 'bg-red-50 text-red-700',
  'Security Protection Asset': 'bg-blue-50 text-blue-700',
  'Contractor Risk Managed Asset': 'bg-amber-50 text-amber-700',
  'Specialized Asset': 'bg-purple-50 text-purple-700',
  'Out of Scope': 'bg-slate-100 text-slate-500',
  'Unknown': 'bg-slate-100 text-slate-500',
};

export default function AssetRow({ asset, readOnly, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const flags = [
    asset.stores_cui && 'Stores CUI', asset.processes_cui && 'Processes CUI',
    asset.transmits_cui && 'Transmits CUI', asset.handles_fci && 'Handles FCI',
  ].filter(Boolean);

  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-3">
        <button onClick={() => setOpen(!open)} className="text-slate-400"><ChevronDown className={`w-4 h-4 transition-transform ${open ? '' : '-rotate-90'}`} /></button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-slate-800 truncate">{asset.asset_name}</span>
            {!asset.in_scope && <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Out of scope</span>}
          </div>
          {asset.owner && <div className="text-[11px] text-slate-400">Owner: {asset.owner}</div>}
        </div>
        <span className={`hidden sm:inline text-[11px] px-2 py-0.5 rounded-full font-semibold ${CAT_TONE[asset.scope_category] || CAT_TONE.Unknown}`}>{asset.scope_category}</span>
        <StatusBadge status={asset.status} size="xs" />
        {!readOnly && <button onClick={onEdit} className="text-slate-400 hover:text-slate-700"><Pencil className="w-4 h-4" /></button>}
        {!readOnly && <button onClick={onDelete} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>}
      </div>

      {open && (
        <div className="mt-3 ml-7 grid sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500">
          {asset.business_purpose && <div className="sm:col-span-2">Purpose: <span className="text-slate-700">{asset.business_purpose}</span></div>}
          {asset.location && <div>Location: <span className="text-slate-700">{asset.location}</span></div>}
          {asset.operating_system && <div>OS: <span className="text-slate-700">{asset.operating_system}</span></div>}
          {asset.management_tool && <div>Managed by: <span className="text-slate-700">{asset.management_tool}</span></div>}
          {flags.length > 0 && <div className="sm:col-span-2 flex items-center gap-1.5 text-slate-700"><ShieldCheck className="w-3.5 h-3.5 text-slate-400" /> {flags.join(' · ')}</div>}
          {asset.notes && <div className="sm:col-span-2 prose prose-sm max-w-none text-slate-600" dangerouslySetInnerHTML={{ __html: asset.notes }} />}
        </div>
      )}
    </div>
  );
}