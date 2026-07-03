import { useState } from 'react';
import { ChevronDown, Pencil, Trash2, Clock } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';

const RISK_TONE = {
  Low: 'bg-green-50 text-green-700', Moderate: 'bg-amber-50 text-amber-700',
  High: 'bg-orange-50 text-orange-700', Critical: 'bg-red-50 text-red-700',
};

export default function PoamRow({ poam, readOnly, overdue, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-3">
        <button onClick={() => setOpen(!open)} className="text-slate-400"><ChevronDown className={`w-4 h-4 transition-transform ${open ? '' : '-rotate-90'}`} /></button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-slate-800 truncate">{poam.poam_title}</span>
            {poam.control_id && <span className="text-[11px] font-mono text-slate-500">{poam.control_id}</span>}
            {overdue && <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-semibold"><Clock className="w-3 h-3" /> Overdue</span>}
          </div>
          {poam.target_completion_date && <div className="text-[11px] text-slate-400">Due {poam.target_completion_date}{poam.responsible_owner ? ` · ${poam.responsible_owner}` : ''}</div>}
        </div>
        <span className={`hidden sm:inline text-[11px] px-2 py-0.5 rounded-full font-semibold ${RISK_TONE[poam.risk_rating] || RISK_TONE.Moderate}`}>{poam.risk_rating}</span>
        <StatusBadge status={poam.status} size="xs" />
        {!readOnly && <button onClick={onEdit} className="text-slate-400 hover:text-slate-700"><Pencil className="w-4 h-4" /></button>}
        {!readOnly && <button onClick={onDelete} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>}
      </div>
      {open && (
        <div className="mt-3 ml-7 space-y-2 text-xs text-slate-600">
          {poam.gap_statement && <div><span className="font-semibold text-slate-500">Gap: </span><span className="prose prose-sm max-w-none inline" dangerouslySetInnerHTML={{ __html: poam.gap_statement }} /></div>}
          {poam.remediation_plan && <div><span className="font-semibold text-slate-500">Remediation: </span><span className="prose prose-sm max-w-none inline" dangerouslySetInnerHTML={{ __html: poam.remediation_plan }} /></div>}
          {poam.milestones && <div><span className="font-semibold text-slate-500">Milestones: </span><span className="prose prose-sm max-w-none inline" dangerouslySetInnerHTML={{ __html: poam.milestones }} /></div>}
          {poam.closure_notes && <div><span className="font-semibold text-slate-500">Closure: </span><span className="prose prose-sm max-w-none inline" dangerouslySetInnerHTML={{ __html: poam.closure_notes }} /></div>}
        </div>
      )}
    </div>
  );
}