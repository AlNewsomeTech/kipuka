import { Star, Clock, Layers } from 'lucide-react';

export const STEP_LABELS = { 1: 'Understand', 2: 'Do', 3: 'Capture & Upload', 4: 'Verify' };

function StatCard({ icon: Icon, value, label }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 sm:px-5 sm:py-4 text-left">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
        <Icon className="w-3 h-3" />{label}
      </div>
      <div className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 tabular-nums">{value}</div>
    </div>
  );
}

// Editorial hero: identity and progress on the left, stat cards on the right.
// The sticky stepper lives in the page, just below this hero.
export default function GuidedHero({ libEntry, points, minutes, step, queuePosition, queueLength }) {
  return (
    <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
      <div className="max-w-2xl min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Guided implementation</span>
          <span className="text-xs font-mono font-semibold text-slate-500">{libEntry.control_id}</span>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{libEntry.domain}</span>
        </div>
        <h1 className="mt-3 text-3xl sm:text-[2.6rem] font-extrabold tracking-tight leading-[1.05] text-slate-900">
          {libEntry.control_title}
        </h1>
        <p className="mt-3 text-sm sm:text-base text-slate-500">Step {step} of 4 — {STEP_LABELS[step]}</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full lg:w-auto lg:min-w-[19rem]">
        <StatCard icon={Star} value={points} label={`SPRS ${points === 1 ? 'point' : 'points'}`} />
        <StatCard icon={Clock} value={`~${minutes}m`} label="Estimated time" />
        {queuePosition != null && <StatCard icon={Layers} value={`${queuePosition + 1}/${queueLength}`} label="In your queue" />}
      </div>
    </header>
  );
}