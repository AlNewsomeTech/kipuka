import { useState } from 'react';
import { X, Plus } from 'lucide-react';

// Simple array-of-strings editor (chips + add input).
export default function TagListField({ label, values = [], onChange, placeholder, disabled }) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const v = draft.trim();
    if (!v) return;
    onChange([...(values || []), v]);
    setDraft('');
  };

  return (
    <div>
      {label && <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {(values || []).map((v, i) => (
          <span key={i} className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-xs rounded-full px-2.5 py-1">
            {v}
            {!disabled && (
              <button onClick={() => onChange(values.filter((_, idx) => idx !== i))}>
                <X className="w-3 h-3 text-slate-400 hover:text-slate-700" />
              </button>
            )}
          </span>
        ))}
        {(values || []).length === 0 && <span className="text-xs text-slate-400 italic">None added</span>}
      </div>
      {!disabled && (
        <div className="flex gap-2">
          <input className="form-input flex-1" value={draft} placeholder={placeholder}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
          <button onClick={add} className="px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}