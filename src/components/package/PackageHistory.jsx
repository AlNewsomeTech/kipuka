import { Package, Download, FileText, ScrollText } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';

export default function PackageHistory({ exports }) {
  if (!exports || exports.length === 0) return null;
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="text-sm font-semibold text-slate-800 mb-3">Export History</h3>
      <div className="space-y-2">
        {exports.map(p => (
          <div key={p.id} className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
            <Package className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-slate-700 truncate">{p.root_folder_name || p.package_name}</div>
              <div className="text-[10px] text-slate-400">
                v{p.package_version} · {p.export_mode} · {p.included_file_count} files · {p.included_folder_count} folders · {p.generated_date}
              </div>
            </div>
            <StatusBadge status={p.assessment_ready ? 'Complete' : 'Draft'} size="xs" />
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {p.readme_url && <a href={p.readme_url} target="_blank" rel="noopener noreferrer" title="README" className="p-1.5 rounded hover:bg-slate-100"><FileText className="w-3.5 h-3.5 text-slate-500" /></a>}
              {p.changelog_url && <a href={p.changelog_url} target="_blank" rel="noopener noreferrer" title="Change Log" className="p-1.5 rounded hover:bg-slate-100"><ScrollText className="w-3.5 h-3.5 text-slate-500" /></a>}
              {p.zip_file_url && <a href={p.zip_file_url} target="_blank" rel="noopener noreferrer" title="Download ZIP" className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"><Download className="w-3.5 h-3.5" /> ZIP</a>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}