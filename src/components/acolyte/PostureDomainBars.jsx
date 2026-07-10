import { POSTURE_DOMAINS, scoreBand } from '@/lib/postureAssessment';

// Per-domain horizontal bar breakdown for a posture assessment's domain_scores.
export default function PostureDomainBars({ domainScores }) {
  const ds = domainScores || {};
  return (
    <div className="space-y-2.5">
      {POSTURE_DOMAINS.map((d) => {
        const entry = ds[d.key];
        const na = entry && entry.applicable === 0;
        const s = na ? 0 : (entry?.score ?? 0);
        const band = scoreBand(s);
        return (
          <div key={d.key}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-600">{d.label} <span className="text-slate-400">· wt {d.weight}</span></span>
              <span className="font-semibold text-slate-700">{na ? 'N/A' : `${s}%`}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${na ? 0 : s}%`, backgroundColor: band.color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}