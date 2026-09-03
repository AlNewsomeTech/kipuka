import { motion, useReducedMotion } from 'framer-motion';

// One numbered runbook step, rendered as a checkpoint card with single-action
// lines (ASD-STE100). The stored step number never changes — extra sentences
// become indented lines under the same number so cross-references stay correct.
export default function StepInstruction({ number, instructions, children }) {
  const reduce = useReducedMotion();
  const [first, ...rest] = instructions;

  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5"
    >
      <span className="w-9 flex-shrink-0 text-3xl font-black tabular-nums leading-none text-slate-300 select-none">
        {String(number).padStart(2, '0')}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] sm:text-base font-semibold text-slate-800 leading-snug">{first}</p>
        {rest.length > 0 && (
          <ul className="mt-2.5 space-y-2 border-l-2 border-slate-200 pl-3">
            {rest.map((line, i) => (
              <li key={i} className="text-sm leading-relaxed text-slate-600">{line}</li>
            ))}
          </ul>
        )}
        {children}
      </div>
    </motion.li>
  );
}