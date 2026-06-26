import { AlertTriangle, FileWarning, Copy, XCircle, CheckCircle2 } from 'lucide-react';

const severityConfig = {
  Critical: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  High: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  Medium: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  Low: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' },
};

export default function GapsTab({ synthesis }) {
  const { gaps, placeholders, duplicates, client_mismatches } = synthesis;

  return (
    <div className="space-y-6">
      {/* Data Gaps */}
      <div>
        <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" /> Data Gaps ({gaps.length})
        </h3>
        {gaps.length === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span className="text-sm text-green-700">No data gaps detected — all required SSP inputs are present.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {gaps.map((g, i) => {
              const cfg = severityConfig[g.severity] || severityConfig.Medium;
              return (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${cfg.bg} ${cfg.border}`}>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text} border ${cfg.border} flex-shrink-0`}>{g.severity}</span>
                  <div>
                    <div className="text-xs font-semibold text-slate-700">{g.category}</div>
                    <div className="text-xs text-slate-600 mt-0.5">{g.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Placeholders */}
      <div>
        <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <FileWarning className="w-4 h-4 text-orange-500" /> Unresolved Placeholders ({placeholders.length})
        </h3>
        {placeholders.length === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span className="text-sm text-green-700">No unresolved placeholders — all documents are ready for approval.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {placeholders.map((p, i) => (
              <div key={i} className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <div className="text-xs font-semibold text-slate-700">{p.title} (v{p.version})</div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {p.placeholders.map((ph, j) => (
                    <span key={j} className="text-[10px] font-mono bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded">[{ph}]</span>
                  ))}
                </div>
                <div className="text-[10px] text-orange-700 mt-1.5">⚠ Cannot be approved or included in final package until resolved or waived.</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Duplicates */}
      <div>
        <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <Copy className="w-4 h-4 text-purple-500" /> Duplicate Documents ({duplicates.length})
        </h3>
        {duplicates.length === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span className="text-sm text-green-700">No duplicate documents detected.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {duplicates.map((d, i) => (
              <div key={i} className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <div className="text-xs font-semibold text-slate-700">{d.title} (v{d.version})</div>
                <div className="text-[10px] text-purple-700 mt-0.5">Duplicate of: {d.duplicate_of_title}</div>
                <div className="text-[10px] text-slate-500 mt-1">Resolve in the Document Library tab: update existing, create new version, keep both, or delete.</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Client Mismatches */}
      <div>
        <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <XCircle className="w-4 h-4 text-red-500" /> Client Mismatches ({client_mismatches.length})
        </h3>
        {client_mismatches.length === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span className="text-sm text-green-700">No client mismatches detected — all records reference the correct client.</span>
          </div>
        ) : (
          <div className="space-y-2">
            {client_mismatches.map((m, i) => (
              <div key={i} className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="text-xs"><span className="font-semibold text-red-700">{m.entity}</span> — field: <code className="text-[10px] bg-red-100 px-1 rounded">{m.field}</code></div>
                <div className="text-[10px] text-slate-600 mt-1">References "{m.mismatched_name}" but client is "{m.expected_client}"</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}