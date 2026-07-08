import { useState, useEffect, useCallback } from 'react';
import { Upload, FileText, ExternalLink, Plus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import StatusBadge from '@/components/StatusBadge';
import EvidenceUploadModal from '@/components/project/evidence/EvidenceUploadModal';

// Step 4 UPLOAD — inline evidence upload with the control pre-linked and the
// suggested filename shown. Lists evidence already mapped to this control.
export default function StepUpload({ project, currentUser, controlId, suggestedFilename, onChanged }) {
  const [modal, setModal] = useState(false);
  const [evidence, setEvidence] = useState([]);

  const load = useCallback(() => {
    base44.entities.ProjectEvidence.filter({ project_id: project.id })
      .then((rows) => setEvidence(rows.filter((e) => (e.control_ids || []).includes(controlId))))
      .catch(() => setEvidence([]));
  }, [project.id, controlId]);

  useEffect(load, [load]);

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-5 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-sm font-bold text-blue-900 flex items-center gap-1.5">
            <Upload className="w-4 h-4" /> Upload your evidence for {controlId}
          </h3>
          <button
            onClick={() => setModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52]"
          >
            <Plus className="w-3.5 h-3.5" /> Add Evidence
          </button>
        </div>
        <p className="text-[13px] text-blue-900/80">
          Suggested file name: <code className="font-mono bg-white border border-blue-200 rounded px-1.5 py-0.5">{suggestedFilename}</code>
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="text-xs font-semibold text-slate-600 mb-2">Evidence mapped to this control ({evidence.length})</div>
        {evidence.length === 0 ? (
          <p className="text-sm text-slate-400 italic">No evidence uploaded yet. Use “Add Evidence” above.</p>
        ) : (
          <ul className="space-y-1.5">
            {evidence.map((e) => (
              <li key={e.id} className="flex items-center gap-2 text-sm text-slate-600">
                <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                {e.file_url
                  ? <a href={e.file_url} target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1">{e.evidence_title} <ExternalLink className="w-3 h-3" /></a>
                  : e.evidence_title}
                <StatusBadge status={e.review_status} size="xs" />
              </li>
            ))}
          </ul>
        )}
      </div>

      {modal && (
        <EvidenceUploadModal
          project={project}
          currentUser={currentUser}
          presetControlIds={[controlId]}
          onClose={() => setModal(false)}
          onSaved={() => { setModal(false); load(); onChanged?.(); }}
        />
      )}
    </div>
  );
}