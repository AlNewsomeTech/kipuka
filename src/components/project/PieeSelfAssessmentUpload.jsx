import { useState } from 'react';
import { Upload, Loader2, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// Dashboard upload block for a PIEE / SPRS self-assessment export. The chosen
// file is staged, hashed, and stored as canonical ProjectEvidence (Draft) so it
// automatically enters the Evidence Readiness pool for objective linking and
// review. Mirrors the manageProjectEvidence ingestion used by the SPRS module.
const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'pdf', 'docx', 'xlsx', 'csv', 'txt', 'json', 'zip', 'log', 'xml'];
const ASSESSMENT_CONTROL_ID = 'CA.L2-3.12.1';

export default function PieeSelfAssessmentUpload({ project, user, readOnly, onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [lastUploaded, setLastUploaded] = useState('');

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || uploading) return;
    const ext = (file.name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1]) || '';
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setError('Unsupported file type. Use PDF, CSV, XML, JSON, XLSX, TXT, PNG, JPG, or ZIP.');
      return;
    }
    setError('');
    setUploading(true);
    try {
      // 1. Stage the export for canonical ingestion.
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (!file_url) throw new Error('Kipuka could not stage the export for ingestion.');

      // 2. Resolve a canonical control to attach the export to. CA.L2-3.12.1
      //    (assess controls) is the natural home; fall back to the first assessed
      //    control so the evidence still enters readiness for any project.
      const assessments = await base44.entities.ControlAssessment.filter({ project_id: project.id }).catch(() => []);
      const mapped = assessments.find((a) => a.control_id === ASSESSMENT_CONTROL_ID) || assessments[0] || null;
      if (!mapped) {
        throw new Error('Seed controls in the Control Implementation module first so Kipuka can attach the export.');
      }

      // 3. Create the canonical evidence record (Draft — submit for review next).
      const retention = new Date();
      retention.setFullYear(retention.getFullYear() + 6);
      const title = `PIEE Self-Assessment Export — ${file.name.replace(/\.[^.]+$/, '')}`;
      await base44.functions.invoke('manageProjectEvidence', {
        action: 'create',
        transition_id: crypto.randomUUID(),
        project_id: project.id,
        file_url,
        original_file_name: file.name,
        evidence_title: title,
        evidence_type: 'Report',
        control_ids: [mapped.control_id],
        objective_ids: [],
        source_system: 'SPRS / PIEE',
        source_tool: 'SPRS / PIEE',
        provenance_type: 'System Export',
        provenance_details: 'PIEE self-assessment export uploaded from the project dashboard.',
        owner: user?.full_name || user?.email || '',
        evidence_date: new Date().toISOString().slice(0, 10),
        retention_until: retention.toISOString().slice(0, 10),
      });

      setLastUploaded(title);
      onUploaded?.();
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Kipuka could not import the PIEE export.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="app-surface p-5">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0F1E3C]">
          <ShieldCheck className="h-5 w-5 text-[#9bd9f7]" />
        </div>
        <div>
          <div className="page-kicker">Self-assessment</div>
          <h3 className="text-sm font-extrabold text-slate-800">Import a PIEE self-assessment export</h3>
        </div>
      </div>
      <p className="mt-2 text-[13px] text-slate-500 leading-relaxed">
        Upload the export you downloaded from PIEE / SPRS after completing your CMMC self-assessment. Kipuka stores it as canonical evidence and adds it to your Evidence Readiness pool for objective linking and review.
      </p>

      {error && (
        <div className="mt-3 flex gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-800">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /> <span>{error}</span>
        </div>
      )}

      {lastUploaded && !error && !uploading && (
        <div className="mt-3 flex gap-2 rounded-lg border border-green-200 bg-green-50 p-2.5 text-xs text-green-800">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>Imported &ldquo;<span className="font-semibold">{lastUploaded}</span>&rdquo; as Draft evidence. Submit it for review from the Evidence Readiness module.</span>
        </div>
      )}

      <div className="mt-3">
        {readOnly ? (
          <p className="text-xs text-slate-500">Your access is read-only. Ask an authorized project member to import the export.</p>
        ) : (
          <label className="inline-flex items-center gap-2 px-3 py-2.5 rounded-lg border border-dashed border-slate-300 cursor-pointer hover:bg-slate-50 text-sm font-semibold text-slate-600">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? 'Importing…' : 'Choose PIEE export file'}
            <input
              type="file"
              accept=".png,.jpg,.jpeg,.pdf,.docx,.xlsx,.csv,.txt,.json,.zip,.log,.xml"
              className="hidden"
              onChange={handleFile}
              disabled={uploading}
            />
          </label>
        )}
        <p className="mt-1.5 text-[11px] text-slate-500">Allowed: PDF, CSV, XML, JSON, XLSX, TXT, PNG, JPG, or ZIP (max 50 MB). Imported evidence starts as Draft.</p>
      </div>
    </div>
  );
}