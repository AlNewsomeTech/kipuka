import { X } from 'lucide-react';

export default function TemplatePickerModal({ templates, onClone, onClose }) {
  const byCategory = templates.reduce((m, t) => { (m[t.policy_category] ||= []).push(t); return m; }, {});
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 sticky top-0 bg-white">
          <h3 className="text-sm font-bold text-slate-800">Create Policy from Template</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          {Object.keys(byCategory).sort().map((cat) => (
            <div key={cat}>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{cat}</div>
              <div className="space-y-1">
                {byCategory[cat].map((t) => (
                  <button key={t.id} onClick={() => onClone(t)}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-700 bg-slate-50 hover:bg-slate-100">
                    {t.policy_name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}