import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { bucketCounts, BUCKET_META } from '@/lib/controlStatus';

// Donut of control status buckets from ControlAssessment records.
export default function ControlStatusDonut({ assessments }) {
  const counts = bucketCounts(assessments);
  const data = Object.entries(BUCKET_META).map(([key, meta]) => ({
    name: meta.label, value: counts[key], color: meta.color,
  }));
  const total = assessments.length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="text-sm font-semibold text-slate-800 mb-1">Controls by Status</h3>
      <p className="text-xs text-slate-500 mb-3">{total} controls tracked on the active project.</p>
      {total === 0 ? (
        <p className="text-xs text-slate-400 py-8 text-center">No controls tracked yet.</p>
      ) : (
        <div className="flex items-center gap-4">
          <div className="w-36 h-36 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" innerRadius={40} outerRadius={64} paddingAngle={2} stroke="none">
                  {data.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [`${v} controls`, n]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-1.5">
            {data.map((d) => (
              <div key={d.name} className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                <span className="text-slate-600 flex-1">{d.name}</span>
                <span className="font-semibold text-slate-800">{d.value}</span>
                <span className="text-slate-400 w-9 text-right">{total ? Math.round((d.value / total) * 100) : 0}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}