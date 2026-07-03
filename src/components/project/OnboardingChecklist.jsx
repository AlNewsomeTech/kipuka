import { CheckCircle2, Circle } from 'lucide-react';
import { ONBOARDING_STEPS } from '@/lib/projectModules';

export default function OnboardingChecklist({ checklist = {}, hasHandoff, readOnly, onToggle }) {
  const steps = ONBOARDING_STEPS.filter((s) => !s.tierGated || hasHandoff);
  const done = steps.filter((s) => checklist[s.key]).length;
  const pct = steps.length ? Math.round((done / steps.length) * 100) : 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-800">Onboarding Checklist</h3>
        <span className="text-xs font-semibold text-slate-500">{done}/{steps.length} · {pct}%</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-4">
        <div className="h-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="space-y-1">
        {steps.map((s) => {
          const complete = !!checklist[s.key];
          return (
            <button
              key={s.key}
              type="button"
              disabled={readOnly}
              onClick={() => onToggle && onToggle(s.key, !complete)}
              className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left text-sm transition-colors ${
                readOnly ? 'cursor-default' : 'hover:bg-slate-50'
              }`}
            >
              {complete ? (
                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-slate-300 flex-shrink-0" />
              )}
              <span className={complete ? 'text-slate-400 line-through' : 'text-slate-700'}>{s.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}