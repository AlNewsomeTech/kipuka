import { CheckCircle2, Circle } from 'lucide-react';
import { evidenceItems } from './stepContent';

export default function EvidenceChecklist({ checked, onToggle, record, onUpdate }) {
  const checkedList = checked || [];
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="text-sm font-semibold text-slate-800 mb-3">Evidence Checklist</h3>
      <div className="space-y-2 mb-4">
        {evidenceItems.map(item => {
          const isChecked = checkedList.includes(item.key);
          return (
            <label key={item.key} className="flex items-start gap-2.5 cursor-pointer">
              <button onClick={() => onToggle(item.key)} className="flex-shrink-0 mt-0.5">
                {isChecked ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Circle className="w-4 h-4 text-slate-300" />}
              </button>
              <span className={`text-sm ${isChecked ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{item.label}</span>
            </label>
          );
        })}
      </div>
      <div className="pt-4 border-t border-slate-200 grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-semibold text-slate-500 uppercase">CMMC UID</label>
          <input className="form-input mt-1" value={record?.cmmc_uid || ''} onChange={e => onUpdate({ cmmc_uid: e.target.value })} />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-slate-500 uppercase">CMMC Status</label>
          <input className="form-input mt-1" value={record?.cmmc_status || ''} onChange={e => onUpdate({ cmmc_status: e.target.value })} />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-slate-500 uppercase">Expiration Date</label>
          <input type="date" className="form-input mt-1" value={record?.expiration_date || ''} onChange={e => onUpdate({ expiration_date: e.target.value })} />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-slate-500 uppercase">Date Submitted</label>
          <input type="date" className="form-input mt-1" value={record?.submitted_date || ''} onChange={e => onUpdate({ submitted_date: e.target.value })} />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-slate-500 uppercase">Entered By</label>
          <input className="form-input mt-1" value={record?.entered_by || ''} onChange={e => onUpdate({ entered_by: e.target.value })} />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-slate-500 uppercase">AO Name</label>
          <input className="form-input mt-1" value={record?.ao_name || ''} onChange={e => onUpdate({ ao_name: e.target.value })} />
        </div>
      </div>
      <div className="mt-3">
        <label className="text-[10px] font-semibold text-slate-500 uppercase">Evidence Notes</label>
        <textarea className="form-input mt-1 min-h-[60px]" value={record?.evidence_notes || ''} onChange={e => onUpdate({ evidence_notes: e.target.value })} placeholder="Add any additional evidence notes..." />
      </div>
    </div>
  );
}