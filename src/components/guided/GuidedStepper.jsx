import { Check } from 'lucide-react';

const STEPS = [
  { n: 1, label: 'Understand' },
  { n: 2, label: 'Do' },
  { n: 3, label: 'Capture & Upload' },
  { n: 4, label: 'Verify' },
];

export default function GuidedStepper({ current, completedSteps = [], onJump }) {
  return (
    <div className="flex items-center">
      {STEPS.map((s, i) => {
        const done = completedSteps.includes(s.n);
        const active = current === s.n;
        return (
          <div key={s.n} className="flex items-center flex-1 last:flex-none">
            <button
              onClick={() => onJump?.(s.n)}
              className="flex flex-col items-center gap-1 group"
            >
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                active ? 'bg-[#0F1E3C] text-white border-[#0F1E3C]'
                  : done ? 'bg-green-500 text-white border-green-500'
                  : 'bg-white text-slate-400 border-slate-300 group-hover:border-slate-400'
              }`}>
                {done && !active ? <Check className="w-4 h-4" /> : s.n}
              </span>
              <span className={`text-[11px] font-semibold ${active ? 'text-[#0F1E3C]' : 'text-slate-500'}`}>{s.label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 mx-1 mb-4 ${completedSteps.includes(s.n) ? 'bg-green-400' : 'bg-slate-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}