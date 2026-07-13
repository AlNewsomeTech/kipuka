import { CheckCircle2, XCircle } from 'lucide-react';

export default function TraceabilityTab({ synthesis }) {
  const traceability = synthesis.traceability || [];

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-xs text-blue-800">
          <strong>Source Traceability:</strong> Every SSP section traces back to the entity records that fed it. This view shows what data was used, what was missing, and when it was last updated.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left font-semibold text-slate-600 px-4 py-2.5">SSP Section</th>
              <th className="text-left font-semibold text-slate-600 px-4 py-2.5">Source Entity</th>
              <th className="text-center font-semibold text-slate-600 px-4 py-2.5">Records Used</th>
              <th className="text-left font-semibold text-slate-600 px-4 py-2.5">Missing Records</th>
              <th className="text-center font-semibold text-slate-600 px-4 py-2.5">Status</th>
              <th className="text-left font-semibold text-slate-600 px-4 py-2.5">Last Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {traceability.map((t, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="px-4 py-2.5 font-medium text-slate-700">{t.section}</td>
                <td className="px-4 py-2.5 text-slate-500 font-mono text-[10px]">{t.source_entity}</td>
                <td className="px-4 py-2.5 text-center font-medium text-slate-700">{t.records_used}</td>
                <td className="px-4 py-2.5 text-slate-500">{t.missing_records || '—'}</td>
                <td className="px-4 py-2.5 text-center">
                  {t.status === 'Complete' ? (
                    <span className="inline-flex items-center gap-1 text-green-600"><CheckCircle2 className="w-3.5 h-3.5" /></span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-red-600"><XCircle className="w-3.5 h-3.5" /></span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-slate-400">{t.last_updated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}