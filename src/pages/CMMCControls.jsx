import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Search, Filter } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import StatusBadge from '@/components/StatusBadge';
import ProgressBar from '@/components/ProgressBar';
import EmptyState from '@/components/EmptyState';

export default function CMMCControls() {
  const [controls, setControls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [familyFilter, setFamilyFilter] = useState('all');

  useEffect(() => {
    base44.entities.CMMCControl.filter({ level: 'Level 1' })
      .then(setControls)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const families = [...new Set(controls.map(c => c.control_family))];
  const filtered = controls.filter(c => {
    const matchSearch = !search || c.control_id.toLowerCase().includes(search.toLowerCase()) || c.control_title.toLowerCase().includes(search.toLowerCase());
    const matchFamily = familyFilter === 'all' || c.control_family === familyFilter;
    return matchSearch && matchFamily;
  });

  const complete = controls.filter(c => c.status === 'Complete' || c.ready_for_assessment).length;
  const pct = controls.length ? (complete / controls.length) * 100 : 0;

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-[#0F1E3C] rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">CMMC Level 1 Controls</h1>
        <p className="text-sm text-slate-500 mt-1">All 18 Level 1 controls — complete these first before Level 2</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <ProgressBar value={pct} label="Level 1 Completion" color="green" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            placeholder="Search controls..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>
        <select value={familyFilter} onChange={e => setFamilyFilter(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30">
          <option value="all">All Families</option>
          {families.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      {/* Control table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Control ID</th>
              <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3 hidden md:table-cell">Title</th>
              <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3 hidden lg:table-cell">Family</th>
              <th className="text-center text-xs font-semibold text-slate-600 px-4 py-3">Evidence</th>
              <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Status</th>
              <th className="text-center text-xs font-semibold text-slate-600 px-4 py-3">Ready</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => window.location.href = `/controls/${c.id}`}>
                <td className="px-4 py-3"><Link to={`/controls/${c.id}`} className="text-sm font-mono font-medium text-blue-600 hover:underline" onClick={e => e.stopPropagation()}>{c.control_id}</Link></td>
                <td className="px-4 py-3 hidden md:table-cell text-sm text-slate-700">{c.control_title}</td>
                <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-500">{c.control_family}</td>
                <td className="px-4 py-3 text-center text-sm text-slate-600">{c.evidence_count || 0}</td>
                <td className="px-4 py-3"><StatusBadge status={c.status} size="xs" /></td>
                <td className="px-4 py-3 text-center">{c.ready_for_assessment ? '✅' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <EmptyState icon={ShieldCheck} title="No controls found" description="Try adjusting your search or filters." />}
      </div>
    </div>
  );
}