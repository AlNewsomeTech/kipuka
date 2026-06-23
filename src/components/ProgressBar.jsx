export default function ProgressBar({ value, label, color = 'blue', size = 'md' }) {
  const colorMap = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    navy: 'bg-[#0F1E3C]',
  };
  const heightClass = size === 'sm' ? 'h-1.5' : 'h-2.5';
  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-medium text-slate-600">{label}</span>
          <span className="text-xs font-bold text-slate-800">{Math.round(value)}%</span>
        </div>
      )}
      <div className={`w-full ${heightClass} bg-slate-100 rounded-full overflow-hidden`}>
        <div
          className={`${heightClass} ${colorMap[color] || colorMap.blue} rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}