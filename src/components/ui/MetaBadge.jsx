/**
 * Readable metadata badges for control cards — Level, Family, counts, readiness.
 * High-contrast, clearly labelled, never color-alone.
 */

const variants = {
  level1: 'bg-blue-100 text-blue-800 border-blue-200',
  level2: 'bg-purple-100 text-purple-800 border-purple-200',
  family: 'bg-slate-100 text-slate-700 border-slate-200',
  count: 'bg-slate-100 text-slate-700 border-slate-200',
  ready: 'bg-green-100 text-green-800 border-green-200',
  notReady: 'bg-slate-100 text-slate-600 border-slate-200',
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
};

export default function MetaBadge({ variant = 'neutral', icon: Icon, children }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[13px] font-semibold ${variants[variant] || variants.neutral}`}>
      {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0" />}
      {children}
    </span>
  );
}

export function LevelBadge({ level }) {
  const v = level === 'Level 2' ? 'level2' : 'level1';
  return <MetaBadge variant={v}>{level || 'Level 1'}</MetaBadge>;
}

export function CountBadge({ icon, label, value }) {
  return (
    <MetaBadge variant="count" icon={icon}>
      <span className="font-bold">{value ?? 0}</span>
      <span className="font-medium text-slate-500">{label}</span>
    </MetaBadge>
  );
}