import { familyProgress } from '@/lib/controlStatus';

// Horizontal bars showing MET / total controls per NIST 800-171 family.
export default function FamilyProgressBars({ assessments }) {
  const families = familyProgress(assessments);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="text-sm font-semibold text-slate-800 mb-3">Progress by Control Family</h3>
      {families.length === 0 ? (
        <p className="text-xs text-slate-400 py-8 text-center">No controls tracked yet.</p>
      ) : (
        <div className="space-y-2.5">
          {families.map((f) => {
            const pct = f.total ? Math.round((f.met / f.total) * 100) : 0;
            return (
              <div key={f.code} className="flex items-center gap-3">
                <div className="w-8 text-xs font-bold text-slate-700 flex-shrink-0" title={f.name}>{f.code}</div>
                <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full bg-[#0F1E3C] transition-all" style={{ width: `${pct}%` }} />
                </div>
                <div className="w-16 text-[11px] text-slate-500 text-right flex-shrink-0">{f.met}/{f.total}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}