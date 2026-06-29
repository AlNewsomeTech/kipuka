import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Readability-focused collapsible section.
 * Header is always visible; body expands/collapses with a clear toggle.
 */
export default function CollapsibleSection({ title, icon: Icon, defaultOpen = false, badge, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-slate-50 transition-colors"
      >
        <span className="flex items-center gap-2.5 min-w-0">
          {Icon && <Icon className="w-[18px] h-[18px] text-slate-500 flex-shrink-0" />}
          <span className="text-[15px] font-semibold text-slate-900 truncate">{title}</span>
          {badge != null && (
            <span className="text-[13px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full flex-shrink-0">{badge}</span>
          )}
        </span>
        <ChevronDown className={`w-[18px] h-[18px] text-slate-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-slate-100">
          {children}
        </div>
      )}
    </div>
  );
}