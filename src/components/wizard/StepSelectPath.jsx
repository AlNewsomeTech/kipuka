import { PROJECT_PATH_OPTIONS } from '@/lib/cmmcDetermination';

export default function StepSelectPath({ recommendedPath, selected, onSelect }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-slate-900">Step 4 — Select your project path</h2>
      <p className="text-sm text-slate-500 mt-1 mb-5">
        Choose the path for this project. You can change direction later if contract requirements evolve.
      </p>
      <div className="space-y-2.5">
        {PROJECT_PATH_OPTIONS.map((opt) => {
          const isRec = opt.value.startsWith('CMMC Level 1') && recommendedPath === 'Level 1 Self-Assessment' ||
            opt.value === 'CMMC Level 2 Self-Assessment' && recommendedPath === 'Level 2 Self-Assessment' ||
            opt.value === 'CMMC Level 2 C3PAO Readiness' && recommendedPath === 'Level 2 C3PAO';
          const active = selected === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSelect(opt.value)}
              className={`w-full text-left rounded-xl border p-4 transition-all ${
                active ? 'border-[#0F1E3C] bg-slate-50 ring-2 ring-[#0F1E3C]/10' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-800">{opt.label}</span>
                {isRec && (
                  <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">Recommended</span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}