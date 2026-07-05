import { Gauge } from 'lucide-react';
import { SPRS_MAX, SPRS_FLOOR } from '@/lib/sprsScoring';

// Semicircular SPRS gauge from -203 to 110. Shows the current score prominently
// and the projected score (if all in-progress controls complete).
export default function SprsScoreWidget({ sprs }) {
  const { current, projected, met, notMet, inProgress, total } = sprs;

  const range = SPRS_MAX - SPRS_FLOOR; // 313
  const toPct = (v) => Math.min(1, Math.max(0, (v - SPRS_FLOOR) / range));
  const curPct = toPct(current);
  const projPct = toPct(projected);

  // Semicircle geometry
  const r = 80;
  const cx = 100, cy = 100;
  const arc = (pct) => {
    const angle = Math.PI * (1 - pct); // 180°→0°
    return { x: cx + r * Math.cos(angle), y: cy - r * Math.sin(angle) };
  };
  const end = arc(curPct);
  const projEnd = arc(projPct);
  const large = 0;

  const scoreColor = current >= 88 ? '#16a34a' : current >= 0 ? '#d97706' : '#dc2626';

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-2 mb-1">
        <Gauge className="w-5 h-5 text-[#0F1E3C]" />
        <h3 className="text-sm font-semibold text-slate-800">SPRS Score</h3>
      </div>
      <p className="text-xs text-slate-500 mb-2">DoD Assessment Methodology (NIST SP 800-171). Perfect score 110, floor −203.</p>

      <div className="flex items-center justify-center">
        <svg viewBox="0 0 200 120" className="w-full max-w-[280px]">
          {/* Track */}
          <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="#e2e8f0" strokeWidth="14" strokeLinecap="round" />
          {/* Projected (faint) */}
          <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 ${large} 1 ${projEnd.x} ${projEnd.y}`} fill="none" stroke="#c7d2fe" strokeWidth="14" strokeLinecap="round" />
          {/* Current */}
          <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`} fill="none" stroke={scoreColor} strokeWidth="14" strokeLinecap="round" />
          <text x={cx} y={cy - 18} textAnchor="middle" className="fill-slate-900" style={{ fontSize: '30px', fontWeight: 700 }}>{current}</text>
          <text x={cx} y={cy + 2} textAnchor="middle" className="fill-slate-400" style={{ fontSize: '10px' }}>of 110</text>
          <text x={cx - r} y={cy + 16} textAnchor="middle" className="fill-slate-400" style={{ fontSize: '9px' }}>−203</text>
          <text x={cx + r} y={cy + 16} textAnchor="middle" className="fill-slate-400" style={{ fontSize: '9px' }}>110</text>
        </svg>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-2">
        <div className="rounded-lg bg-indigo-50 px-3 py-2">
          <div className="text-[11px] text-indigo-700 font-medium">Projected</div>
          <div className="text-lg font-bold text-indigo-700">{projected}</div>
          <div className="text-[10px] text-slate-500">if in-progress controls complete</div>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <div className="text-[11px] text-slate-600 font-medium">Controls</div>
          <div className="text-xs text-slate-700 mt-1">
            <span className="font-bold text-green-700">{met}</span> met ·{' '}
            <span className="font-bold text-amber-700">{inProgress}</span> in progress ·{' '}
            <span className="font-bold text-red-700">{notMet}</span> not met
          </div>
          <div className="text-[10px] text-slate-400">of {total} practices</div>
        </div>
      </div>
    </div>
  );
}