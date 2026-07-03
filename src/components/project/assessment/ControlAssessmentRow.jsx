import { useState } from 'react';
import {
  ChevronDown, CheckCircle2, CircleDashed, XCircle, FileUp, AlertTriangle,
  FileText, Loader2, Save, ExternalLink,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import StatusBadge from '@/components/StatusBadge';
import RichTextField from '@/components/ui/RichTextField';
import EvidenceUploadModal from '@/components/project/evidence/EvidenceUploadModal';

const RISK_TONE = {
  Low: 'bg-green-50 text-green-700', Moderate: 'bg-amber-50 text-amber-700',
  High: 'bg-orange-50 text-orange-700', Critical: 'bg-red-50 text-red-700',
};

export default function ControlAssessmentRow({ assessment, libEntry, evidence, poams, readOnly, project, onUpdate, onRefresh, currentUser }) {
  const [open, setOpen] = useState(false);
  const [sspOpen, setSspOpen] = useState(false);
  const [sspDraft, setSspDraft] = useState(assessment.ssp_statement || '');
  const [savingSsp, setSavingSsp] = useState(false);
  const [evidenceModal, setEvidenceModal] = useState(false);
  const [poamOpen, setPoamOpen] = useState(false);
  const [poamDraft, setPoamDraft] = useState('');
  const [savingPoam, setSavingPoam] = useState(false);

  const mark = (status) => onUpdate(assessment.id, { status });

  const saveSsp = async () => {
    setSavingSsp(true);
    await onUpdate(assessment.id, { ssp_statement: sspDraft });
    setSavingSsp(false);
    setSspOpen(false);
  };

  const createPoam = async () => {
    if (!poamDraft.trim()) return;
    setSavingPoam(true);
    await base44.entities.ProjectPOAM.create({
      organization_id: project.organization_id,
      project_id: project.id,
      control_id: assessment.control_id,
      poam_title: poamDraft.slice(0, 120),
      gap_statement: poamDraft,
      remediation_plan: libEntry?.poam_gap_starter || '',
      risk_rating: assessment.risk_rating || 'Moderate',
      status: 'Open',
    });
    setSavingPoam(false);
    setPoamDraft('');
    setPoamOpen(false);
    onRefresh();
  };

  return (
    <div className="px-5 py-3">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 text-left">
        <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${open ? '' : '-rotate-90'}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-semibold text-slate-500">{assessment.control_id}</span>
            <span className="text-sm font-medium text-slate-800 truncate">{assessment.control_title}</span>
          </div>
        </div>
        <span className={`hidden sm:inline text-[11px] px-2 py-0.5 rounded-full font-semibold ${RISK_TONE[assessment.risk_rating] || RISK_TONE.Moderate}`}>{assessment.risk_rating}</span>
        <StatusBadge status={assessment.status} size="xs" />
      </button>

      {open && (
        <div className="mt-3 ml-7 space-y-4 text-sm">
          {libEntry?.requirement_text && (
            <Field label="Requirement"><div className="prose prose-sm max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: libEntry.requirement_text }} /></Field>
          )}
          {libEntry?.plain_english_summary && (
            <Field label="Plain-English Explanation"><div className="prose prose-sm max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: libEntry.plain_english_summary }} /></Field>
          )}
          <Field label="Evidence Expectations">
            <div className="prose prose-sm max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: assessment.evidence_required || libEntry?.example_evidence || '<em>Not specified</em>' }} />
          </Field>

          {/* Implementation notes */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Responsible Owner</label>
              <input className="form-input" value={assessment.responsible_owner || ''} disabled={readOnly}
                onChange={(e) => onUpdate(assessment.id, { responsible_owner: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Risk Rating</label>
              <select className="form-input" value={assessment.risk_rating} disabled={readOnly}
                onChange={(e) => onUpdate(assessment.id, { risk_rating: e.target.value })}>
                {['Low', 'Moderate', 'High', 'Critical'].map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <RichTextField label="Implementation Notes" value={assessment.implementation_summary} disabled={readOnly}
            onChange={(v) => onUpdate(assessment.id, { implementation_summary: v })} />

          {/* Linked evidence */}
          <Field label={`Linked Evidence (${evidence.length})`}>
            {evidence.length === 0 ? <span className="text-xs text-slate-400 italic">No evidence mapped to this control.</span> : (
              <ul className="space-y-1">
                {evidence.map((e) => (
                  <li key={e.id} className="flex items-center gap-2 text-xs text-slate-600">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    {e.file_url ? <a href={e.file_url} target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1">{e.evidence_title} <ExternalLink className="w-3 h-3" /></a> : e.evidence_title}
                    <StatusBadge status={e.review_status} size="xs" />
                  </li>
                ))}
              </ul>
            )}
          </Field>

          {/* Linked POA&M */}
          <Field label={`Linked POA&M Items (${poams.length})`}>
            {poams.length === 0 ? <span className="text-xs text-slate-400 italic">No POA&M items.</span> : (
              <ul className="space-y-1">
                {poams.map((p) => (
                  <li key={p.id} className="flex items-center gap-2 text-xs text-slate-600">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> {p.poam_title || p.weakness_description}
                    <StatusBadge status={p.status} size="xs" />
                  </li>
                ))}
              </ul>
            )}
          </Field>

          {/* SSP statement */}
          <Field label="SSP Statement">
            {sspOpen ? (
              <div className="space-y-2">
                <RichTextField value={sspDraft} onChange={setSspDraft} />
                <div className="flex gap-2">
                  <button onClick={saveSsp} disabled={savingSsp} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#0F1E3C] disabled:opacity-60">
                    {savingSsp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
                  </button>
                  <button onClick={() => { setSspOpen(false); setSspDraft(assessment.ssp_statement || ''); }} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="prose prose-sm max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: assessment.ssp_statement || libEntry?.ssp_statement_starter || '<em>No SSP statement yet.</em>' }} />
            )}
          </Field>

          {/* Action buttons */}
          {!readOnly && (
            <div className="flex flex-wrap gap-2 pt-1">
              <ActionBtn icon={CheckCircle2} tone="green" onClick={() => mark('Implemented')}>Mark Implemented</ActionBtn>
              <ActionBtn icon={CircleDashed} tone="amber" onClick={() => mark('Partially Implemented')}>Mark Partial</ActionBtn>
              <ActionBtn icon={XCircle} tone="red" onClick={() => mark('Not Implemented')}>Mark Not Implemented</ActionBtn>
              <ActionBtn icon={FileUp} tone="slate" onClick={() => setEvidenceModal(true)}>Add Evidence</ActionBtn>
              <ActionBtn icon={AlertTriangle} tone="slate" onClick={() => setPoamOpen(!poamOpen)}>Create POA&M Item</ActionBtn>
              <ActionBtn icon={FileText} tone="slate" onClick={() => { setSspDraft(assessment.ssp_statement || libEntry?.ssp_statement_starter || ''); setSspOpen(true); }}>Edit SSP Statement</ActionBtn>
            </div>
          )}

          {poamOpen && !readOnly && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
              <label className="block text-xs font-semibold text-slate-600">New POA&M — Weakness Description</label>
              <textarea rows={2} className="form-input" value={poamDraft} onChange={(e) => setPoamDraft(e.target.value)} />
              <button onClick={createPoam} disabled={savingPoam} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#0F1E3C] disabled:opacity-60">
                {savingPoam ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />} Create POA&M
              </button>
            </div>
          )}
        </div>
      )}

      {evidenceModal && (
        <EvidenceUploadModal
          project={project}
          currentUser={currentUser}
          presetControlIds={[assessment.control_id]}
          onClose={() => setEvidenceModal(false)}
          onSaved={() => { setEvidenceModal(false); onUpdate(assessment.id, { evidence_status: 'Evidence Uploaded' }); onRefresh(); }}
        />
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div className="text-xs font-semibold text-slate-600 mb-1">{label}</div>
      {children}
    </div>
  );
}

function ActionBtn({ icon: Icon, tone, onClick, children }) {
  const tones = {
    green: 'text-green-700 bg-green-50 hover:bg-green-100 border-green-200',
    amber: 'text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200',
    red: 'text-red-700 bg-red-50 hover:bg-red-100 border-red-200',
    slate: 'text-slate-700 bg-slate-100 hover:bg-slate-200 border-slate-200',
  };
  return (
    <button onClick={onClick} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${tones[tone]}`}>
      <Icon className="w-3.5 h-3.5" /> {children}
    </button>
  );
}