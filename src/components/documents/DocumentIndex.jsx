import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import { FileText, Download, Search } from 'lucide-react';

const CATEGORY_OPTIONS = ['all', 'Scope Statement', 'Data Flow', 'Boundary Description', 'Service Provider Matrix', 'Control Matrix', 'Policy', 'Procedure', 'User Inventory', 'Device Inventory', 'System Component Inventory', 'Evidence Index', 'Screenshot Log', 'Gap Report', 'POAM', 'Risk Register', 'Training Summary', 'Self-Assessment', 'Attestation', 'Assessment Summary', 'Readiness Report', 'Handoff Index', 'Cover Sheet'];
const STATUS_OPTIONS = ['all', 'Draft', 'In Review', 'Changes Requested', 'Approved', 'Published', 'Superseded', 'Archived'];

export default function DocumentIndex({ client, docs, onOpen, onChanged }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [pkgOnly, setPkgOnly] = useState(false);
  const [hasIssues, setHasIssues] = useState(false);

  const filtered = docs.filter(d => {
    if (search && !d.title?.toLowerCase().includes(search.toLowerCase())) return false;
    if (category !== 'all' && d.document_category !== category) return false;
    if (status !== 'all' && d.status !== status) return false;
    if (pkgOnly && !d.include_in_final_package) return false;
    if (hasIssues && !((d.unresolved_placeholders_count || 0) > 0 || d.is_duplicate || d.client_mismatch_warning || (d.gap_count || 0) > 0)) return false;
    return true;
  });

  const togglePackage = async (d) => {
    await base44.entities.GeneratedDocument.update(d.id, { include_in_final_package: !d.include_in_final_package });
    onChanged();
  };

  const exportIndex = () => {
    const rows = [['Title', 'Category', 'Level', 'Version', 'Status', 'Owner', 'Approval Date', 'Pkg Required', 'In Package', 'Completeness', 'Gaps', 'Generated']];
    filtered.forEach(d => rows.push([d.title, d.document_category, d.cmmc_level, d.version, d.status, d.owner || '', d.approval_date || '', d.final_package_required ? 'Yes' : 'No', d.include_in_final_package ? 'Yes' : 'No', (d.completeness_score || 0) + '%', d.gap_count || 0, d.generated_date || '']));
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${client.legal_name.replace(/[^a-zA-Z0-9]/g, '_')}_Document_Index.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
        </div>
        <select value={category} onChange={e => setCategory(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg">{CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c === 'all' ? 'All Categories' : c}</option>)}</select>
        <select value={status} onChange={e => setStatus(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg">{STATUS_OPTIONS.map(s => <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s}</option>)}</select>
        <button onClick={exportIndex} className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-[#0F1E3C] text-white hover:bg-[#1E2D4A]"><Download className="w-4 h-4" /> Export Index</button>
      </div>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer"><input type="checkbox" checked={pkgOnly} onChange={e => setPkgOnly(e.target.checked)} className="w-3.5 h-3.5 rounded" /> In final package</label>
        <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer"><input type="checkbox" checked={hasIssues} onChange={e => setHasIssues(e.target.checked)} className="w-3.5 h-3.5 rounded" /> Has issues</label>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={FileText} title="No documents" description="Generate documents in the Builder tab." />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Document', 'Category', 'Level', 'Ver', 'Status', 'Complete', 'Pkg', 'Generated'].map(h => <th key={h} className="text-left text-xs font-semibold text-slate-600 px-4 py-3">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(d => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3"><button onClick={() => onOpen(d)} className="text-sm font-medium text-blue-600 hover:underline text-left">{d.title}</button>
                    {(d.unresolved_placeholders_count > 0 || d.is_duplicate || d.client_mismatch_warning) && <div className="text-[10px] text-orange-600">⚠ {d.is_duplicate ? 'duplicate' : ''}{d.client_mismatch_warning ? ' mismatch' : ''}{d.unresolved_placeholders_count > 0 ? ` ${d.unresolved_placeholders_count} placeholders` : ''}</div>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{d.document_category}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{d.cmmc_level}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">v{d.version}</td>
                  <td className="px-4 py-3"><StatusBadge status={d.status} size="xs" /></td>
                  <td className="px-4 py-3 text-xs text-slate-600">{d.completeness_score || 0}%</td>
                  <td className="px-4 py-3"><input type="checkbox" checked={d.include_in_final_package || false} onChange={() => togglePackage(d)} className="w-3.5 h-3.5 rounded" /></td>
                  <td className="px-4 py-3 text-xs text-slate-400">{d.generated_date || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}