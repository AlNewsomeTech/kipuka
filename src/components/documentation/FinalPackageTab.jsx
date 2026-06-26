import { Package, CheckCircle2, XCircle, AlertCircle, FileText } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';

export default function FinalPackageTab({ synthesis, clientId }) {
  const fp = synthesis.final_package || {};
  const docs = fp.required_docs || [];
  const readyCount = fp.ready_count || 0;
  const totalCount = fp.total_count || 0;
  const readinessPct = totalCount > 0 ? Math.round((readyCount / totalCount) * 100) : 0;
  const blockers = fp.hard_blockers || [];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-[#0F1E3C]" />
            <h3 className="text-sm font-semibold text-slate-800">Final Package — {fp.level}</h3>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-slate-800">{readyCount}/{totalCount}</div>
            <div className="text-xs text-slate-500">documents ready</div>
          </div>
        </div>
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-2.5 bg-green-500 rounded-full transition-all duration-500" style={{ width: `${readinessPct}%` }} />
        </div>
        <div className="text-xs text-slate-500 mt-1.5">{readinessPct}% package readiness</div>
      </div>

      {blockers.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-red-800">Final package is blocked</p>
              <ul className="text-xs text-red-700 mt-1 space-y-0.5 list-disc pl-4">
                {blockers.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-xs text-amber-800">
          <strong>Guardrail:</strong> Documents with unresolved placeholders cannot be included in the final package unless explicitly waived. Core documents for the selected level default to <code className="text-[10px] bg-amber-100 px-1 rounded">include_in_final_package = true</code> when generated.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-800">Required Documents for {fp.level}</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {docs.map((d, i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              {d.present ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" /> : <XCircle className="w-4 h-4 text-slate-300 flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-700">{d.name}</div>
                <div className="text-[10px] text-slate-400">{d.category}</div>
              </div>
              {d.present ? (
                <div className="flex items-center gap-2">
                  {d.has_placeholders && <span className="flex items-center gap-1 text-[10px] text-orange-600"><AlertCircle className="w-3 h-3" /> Placeholders</span>}
                  <StatusBadge status={d.status} size="xs" />
                  <span className={`text-[10px] font-medium ${d.include_in_final_package ? 'text-green-600' : 'text-slate-400'}`}>
                    {d.include_in_final_package ? 'In Package' : 'Not Included'}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-slate-400">Missing</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}