import { FileText, Image, Table, FileWarning } from 'lucide-react';

const KIND_ICON = { document: FileText, evidence: FileWarning, screenshot: Image, table: Table };

export default function PackageFileList({ files }) {
  if (!files || files.length === 0) {
    return <div className="bg-white rounded-xl border border-slate-200 p-6 text-sm text-slate-500">No files match the current export mode and filters.</div>;
  }
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden max-h-[420px] overflow-y-auto">
      <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 sticky top-0">
        <h3 className="text-sm font-semibold text-slate-800">Included Files ({files.length})</h3>
      </div>
      <div className="divide-y divide-slate-100">
        {files.map((f, i) => {
          const Icon = KIND_ICON[f.kind] || FileText;
          return (
            <div key={i} className="flex items-start gap-2.5 p-3">
              <Icon className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-mono text-slate-700 break-all">{f.name}</div>
                <div className="text-[10px] text-slate-400 break-all">{f.path}</div>
                {f.blocker_reason && <div className="text-[10px] text-amber-600 mt-0.5">⚠ {f.blocker_reason}</div>}
              </div>
              {f.control_id && <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded flex-shrink-0">{f.control_id}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}