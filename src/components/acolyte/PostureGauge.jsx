import { scoreBand } from '@/lib/postureAssessment';

// Circular 0-100 posture gauge with red/amber/green banding.
export default function PostureGauge({ score, size = 128 }) {
  const s = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
  const band = scoreBand(s);
  const stroke = 3;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 36 36" className="-rotate-90" style={{ width: size, height: size }}>
        <circle cx="18" cy="18" r="15.9" fill="none" className="stroke-slate-100" strokeWidth={stroke} />
        <circle cx="18" cy="18" r="15.9" fill="none" stroke={band.color} strokeWidth={stroke}
          strokeDasharray={`${s} 100`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-slate-900">{s}</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: band.color }}>{band.label}</span>
      </div>
    </div>
  );
}