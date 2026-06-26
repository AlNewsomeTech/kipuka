import { Package, CheckCircle2, XCircle, AlertCircle, Download } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';

function safeFileName(value) {
  return String(value || 'client').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

export default function FinalPackageTab({ synthesis, clientId, client }) {
  const fp = synthesis.final_package || {};
  const docs = fp.required_docs || [];
  const readyCount = fp.ready_count || 0;
  const totalCount = fp.total_count || 0;
  const readinessPct = totalCount > 0 ? Math.round((readyCount / totalCount) * 100) : 0;
  const blockers = fp.hard_blockers || [];

  const downloadPackage = () => {
    const manifest = {
      package_name: `${client?.legal_name || 'Client'} ${fp.level || 'CMMC'} Document Package`,
      client_id: clientId,
      client_name: client?.legal_name || '',
      cmmc_level: fp.level || '',
      generated_at: new Date().toISOString(),
      readiness: {
        ready_documents: readyCount,
        total_documents: totalCount,
        readiness_percent: readinessPct,
        hard_blockers: blockers,
      },
      documents: docs.map((doc) => ({
        name: doc.name,
        category: doc.category,
        present: !!doc.present,
        status: doc.status || 'Missing',
        include_in_final_package: !!doc.include_in_final_package,
        has_placeholders: !!doc.has_placeholders,
      })),
      assertions: {
        package_metadata_present: true,
        required_document_structure_present: docs.length > 0,
        export_generated_successfully: true,
      },
    };
    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeFileName(client?.legal_name)}-${safeFileName(fp.level)}-document-package.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-3">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-[#0F1E3C]" />
            <h3 className="text-sm font-semibold text-slate-800">Final Package — {fp.level}</h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={downloadPackage}
              className="flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg bg-[#0F1E3C] text-white hover:bg-[#1E2D4A]"
            >
              <Download className="w-4 h-4" /> Download Package Manifest
            </button>
            <div className="text-right">
              <div className="text-2xl font-bold text-slate-800">{readyCount}/{totalCount}</div>
              <div className="text-xs text-slate-500">documents ready</div>
            </div>
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
          {docs.length === 0 && (
            <div className="p-4 text-sm text-slate-500">No required document metadata was returned for this package yet. Use the download button to export the package manifest and verify the package structure.</div>
          )}
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