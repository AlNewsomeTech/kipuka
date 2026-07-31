// Shared, presentational primitives for the Phase 5 role dashboards.
export function DashCard({ title, icon: Icon, children, action = null }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-[#0F1E3C]" />}
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function StatTile({ icon: Icon, label, value, tone = 'slate' }) {
  const tones = {
    slate: 'text-slate-500', green: 'text-green-600', amber: 'text-amber-600',
    red: 'text-red-600', blue: 'text-blue-600', purple: 'text-purple-600',
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
        {Icon && <Icon className={`w-4 h-4 ${tones[tone]}`} />} {label}
      </div>
      <div className="text-2xl font-bold text-slate-800 mt-1.5">{value}</div>
    </div>
  );
}

export function MiniList({ items, empty }) {
  if (!items || items.length === 0) return <p className="text-sm text-slate-400">{empty}</p>;
  return (
    <div className="space-y-1.5">
      {items.map((it, i) => (
        <div key={i} className="flex items-center gap-2 text-sm text-slate-700">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 flex-shrink-0" />
          <span className="truncate">{it}</span>
        </div>
      ))}
    </div>
  );
}

export function BarRow({ label, done, total }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-600 mb-1">
        <span>{label}</span><span className="font-semibold">{done}/{total}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full bg-[#0F1E3C] rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}