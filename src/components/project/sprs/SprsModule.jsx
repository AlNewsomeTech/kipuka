import { useState, useEffect, useCallback } from 'react';
import { BadgeCheck, Loader2, Save, FileText, Package, Upload, CheckCircle2, ExternalLink } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import RichTextField from '@/components/ui/RichTextField';
import { generateSprsInstructionsPdf, generateSprsEvidencePackage } from '@/lib/sprsReports';
import {
  PIEE_STEPS, PIEE_STATUS_OPTIONS, SPRS_ROLE_OPTIONS, SPRS_ACCESS_OPTIONS,
  ASSESSMENT_TYPE_OPTIONS, CMMC_STATUS_OPTIONS,
} from '@/lib/sprsSteps';

const EMPTY = {
  uei: '', cage_code: '', piee_account_status: 'Not Started', sprs_role: 'None',
  sprs_access_status: 'Not Started', assessment_type: 'Unknown', assessment_score: '',
  cmmc_uid: '', cmmc_status: 'Unknown', submitted_date: '', affirmed_date: '',
  expiration_date: '', affirming_official_name: '', affirming_official_email: '',
  evidence_item_ids: [], notes: '',
};

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function SprsModule({ project, org, readOnly, currentUser }) {
  const [record, setRecord] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [recs, ev] = await Promise.all([
      base44.entities.SPRSRecord.filter({ project_id: project.id }).catch(() => []),
      base44.entities.ProjectEvidence.filter({ project_id: project.id }).catch(() => []),
    ]);
    const rec = recs[0] || null;
    setRecord(rec);
    setEvidence(ev);
    setForm(rec ? { ...EMPTY, ...rec, assessment_score: rec.assessment_score ?? '' } : {
      ...EMPTY,
      uei: project.uei || '', cage_code: project.primary_cage_code || '',
      affirming_official_name: project.affirming_official_name || '',
      affirming_official_email: project.affirming_official_email || '',
    });
    setLoading(false);
  }, [project.id, project.uei, project.primary_cage_code, project.affirming_official_name, project.affirming_official_email]);

  useEffect(() => { load(); }, [load]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    const payload = {
      ...form,
      organization_id: project.organization_id,
      project_id: project.id,
      assessment_score: form.assessment_score === '' ? undefined : Number(form.assessment_score),
      submitted_date: form.submitted_date || undefined,
      affirmed_date: form.affirmed_date || undefined,
      expiration_date: form.expiration_date || undefined,
    };
    if (record?.id) await base44.entities.SPRSRecord.update(record.id, payload);
    else await base44.entities.SPRSRecord.create(payload);
    setSaving(false);
    load();
  };

  const uploadScreenshot = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const created = await base44.entities.ProjectEvidence.create({
      organization_id: project.organization_id,
      project_id: project.id,
      evidence_title: `SPRS/PIEE — ${file.name}`,
      evidence_type: 'Screenshot',
      file_url, file_name: file.name,
      source_system: 'SPRS / PIEE',
      uploaded_by: currentUser?.full_name || currentUser?.email || '',
      evidence_date: new Date().toISOString().slice(0, 10),
    });
    setForm((f) => ({ ...f, evidence_item_ids: [...(f.evidence_item_ids || []), created.id] }));
    setUploading(false);
    load();
  };

  const genBy = currentUser?.full_name || currentUser?.email;
  const linked = evidence.filter((ev) => (form.evidence_item_ids || []).includes(ev.id));

  const runReport = async (key, fn) => { setBusy(key); try { await fn(); } finally { setBusy(null); } };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <BadgeCheck className="w-5 h-5 text-[#0F1E3C]" />
            <h1 className="text-lg font-bold text-slate-900">SPRS / PIEE Tracker</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => runReport('instr', () => generateSprsInstructionsPdf({ project, org, record: form, generatedBy: genBy }))}
              disabled={busy === 'instr'}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-60">
              {busy === 'instr' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} Client Instructions PDF
            </button>
            <button onClick={() => runReport('pkg', () => generateSprsEvidencePackage({ project, org, record: form, evidence, generatedBy: genBy }))}
              disabled={busy === 'pkg'}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-60">
              {busy === 'pkg' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />} Evidence Package
            </button>
          </div>
        </div>
        <p className="text-sm text-slate-500 mt-1">Track your PIEE account, SPRS role approval, CMMC UID, score, and affirmation. Submission is performed by your organization.</p>
      </div>

      {/* Step-by-step instructions */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-bold text-slate-800 mb-3">PIEE / SPRS Walkthrough</h2>
        <div className="space-y-3">
          {PIEE_STEPS.map((s) => (
            <div key={s.key} className="flex gap-3">
              <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-slate-800">{s.title}</div>
                <p className="text-sm text-slate-600 leading-relaxed">{s.detail}</p>
                {s.link && (
                  <a href={s.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline mt-0.5">
                    {s.link} <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tracking form */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-800">Tracking Details</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Field label="UEI"><input className="form-input" value={form.uei} onChange={(e) => set('uei', e.target.value)} disabled={readOnly} /></Field>
          <Field label="CAGE Code"><input className="form-input" value={form.cage_code} onChange={(e) => set('cage_code', e.target.value)} disabled={readOnly} /></Field>
          <Field label="PIEE Account Status">
            <select className="form-input" value={form.piee_account_status} onChange={(e) => set('piee_account_status', e.target.value)} disabled={readOnly}>
              {PIEE_STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="SPRS Role">
            <select className="form-input" value={form.sprs_role} onChange={(e) => set('sprs_role', e.target.value)} disabled={readOnly}>
              {SPRS_ROLE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="SPRS Access Status">
            <select className="form-input" value={form.sprs_access_status} onChange={(e) => set('sprs_access_status', e.target.value)} disabled={readOnly}>
              {SPRS_ACCESS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="Assessment Type">
            <select className="form-input" value={form.assessment_type} onChange={(e) => set('assessment_type', e.target.value)} disabled={readOnly}>
              {ASSESSMENT_TYPE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="Assessment Score"><input type="number" className="form-input" value={form.assessment_score} onChange={(e) => set('assessment_score', e.target.value)} disabled={readOnly} /></Field>
          <Field label="CMMC UID"><input className="form-input" value={form.cmmc_uid} onChange={(e) => set('cmmc_uid', e.target.value)} disabled={readOnly} /></Field>
          <Field label="CMMC Status">
            <select className="form-input" value={form.cmmc_status} onChange={(e) => set('cmmc_status', e.target.value)} disabled={readOnly}>
              {CMMC_STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="Submitted Date"><input type="date" className="form-input" value={form.submitted_date || ''} onChange={(e) => set('submitted_date', e.target.value)} disabled={readOnly} /></Field>
          <Field label="Affirmed Date"><input type="date" className="form-input" value={form.affirmed_date || ''} onChange={(e) => set('affirmed_date', e.target.value)} disabled={readOnly} /></Field>
          <Field label="Expiration Date"><input type="date" className="form-input" value={form.expiration_date || ''} onChange={(e) => set('expiration_date', e.target.value)} disabled={readOnly} /></Field>
          <Field label="Affirming Official Name"><input className="form-input" value={form.affirming_official_name} onChange={(e) => set('affirming_official_name', e.target.value)} disabled={readOnly} /></Field>
          <Field label="Affirming Official Email"><input type="email" className="form-input" value={form.affirming_official_email} onChange={(e) => set('affirming_official_email', e.target.value)} disabled={readOnly} /></Field>
        </div>

        <RichTextField label="Notes" value={form.notes} onChange={(v) => set('notes', v)} disabled={readOnly} />

        {!readOnly && (
          <div className="flex justify-end">
            <button onClick={save} disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52] disabled:opacity-60">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save SPRS Record
            </button>
          </div>
        )}
      </div>

      {/* Screenshots */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-800">Screenshots &amp; Evidence</h2>
          {!readOnly && (
            <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52] cursor-pointer">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Upload Screenshot
              <input type="file" className="hidden" onChange={uploadScreenshot} disabled={uploading} />
            </label>
          )}
        </div>
        {linked.length === 0 ? (
          <p className="text-sm text-slate-500">No screenshots uploaded for SPRS/PIEE yet. Upload confirmation screenshots from each PIEE step.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {linked.map((ev) => (
              <div key={ev.id} className="flex items-center gap-3 py-2 text-sm">
                <FileText className="w-4 h-4 text-slate-400" />
                <span className="text-slate-700">{ev.evidence_title}</span>
                {ev.file_url && <a href={ev.file_url} target="_blank" rel="noreferrer" className="ml-auto text-xs text-blue-600 hover:underline">View</a>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}