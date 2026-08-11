import { useState, useEffect, useCallback } from 'react';
import { Upload, FileText, Plus, Download, Send, Loader2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import StatusBadge from '@/components/StatusBadge';
import EvidenceUploadModal from '@/components/project/evidence/EvidenceUploadModal';

// Step 4 UPLOAD — inline evidence upload with the control pre-linked and the
// suggested filename shown. Lists evidence already mapped to this control.
export default function StepUpload({
  project,
  libEntry,
  variant,
  controlId,
  suggestedFilename,
  filenamePlan,
  readOnly,
  onChanged,
}) {
  const [modal, setModal] = useState(false);
  const [evidence, setEvidence] = useState([]);
  const [evidenceLoaded, setEvidenceLoaded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const rows = await base44.entities.ProjectEvidence.filter({ project_id: project.id });
      setEvidence(
        rows
          .filter((item) => !['Archived', 'Superseded'].includes(item.review_status))
          .filter((item) => (item.control_ids || []).includes(controlId))
          .sort((a, b) => String(b.uploaded_date || '').localeCompare(String(a.uploaded_date || ''))),
      );
      setEvidenceLoaded(true);
      return true;
    } catch (loadFailure) {
      setLoadError(loadFailure?.message || 'Kipuka could not load the complete evidence list. No empty evidence state has been assumed.');
      setEvidenceLoaded(false);
      return false;
    }
  }, [project.id, controlId]);

  useEffect(() => { load(); }, [load]);

  const transition = async (item, action) => {
    const busyKey = `${action}:${item.id}`;
    setError('');
    setBusy(busyKey);
    try {
      const response = await base44.functions.invoke('manageProjectEvidence', {
        action,
        transition_id: crypto.randomUUID(),
        evidence_id: item.id,
      });
      if (action === 'download') {
        const url = response.data?.signed_url;
        if (!url) throw new Error('Kipuka did not return a verified download link.');
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        await load();
        onChanged?.();
      }
    } catch (actionError) {
      setError(actionError?.response?.data?.error || actionError.message || 'The evidence action failed. No status change was recorded.');
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-5 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-sm font-bold text-blue-900 flex items-center gap-1.5">
            <Upload className="w-4 h-4" /> Upload your evidence for {controlId}
          </h3>
          {!readOnly && (
            <button
              onClick={() => setModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52]"
            >
              <Plus className="w-3.5 h-3.5" /> Add Evidence
            </button>
          )}
        </div>
        <p className="text-[13px] text-blue-900/80">
          Kipuka will standardize the private stored filename as: <code className="font-mono bg-white border border-blue-200 rounded px-1.5 py-0.5">{suggestedFilename}.file-extension</code>
        </p>
        <p className="text-[12px] text-blue-900/75">
          Save creates a Draft. Submit the Draft for review below. Only Accepted evidence can support readiness, and evidence never marks an assessment objective MET by itself.
        </p>
      </div>

      {error && (
        <div role="alert" className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {error}
        </div>
      )}
      {loadError && (
        <div role="alert" className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          <span className="flex gap-2"><AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {loadError}</span>
          <button onClick={load} className="text-xs font-semibold underline">Retry</button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="text-xs font-semibold text-slate-600 mb-2">Current evidence mapped to this control ({evidence.length})</div>
        {!evidenceLoaded ? (
          <p className="text-sm text-slate-500">Evidence is unavailable until the complete project evidence list loads successfully.</p>
        ) : evidence.length === 0 ? (
          <p className="text-sm text-slate-500">{readOnly ? 'No current evidence is mapped to this control.' : 'No evidence yet. Choose Add Evidence and follow the four steps in the form.'}</p>
        ) : (
          <ul className="space-y-2">
            {evidence.map((item) => {
              const canSubmit = !readOnly && ['Draft', 'Rejected'].includes(item.review_status);
              const waiting = item.review_status === 'Needs Review';
              const accepted = item.review_status === 'Accepted';
              return (
                <li key={item.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span className="text-sm font-semibold text-slate-700 flex-1 min-w-40">{item.evidence_title}</span>
                    <StatusBadge status={item.review_status} size="xs" />
                    {item.file_uri && (
                      <button
                        onClick={() => transition(item, 'download')}
                        disabled={!!busy}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-50"
                      >
                        {busy === `download:${item.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                        Verify and download
                      </button>
                    )}
                    {canSubmit && (
                      <button
                        onClick={() => transition(item, 'submit_review')}
                        disabled={!!busy}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F1E3C] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        {busy === `submit_review:${item.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        Submit for Review
                      </button>
                    )}
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    {accepted
                      ? 'Accepted: this hash-verified file can support readiness when it is linked to a separately assessed objective.'
                      : waiting
                        ? 'Needs Review: an authorized reviewer must complete all quality checks and accept or reject it.'
                        : item.review_status === 'Rejected'
                          ? `Rejected: ${item.rejection_reason || 'create a corrected version or resubmit after correction.'}`
                          : 'Draft: verify the details, then submit it for independent review.'}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-[13px] text-emerald-950">
        <div className="flex items-center gap-1.5 font-semibold"><ShieldCheck className="w-4 h-4" /> Evidence lifecycle</div>
        <div className="mt-1">Draft → Needs Review → Accepted or Rejected. Accepted evidence supports the assessor’s work; it does not replace the assessor’s objective finding.</div>
      </div>

      {modal && (
        <EvidenceUploadModal
          project={project}
          controls={[{ control_id: controlId, control_title: libEntry?.control_title || '' }]}
          presetControlIds={[controlId]}
          presetSourceTool={filenamePlan?.tool || null}
          presetSourceSystem={variant?.where_to_go?.name || ''}
          presetEvidenceTitle={`${controlId} ${libEntry?.control_title || 'implementation'} evidence`}
          presetEvidenceType="Screenshot"
          presetDescription={variant?.screenshot_instructions || ''}
          presetOwner=""
          fileNameDescription={filenamePlan?.description || ''}
          expectedFilename={suggestedFilename}
          onClose={() => setModal(false)}
          onSaved={() => { setModal(false); load(); onChanged?.(); }}
        />
      )}
    </div>
  );
}