import { Check } from 'lucide-react';

const STEPS = [
  'Company Profile',
  'Contract & Data',
  'Recommended Path',
  'Select Path',
  'Generate Workspace',
];

export default function WizardShell({ step, children }) {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        {STEPS.map((label, i) => {
          const idx = i + 1;
          const active = idx === step;
          const done = idx < step;
          return (
            <div key={label} className="flex-1 flex items-center">
              <div className="flex flex-col items-center flex-shrink-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    done ? 'bg-green-500 text-white' : active ? 'bg-[#0F1E3C] text-white' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {done ? <Check className="w-4 h-4" /> : idx}
                </div>
                <span className={`mt-1.5 text-[10px] text-center leading-tight w-20 ${active ? 'text-slate-800 font-semibold' : 'text-slate-400'}`}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 ${done ? 'bg-green-400' : 'bg-slate-200'}`} />
              )}
            </div>
          );
        })}
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-6">{children}</div>
    </div>
  );
}