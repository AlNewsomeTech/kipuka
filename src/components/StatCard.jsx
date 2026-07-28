export default function StatCard({ icon: Icon, label, value, sublabel, color = 'navy', onClick }) {
  const colorMap = {
    navy: {
      card: 'bg-gradient-to-br from-[#0b1930] to-[#17365f] border-white/10 text-white',
      icon: 'bg-white/10 text-[#8fd0f2] ring-white/10',
      accent: 'bg-[#63b8e7]',
    },
    white: {
      card: 'app-surface text-slate-900',
      icon: 'bg-slate-100 text-slate-600 ring-slate-200',
      accent: 'bg-slate-300',
    },
    blue: {
      card: 'app-surface text-slate-900',
      icon: 'bg-blue-50 text-blue-600 ring-blue-100',
      accent: 'bg-[#479dcf]',
    },
    green: {
      card: 'app-surface text-slate-900',
      icon: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
      accent: 'bg-emerald-500',
    },
    amber: {
      card: 'app-surface text-slate-900',
      icon: 'bg-amber-50 text-amber-700 ring-amber-100',
      accent: 'bg-amber-500',
    },
    red: {
      card: 'app-surface text-slate-900',
      icon: 'bg-rose-50 text-rose-700 ring-rose-100',
      accent: 'bg-rose-500',
    },
  };
  const c = colorMap[color] || colorMap.white;
  const Element = onClick ? 'button' : 'div';

  return (
    <Element
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`relative w-full overflow-hidden rounded-2xl border p-4 text-left ${c.card} ${onClick ? 'app-surface-interactive cursor-pointer' : ''}`}
    >
      <span className={`absolute inset-x-0 top-0 h-0.5 ${c.accent}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.1em] opacity-60">{label}</div>
          <div className="metric-value mt-2 truncate text-2xl font-extrabold leading-none">{value}</div>
          {sublabel && <div className="mt-2 truncate text-xs font-medium opacity-60">{sublabel}</div>}
        </div>
        {Icon && (
          <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ring-1 ${c.icon}`}>
            <Icon className="h-[18px] w-[18px]" />
          </div>
        )}
      </div>
    </Element>
  );
}