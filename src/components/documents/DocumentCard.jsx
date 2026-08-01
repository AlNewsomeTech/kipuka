import { FileText, Loader2, SearchCheck, FileDown, AlertCircle, CheckCircle2, FileWarning, Clock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import StatusBadge from '@/components/StatusBadge';

// One canonical template card: template hash/version, current draft state,
// preflight result, missing info, source freshness, and Generate Draft DOCX.
// No approval or publish actions exist in this phase.
export default function DocumentCard({ template, doc, preflight, error, busy, onPreflight, onGenerate }) {
  const blockers = preflight?.blockers || [];
  const missing = preflight?.missing_fields || [];
  const draftAllowed = preflight?.draft_generation_allowed === true;
  const stale = preflight?.source_freshness?.stale === true;

  const download = async () => {
    if (!doc?.file_uri) return;
    const res = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: doc.file_uri });
    if (res?.signed_url) window.open(res.signed_url, '_blank');
  };

  return (
    <div className={`bg-white rounded-xl border p-4 ${blockers.length ? 'border-red-200' : doc ? 'border-slate-200' : 'border-dashed border-slate-300'}`}>
      <div className="flex items-start justify-between mb-1.5 gap-2">
        <h4 className="text-sm font-medium text-slate-800 leading-snug">{template.title}</h4>
        {doc ? <StatusBadge status={doc.status} size="xs" /> : <span className="text-[10px] text-slate-400 flex-shrink-0">Not Started</span>}
      </div>
      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{template.document_type}</span>
        <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{template.primary_control_id}</span>
        <span className="text-[10px] text-slate-400 font-mono" title={`Template SHA-256: ${template.normalized_sha256}`}>
          v{template.version} · {template.normalized_sha256.slice(0, 8)}
        </span>
        {doc && <span className="text-[10px] text-slate-400">draft v{doc.document_version}</span>}
      </div>

      {doc && (
        <div className="space-y-1 mb-2 text-[10px]">
          {(doc.unresolved_fields || []).length > 0 && (
            <div className="text-amber-600 flex items-center gap-1"><FileWarning className="w-3 h-3" /> {doc.unresolved_fields.length} field(s) need information</div>
          )}
          {doc.generated_date && <div className="text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" /> Generated {String(doc.generated_date).slice(0, 10)}</div>}
        </div>
      )}

      {preflight && (
        <div className="space-y-1 mb-2 text-[10px] border-t border-slate-100 pt-2">
          {blockers.length > 0 ? (
            blockers.map((b, i) => <div key={i} className="text-red-600 flex items-start gap-1"><AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" /> {b}</div>)
          ) : (
            <div className="text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Draft generation allowed</div>
          )}
          {missing.length > 0 && <div className="text-amber-600">{missing.length} required field(s) unresolved: {missing.slice(0, 4).join(', ')}{missing.length > 4 ? '…' : ''}</div>}
          {stale && <div className="text-amber-600">Source data changed since the last draft — regenerate.</div>}
          <div className="text-slate-400">Approval fields pending (approval workflow ships in a later phase).</div>
        </div>
      )}
      {error && <div className="text-[10px] text-red-600 mb-2 flex items-start gap-1"><AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" /> {error}</div>}

      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100 flex-wrap">
        <button onClick={onPreflight} disabled={busy} className="text-xs text-slate-600 hover:underline flex items-center gap-1 disabled:opacity-50">
          {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <SearchCheck className="w-3 h-3" />} Preflight
        </button>
        <button
          onClick={onGenerate}
          disabled={busy || !preflight || !draftAllowed}
          title={!preflight ? 'Run preflight first' : (!draftAllowed ? 'Resolve blockers before generating' : 'Generate Draft DOCX')}
          className="text-xs text-blue-600 hover:underline flex items-center gap-1 disabled:opacity-40"
        >
          <FileText className="w-3 h-3" /> Generate Draft DOCX
        </button>
        {doc?.file_uri && (
          <button onClick={download} className="text-xs text-slate-600 hover:underline ml-auto flex items-center gap-1">
            <FileDown className="w-3 h-3" /> Download
          </button>
        )}
      </div>
    </div>
  );
}