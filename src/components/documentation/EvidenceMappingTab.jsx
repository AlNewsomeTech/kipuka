import { Link2, CheckCircle2, XCircle } from 'lucide-react';

export default function EvidenceMappingTab({ synthesis }) {
  const checklist = synthesis.section_checklist || [];

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-xs text-blue-800">
          <strong>Evidence Mapping:</strong> Each SSP section is mapped to its source entities. Sections with no source records are flagged as gaps — the SSP will show "Not documented in app yet" for those sections.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left font-semibold text-slate-600 px-4 py-2.5">SSP Section</th>
              <th className="text-left font-semibold text-slate-600 px-4 py-2.5">Category</th>
              <th className="text-left font-semibold text-slate-600 px-4 py-2.5">Source Entities</th>
              <th className="text-center font-semibold text-slate-600 px-4 py-2.5">Records</th>
              <th className="text-left font-semibold text-slate-600 px-4 py-2.5">Missing</th>
              <th className="text-center font-semibold text-slate-600 px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {checklist.map((s, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="px-4 py-2.5 font-medium text-slate-700">{s.section_name}</td>
                <td className="px-4 py-2.5 text-slate-500">{s.category}</td>
                <td className="px-4 py-2.5 text-slate-500 font-mono text-[10px]">{s.source_entities}</td>
                <td className="px-4 py-2.5 text-center font-medium text-slate-700">{s.source_count}</td>
                <td className="px-4 py-2.5 text-slate-500">{s.missing || '—'}</td>
                <td className="px-4 py-2.5 text-center">
                  {s.status === 'Complete' ? (
                    <span className="inline-flex items-center gap-1 text-green-600"><CheckCircle2 className="w-3.5 h-3.5" /> Complete</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-red-600"><XCircle className="w-3.5 h-3.5" /> Gap</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}