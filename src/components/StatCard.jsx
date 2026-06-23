export default function StatCard({ icon: Icon, label, value, sublabel, color = 'navy', onClick }) {
  const colorMap = {
    navy: { bg: 'bg-[#0F1E3C]', text: 'text-white', iconBg: 'bg-white/10', iconText: 'text-white' },
    white: { bg: 'bg-white', text: 'text-slate-800', iconBg: 'bg-slate-100', iconText: 'text-slate-600' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-900', iconBg: 'bg-blue-100', iconText: 'text-blue-600' },
    green: { bg: 'bg-green-50', text: 'text-green-900', iconBg: 'bg-green-100', iconText: 'text-green-600' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-900', iconBg: 'bg-amber-100', iconText: 'text-amber-600' },
    red: { bg: 'bg-red-50', text: 'text-red-900', iconBg: 'bg-red-100', iconText: 'text-red-600' },
  };
  const c = colorMap[color] || colorMap.white;
  return (
    <div
      onClick={onClick}
      className={`${c.bg} ${c.text} rounded-xl border border-slate-200/60 p-4 shadow-sm ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium opacity-80">{label}</span>
        {Icon && (
          <div className={`w-8 h-8 rounded-lg ${c.iconBg} flex items-center justify-center`}>
            <Icon className={`w-4 h-4 ${c.iconText}`} />
          </div>
        )}
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {sublabel && <div className="text-xs opacity-70 mt-1">{sublabel}</div>}
    </div>
  );
}