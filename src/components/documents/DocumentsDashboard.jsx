import { useMemo } from 'react';
import { applicableDocuments } from '@/lib/documentCatalog';
import { FileText, CheckCircle2, FileWarning, Copy, AlertCircle, Package, FileEdit, ShieldCheck } from 'lucide-react';

function Card({ label, value, icon: Icon, color }) {
  const map = { green: 'text-green-600', amber: 'text-amber-600', red: 'text-red-600', blue: 'text-blue-600', purple: 'text-purple-600', navy: 'text-[#0F1E3C]' };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-1.5"><span className="text-xs font-medium text-slate-500">{label}</span><Icon className={`w-4 h-4 ${map[color] || map.blue}`} /></div>
      <div className={`text-2xl font-bold ${map[color] || map.blue}`}>{value}</div>
    </div>
  );
}

export default function DocumentsDashboard({ client, docs }) {
  const specs = useMemo(() => applicableDocuments(client), [client]);
  const active = docs.filter(d => d.status !== 'Superseded' && d.status !== 'Archived');
  const docByType = {};
  active.forEach(d => { if (d.document_type) docByType[d.document_type] = d; });

  const requiredSpecs = specs.filter(s => s.package);
  const generated = active.length;
  const approved = active.filter(d => d.status === 'Approved' || d.status === 'Published').length;
  const drafts = active.filter(d => d.status === 'Draft').length;
  const withPH = active.filter(d => (d.unresolved_placeholders_count || 0) > 0 && !d.placeholder_waived).length;
  const dupes = active.filter(d => d.is_duplicate).length;
  const gaps = active.filter(d => (d.gap_count || 0) > 0).length;
  const mismatches = active.filter(d => d.client_mismatch_warning).length;
  const inPackage = active.filter(d => d.include_in_final_package).length;
  const requiredReady = requiredSpecs.filter(s => {
    const d = docByType[s.key];
    return d && (d.status === 'Approved' || d.status === 'Published') && (d.unresolved_placeholders_count || 0) === 0 && !d.is_duplicate;
  }).length;
  const packageReadiness = requiredSpecs.length ? Math.round((requiredReady / requiredSpecs.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <Card label="Required Documents" value={requiredSpecs.length} icon={ShieldCheck} color="navy" />
        <Card label="Generated" value={generated} icon={FileText} color="blue" />
        <Card label="Approved" value={approved} icon={CheckCircle2} color="green" />
        <Card label="Drafts" value={drafts} icon={FileEdit} color="amber" />
        <Card label="Unresolved Placeholders" value={withPH} icon={FileWarning} color={withPH ? 'red' : 'green'} />
        <Card label="Duplicate Conflicts" value={dupes} icon={Copy} color={dupes ? 'purple' : 'green'} />
        <Card label="Source Gaps" value={gaps} icon={AlertCircle} color={gaps ? 'amber' : 'green'} />
        <Card label="Client Mismatches" value={mismatches} icon={AlertCircle} color={mismatches ? 'red' : 'green'} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2"><Package className="w-5 h-5 text-[#0F1E3C]" /><h3 className="text-sm font-semibold text-slate-800">Final Package Readiness</h3></div>
          <div className="text-right"><div className="text-2xl font-bold text-slate-800">{requiredReady}/{requiredSpecs.length}</div><div className="text-xs text-slate-500">required docs approved</div></div>
        </div>
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden"><div className="h-2.5 bg-green-500 rounded-full transition-all duration-500" style={{ width: `${packageReadiness}%` }} /></div>
        <div className="text-xs text-slate-500 mt-1.5">{packageReadiness}% • {inPackage} documents marked for inclusion</div>
        {packageReadiness < 100 && <div className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">Package is not complete: required documents must be generated, approved, placeholder-free, and free of duplicate/mismatch flags.</div>}
      </div>
    </div>
  );
}