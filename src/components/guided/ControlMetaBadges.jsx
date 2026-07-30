import { Clock, Award } from 'lucide-react';

// Small SPRS-point + time-estimate badges, reused in the queue and walkthrough header.
export default function ControlMetaBadges({ points, minutes, size = 'sm' }) {
  const txt = size === 'xs' ? 'text-[10px] px-1.5 py-0.5' : 'text-[11px] px-2 py-0.5';
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-flex items-center gap-1 rounded-full font-semibold bg-blue-50 text-blue-700 ${txt}`}>
        <Award className="w-3 h-3" /> {points} pt{points !== 1 ? 's' : ''}
      </span>
      <span className={`inline-flex items-center gap-1 rounded-full font-semibold bg-slate-100 text-slate-600 ${txt}`}>
        <Clock className="w-3 h-3" /> ~{minutes} min walkthrough
      </span>
    </span>
  );
}