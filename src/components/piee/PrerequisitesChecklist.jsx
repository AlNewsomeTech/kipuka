import { CheckCircle2, Circle } from 'lucide-react';
import { prerequisites } from './stepContent';

export default function PrerequisitesChecklist({ checked, onToggle }) {
  const checkedList = checked || [];
  const allChecked = prerequisites.every(p => checkedList.includes(p.key));
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-800">Prerequisites Checklist</h3>
        <span className={`text-xs font-medium ${allChecked ? 'text-green-600' : 'text-slate-400'}`}>{checkedList.length}/{prerequisites.length} complete</span>
      </div>
      <div className="space-y-2">
        {prerequisites.map(p => {
          const isChecked = checkedList.includes(p.key);
          return (
            <label key={p.key} className="flex items-start gap-2.5 cursor-pointer group">
              <button onClick={() => onToggle(p.key)} className="flex-shrink-0 mt-0.5">
                {isChecked ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Circle className="w-4 h-4 text-slate-300 group-hover:text-slate-400" />}
              </button>
              <span className={`text-sm ${isChecked ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{p.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}