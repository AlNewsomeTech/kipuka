import { Clock, Star } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import GuidedStepper from '@/components/guided/GuidedStepper';

const STEP_LABELS = { 1: 'Understand', 2: 'Do', 3: 'Capture & Upload', 4: 'Verify' };

// Hero header for the guided walkthrough: control identity, badges, stepper,
// and a large label for the step the user is on.
export default function GuidedHero({ libEntry, points, minutes, step, completedSteps, onJump }) {
  const reduce = useReducedMotion();
  return (
    <header className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-semibold text-slate-500">{libEntry.control_id}</span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{libEntry.domain}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-2 leading-tight">{libEntry.control_title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700">
            <Star className="w-3.5 h-3.5" /> {points} SPRS {points === 1 ? 'point' : 'points'}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
            <Clock className="w-3.5 h-3.5" /> ~{minutes} min walkthrough
          </span>
        </div>
      </div>

      <div className="mt-6">
        <GuidedStepper current={step} completedSteps={completedSteps} onJump={onJump} />
      </div>

      <motion.div
        key={step}
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="mt-6 pt-5 border-t border-slate-200 flex items-baseline gap-3 flex-wrap"
      >
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Step {step} of 4</span>
        <span className="text-xl font-bold text-slate-900">{STEP_LABELS[step]}</span>
      </motion.div>
    </header>
  );
}