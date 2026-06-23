import { useState, useEffect } from 'react';
import { ListChecks, Search, AlertCircle, Filter } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useClient } from '@/lib/clientContext';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';

const evidenceTypes = ['Screenshot', 'Export', 'Report', 'Policy', 'Narrative', 'Validation', 'Other'];
const sourceSystems = ['Microsoft 365', 'Entra ID', 'SharePoint', 'Exchange', 'Defender', 'Purview', 'Intune', 'NinjaOne', 'Physical Security', 'Other'];

export default function EvidenceIndex() {
  const { selectedClientId, selectedClient } = useClient();
  const [items, setItems] = useState([]);
  const [screenshots, setScreenshots] = useState([]);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ control: 'all', system: 'all', type: 'all', review: 'all', filename: 'all', package: 'all' });

  const load = () => {
    if (!selectedClientId) return;
    base44.entities.EvidenceItem.filter({ client_id: selectedClientId }).then(setItems).catch(() => {});
    base44.entities.Screenshot.filter({ client_id: selectedClientId }).then(setScreenshots).catch(() => {});
  };
  useEffect(load, [selectedClientId]);

  // Combine evidence items and screenshots into unified index
  const allEvidence = [
    ...items.map(e => ({ id: e.id, source: 'evidence', control_id: e.control_id, title: e.evidence_title, type: e.evidence_type, system: e.source_system, file_name: e.file_name, folder_path: e.folder_path, upload_date: e.upload_date, captured_by: e.captured_by, reviewed_by: e.reviewed_by, reviewer_status: e.reviewer_status, include_in_final_package: e.include_in_final_package, notes: e.notes })),
    ...screenshots.map(s => ({ id: s.id, source: 'screenshot', control_id: s.related_control, title: s.description || s.actual_file_name || 'Screenshot', type: 'Screenshot', system: s.related_system, file_name: s.actual_file_name, folder_path: '', upload_date: s.screenshot_date, captured_by: s.captured_by, reviewed_by: '', reviewer_status: s.reviewer_status, include_in_final_package: s.include_in_final_package, notes: s.notes })),
  ];

  const filtered = allEvidence.filter(e => {
    const ms = !search || e.title?.toLowerCase().includes(search.toLowerCase()) || e.file_name?.toLowerCase().includes(search.toLowerCase()) || e.control_id?.toLowerCase().includes(search.toLowerCase());
    const mc = filters.control === 'all' || e.control_id === filters.control;
    const msys = filters.system === 'all' || e.system === filters.system;
    const mt = filters.type === 'all' || e.type === filters.type;
    const mr = filters.review === 'all' || (filters.review === 'missing' && e.reviewer_status === 'Not Reviewed') || (filters.review === 'reviewed' && e.reviewer_status !== 'Not Reviewed');
    const mf = filters.filename === 'all' || (filters.filename === 'missing' && !e.file_name);
    const mp = filters.package === 'all' || (filters.package === 'included' && e.include_in_final_package) || (filters.package === 'excluded' && !e.include_in_final_package);
    return ms && mc && msys && mt && mr && mf && mp;
  });

  const missingReview = allEvidence.filter(e => e.reviewer_status === 'Not Reviewed').length;
  const missingFilename = allEvidence.filter(e => !e.file_name).length;
  const missingControl = allEvidence.filter(e => !e.control_id).length;

  if (!selectedClient) return <EmptyState icon={ListChecks} title="No client selected" description="Select a client to view the evidence index." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Evidence Index</h1>
        <p className="text-sm text-slate-500 mt-1">Auto-populated index of all uploaded evidence mapped to controls</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4"><div className="text-xs text-slate-500">Total Evidence</div><div className="text-2xl font-bold text-slate-800">{allEvidence.length}</div></div>
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4"><div className="text-xs text-amber-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Missing Review</div><div className="text-2xl font-bold text-amber-800">{missingReview}</div></div>
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4"><div className="text-xs text-amber-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Missing File Name</div><div className="text-2xl font-bold text-amber-800">{missingFilename}</div></div>
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4"><div className="text-xs text-amber-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> No Control Mapped</div><div className="text-2xl font-bold text-amber-800">{missingControl}</div></div>
      </div>

      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input placeholder="Search evidence..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
        </div>
        <select value={filters.system} onChange={e => setFilters({...filters, system: e.target.value})} className="px-3 py-2 text-sm border border-slate-200 rounded-lg">
          <option value="all">All Systems</option>{sourceSystems.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filters.type} onChange={e => setFilters({...filters, type: e.target.value})} className="px-3 py-2 text-sm border border-slate-200 rounded-lg">
          <option value="all">All Types</option>{evidenceTypes.map(t => <option key={t}>{t}</option>)}
        </select>
        <select value={filters.review} onChange={e => setFilters({...filters, review: e.target.value})} className="px-3 py-2 text-sm border border-slate-200 rounded-lg">
          <option value="all">All Reviews</option><option value="missing">Missing Review</option><option value="reviewed">Reviewed</option>
        </select>
        <select value={filters.package} onChange={e => setFilters({...filters, package: e.target.value})} className="px-3 py-2 text-sm border border-slate-200 rounded-lg">
          <option value="all">All Package</option><option value="included">Included</option><option value="excluded">Excluded</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Title</th>
              <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3 hidden md:table-cell">Control</th>
              <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3 hidden lg:table-cell">System</th>
              <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3 hidden lg:table-cell">Type</th>
              <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3 hidden xl:table-cell">File Name</th>
              <th className="text-left text-xs font-semibold text-slate-600 px-4 py-3">Review</th>
              <th className="text-center text-xs font-semibold text-slate-600 px-4 py-3">Pkg</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(e => (
              <tr key={e.source + e.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm text-slate-700 max-w-[200px] truncate">{e.title || '—'}</td>
                <td className="px-4 py-3 hidden md:table-cell">{e.control_id ? <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{e.control_id}</span> : <span className="text-xs text-amber-600">Unmapped</span>}</td>
                <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-500">{e.system || '—'}</td>
                <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-500">{e.type}</td>
                <td className="px-4 py-3 hidden xl:table-cell text-xs font-mono text-slate-500 max-w-[180px] truncate">{e.file_name || <span className="text-amber-600">Missing</span>}</td>
                <td className="px-4 py-3"><StatusBadge status={e.reviewer_status || 'Not Reviewed'} size="xs" /></td>
                <td className="px-4 py-3 text-center">{e.include_in_final_package ? '✅' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <EmptyState icon={ListChecks} title="No evidence found" description="Upload screenshots or add evidence items to populate the index." />}
      </div>
    </div>
  );
}