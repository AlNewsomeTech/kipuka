import { FileText, RefreshCw, Loader2, GitBranch, AlertCircle, CheckCircle2, FileWarning, Copy } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';

export default function DocumentCard({ spec, doc, generating, onGenerate, onNewVersion, onOpen }) {
  const blockers = doc?.readiness_blockers ? doc.readiness_blockers.split(' | ').filter(Boolean) : [];
  const phCount = doc?.unresolved_placeholders_count || 0;
  const waived = doc?.placeholder_waived;

  return (
    <div className={`bg-white rounded-xl border p-4 ${doc?.is_duplicate ? 'border-purple-300' : (phCount > 0 && !waived) ? 'border-orange-300' : doc ? 'border-slate-200' : 'border-dashed border-slate-300'}`}>
      <div className="flex items-start justify-between mb-1.5 gap-2">
        <h4 className="text-sm font-medium text-slate-800 leading-snug">{spec.name}</h4>
        {doc ? <StatusBadge status={doc.status} size="xs" /> : <span className="text-[10px] text-slate-400 flex-shrink-0">Not Generated</span>}
      </div>
      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{spec.category}</span>
        {spec.package && <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Package Required</span>}
        {doc && <span className="text-[10px] text-slate-400">v{doc.version}</span>}
      </div>

      {doc && (
        <div className="space-y-1 mb-2">
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-slate-400">Completeness</span>
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden"><div className={`h-1.5 rounded-full ${doc.completeness_score >= 80 ? 'bg-green-500' : doc.completeness_score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${doc.completeness_score || 0}%` }} /></div>
            <span className="text-slate-500 font-medium">{doc.completeness_score || 0}%</span>
          </div>
          {doc.is_duplicate && <div className="text-[10px] text-purple-600 flex items-center gap-1"><Copy className="w-3 h-3" /> Duplicate detected</div>}
          {phCount > 0 && !waived && <div className="text-[10px] text-orange-600 flex items-center gap-1"><FileWarning className="w-3 h-3" /> {phCount} placeholder(s)</div>}
          {doc.client_mismatch_warning && <div className="text-[10px] text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {doc.client_mismatch_warning}</div>}
          {blockers.length === 0 && phCount === 0 && <div className="text-[10px] text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> No blockers</div>}
          {doc.gap_count > 0 && <div className="text-[10px] text-amber-600">{doc.gap_count} source gap(s)</div>}
        </div>
      )}

      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
        <button onClick={onGenerate} disabled={generating} className="text-xs text-blue-600 hover:underline flex items-center gap-1 disabled:opacity-50">
          {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} {doc ? 'Regenerate' : 'Generate'}
        </button>
        {doc && <button onClick={onNewVersion} disabled={generating} className="text-xs text-slate-500 hover:underline flex items-center gap-1"><GitBranch className="w-3 h-3" /> New Version</button>}
        {doc && <button onClick={onOpen} className="text-xs text-slate-600 hover:underline ml-auto flex items-center gap-1"><FileText className="w-3 h-3" /> Open</button>}
      </div>
    </div>
  );
}