import { X } from 'lucide-react';

// Simple multi-select chip picker for linking related records (controls,
// evidence, POA&M, findings, remediation) by id/value.
export default function LinkMultiSelect({ label, options, selected = [], onChange, disabled, emptyHint }) {
  const toggle = (val) => {
    if (selected.includes(val)) onChange(selected.filter((v) => v !== val));
    else onChange([...selected, val]);
  };

  return (
    <div>
      {label && <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>}
      {options.length === 0 ? (
        <p className="text-xs text-slate-400 italic">{emptyHint || 'None available.'}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-white">
          {options.map((o) => {
            const active = selected.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                disabled={disabled}
                onClick={() => toggle(o.value)}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border transition ${
                  active
                    ? 'bg-[#0F1E3C] text-white border-[#0F1E3C]'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
                title={o.label}
              >
                {active && <X className="w-3 h-3" />}
                <span className="truncate max-w-[180px]">{o.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}