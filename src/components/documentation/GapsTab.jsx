import { AlertTriangle, FileWarning, Copy, XCircle } from 'lucide-react';
import Callout from '@/components/ui/Callout';

const severityConfig = {
  Critical: { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200', badge: 'bg-red-100 text-red-800 border-red-200' },
  High: { bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-800 border-orange-200' },
  Medium: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-800 border-amber-200' },
  Low: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', badge: 'bg-slate-100 text-slate-700 border-slate-200' },
};

function SectionHeader({ icon: Icon, color, title, count }) {
  return (
    <h3 className="text-[17px] font-bold text-slate-900 mb-3 flex items-center gap-2">
      <Icon className={`w-5 h-5 ${color}`} /> {title}
      <span className="text-[14px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">{count}</span>
    </h3>
  );
}

export default function GapsTab({ synthesis }) {
  const { gaps, placeholders, duplicates, client_mismatches } = synthesis;

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Data Gaps */}
      <div>
        <SectionHeader icon={AlertTriangle} color="text-amber-500" title="Data Gaps" count={gaps.length} />
        {gaps.length === 0 ? (
          <Callout tone="success">No data gaps detected — all required SSP inputs are present.</Callout>
        ) : (
          <div className="space-y-2.5">
            {gaps.map((g, i) => {
              const cfg = severityConfig[g.severity] || severityConfig.Medium;
              return (
                <div key={i} className={`flex items-start gap-3 p-4 rounded-xl border ${cfg.bg} ${cfg.border}`}>
                  <span className={`text-[12px] font-bold px-2.5 py-1 rounded-full border ${cfg.badge} flex-shrink-0`}>{g.severity}</span>
                  <div className="min-w-0">
                    <div className="text-[15px] font-bold text-slate-900">{g.category}</div>
                    <div className="text-[14px] text-slate-700 leading-[1.55] mt-1">{g.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Placeholders */}
      <div>
        <SectionHeader icon={FileWarning} color="text-orange-500" title="Unresolved Placeholders" count={placeholders.length} />
        {placeholders.length === 0 ? (
          <Callout tone="success">No unresolved placeholders — all documents are ready for approval.</Callout>
        ) : (
          <div className="space-y-2.5">
            {placeholders.map((p, i) => (
              <div key={i} className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <div className="text-[15px] font-bold text-slate-900">{p.title} (v{p.version})</div>
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {p.placeholders.map((ph, j) => (
                    <span key={j} className="text-[13px] font-mono font-semibold bg-orange-100 text-orange-800 border border-orange-200 px-2 py-0.5 rounded">[{ph}]</span>
                  ))}
                </div>
                <div className="text-[13px] font-medium text-orange-700 mt-2.5 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 flex-shrink-0" /> Cannot be approved or included in final package until resolved or waived.</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Duplicates */}
      <div>
        <SectionHeader icon={Copy} color="text-purple-500" title="Duplicate Documents" count={duplicates.length} />
        {duplicates.length === 0 ? (
          <Callout tone="success">No duplicate documents detected.</Callout>
        ) : (
          <div className="space-y-2.5">
            {duplicates.map((d, i) => (
              <div key={i} className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <div className="text-[15px] font-bold text-slate-900">{d.title} (v{d.version})</div>
                <div className="text-[14px] text-purple-700 mt-1">Duplicate of: <span className="font-semibold">{d.duplicate_of_title}</span></div>
                <div className="text-[13px] text-slate-600 mt-1.5">Resolve in the Document Library tab: update existing, create new version, keep both, or delete.</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Client Mismatches */}
      <div>
        <SectionHeader icon={XCircle} color="text-red-500" title="Client Mismatches" count={client_mismatches.length} />
        {client_mismatches.length === 0 ? (
          <Callout tone="success">No client mismatches detected — all records reference the correct client.</Callout>
        ) : (
          <div className="space-y-2.5">
            {client_mismatches.map((m, i) => (
              <div key={i} className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="text-[15px]"><span className="font-bold text-red-700">{m.entity}</span> — field: <code className="text-[13px] bg-red-100 px-1.5 py-0.5 rounded">{m.field}</code></div>
                <div className="text-[14px] text-slate-700 mt-1.5 leading-[1.55]">References "{m.mismatched_name}" but client is "{m.expected_client}"</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}