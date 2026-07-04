import { Link } from 'react-router-dom';
import { PostureBadge } from './AcolyteBadges';

// A single posture status card used on the ACOLYTE Overview.
export default function PostureCard({ label, blurb, status, findingsTo, remediationTo }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-bold text-slate-800">{label}</h3>
        <PostureBadge status={status} />
      </div>
      <p className="text-[13px] leading-relaxed text-slate-500 flex-1">{blurb}</p>
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100 text-xs font-semibold">
        <Link to={findingsTo} className="text-blue-600 hover:underline">Findings</Link>
        <span className="text-slate-300">·</span>
        <Link to={remediationTo} className="text-blue-600 hover:underline">Remediation</Link>
      </div>
    </div>
  );
}