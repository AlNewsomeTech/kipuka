import { motion, useReducedMotion } from 'framer-motion';

// Bullet / numbered list with a staggered slide-in. Items are rendered as given.
export default function GuideList({ items, ordered = false, textClass = 'text-slate-700', markerClass = 'bg-slate-100 text-slate-600', className = '' }) {
  const reduce = useReducedMotion();
  const Tag = ordered ? 'ol' : 'ul';
  return (
    <Tag className={`space-y-2.5 ${className}`}>
      {items.map((item, i) => (
        <motion.li
          key={i}
          initial={reduce ? false : { opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 + i * 0.05, duration: 0.35, ease: 'easeOut' }}
          className={`flex gap-3 text-[15px] leading-relaxed ${textClass}`}
        >
          <span className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${markerClass}`}>
            {ordered ? i + 1 : '•'}
          </span>
          <span className="min-w-0">{item}</span>
        </motion.li>
      ))}
    </Tag>
  );
}