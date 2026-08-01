import { useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { applicableTemplates } from '@/lib/projectDocumentCatalog';

const CHOICES = ['Required', 'Recommended', 'Conditional', 'Out of Scope', 'Needs Scoping Decision'];

export default function ApplicabilityMatrix({ project, decisions, evidence, onChanged }) {
  const templates = useMemo(() => applicableTemplates(project.target_cmmc_level), [project.target_cmmc_level]);
  const latest = useMemo(() => {
    const map = {};
    decisions.filter((d) => d.status !== 'Superseded').forEach((d) => {
      if (!map[d.template_key] || (d.decision_version || 0) > (map[d.template_key].decision_version || 0)) map[d.template_key] = d;
    });
    return map;
  }, [decisions]);
  const [drafts, setDrafts] = useState({});
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const acceptedEvidence = evidence.filter((e) => e.review_status === 'Accepted' && e.hash_value);

  /**
   * @param {string} key
   * @param {string} field
   * @param {any} fallback
   * @returns {any}
   */
  const value = (key, field, fallback = '') => drafts[key]?.[field] ?? latest[key]?.[field] ?? fallback;
  const set = (key, field, next) => setDrafts((d) => ({ ...d, [key]: { ...(d[key] || {}), [field]: next } }));

  const save = async (template, mode) => {
    setBusy(template.template_key + mode); setError('');
    const key = template.template_key;
    try {
      await base44.functions.invoke('setDocumentApplicability', {
        project_id: project.id,
        template_key: key,
        decision: value(key, 'decision', 'Needs Scoping Decision'),
        justification: value(key, 'justification'),
        supporting_evidence_ids: value(key, 'supporting_evidence_ids', []),
        reassessment_trigger: value(key, 'reassessment_trigger'),
        reassessment_date: value(key, 'reassessment_date'),
        mode,
      });
      setDrafts((d) => { const n = { ...d }; delete n[key]; return n; });
      await onChanged();
    } catch (e) { setError(e.response?.data?.error || e.message); }
    finally { setBusy(''); }
  };

  return <div className="space-y-4">
    <div>
      <h2 className="text-lg font-semibold text-slate-900">Applicability Decision Register</h2>
      <p className="mt-1 text-sm text-slate-500">Every template receives an explicit decision. Out-of-Scope approval requires accepted, hashed evidence and a reassessment trigger.</p>
    </div>
    {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    <div className="space-y-3">{templates.map((t) => {
      const key = t.template_key;
      const status = latest[key]?.status || 'Not recorded';
      const selected = value(key, 'decision', 'Needs Scoping Decision');
      const evidenceIds = value(key, 'supporting_evidence_ids', []);
      return <details key={key} className="rounded-xl border border-slate-200 bg-white" open={status === 'Not recorded'}>
        <summary className="cursor-pointer list-none p-4">
          <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-slate-900">{t.title}</p><p className="text-xs text-slate-500">{t.document_id} · {t.document_type}</p></div>
          <div className="text-right"><span className="text-xs font-semibold text-slate-700">{selected}</span><p className="text-[11px] text-slate-400">{status}</p></div></div>
        </summary>
        <div className="grid gap-3 border-t border-slate-100 p-4 md:grid-cols-2">
          <label className="text-xs font-medium text-slate-600">Decision<select className="form-input mt-1" value={selected} onChange={(e) => set(key, 'decision', e.target.value)}>{CHOICES.map((c) => <option key={c}>{c}</option>)}</select></label>
          <label className="text-xs font-medium text-slate-600">Supporting accepted evidence<select className="form-input mt-1" value={evidenceIds[0] || ''} onChange={(e) => set(key, 'supporting_evidence_ids', e.target.value ? [e.target.value] : [])}><option value="">None selected</option>{acceptedEvidence.map((e) => <option key={e.id} value={e.id}>{e.evidence_title}</option>)}</select></label>
          <label className="text-xs font-medium text-slate-600 md:col-span-2">Justification<textarea className="form-input mt-1 min-h-[80px]" value={value(key, 'justification')} onChange={(e) => set(key, 'justification', e.target.value)} /></label>
          <label className="text-xs font-medium text-slate-600">Reassessment trigger<input className="form-input mt-1" value={value(key, 'reassessment_trigger')} onChange={(e) => set(key, 'reassessment_trigger', e.target.value)} placeholder="Reassess when technology, location, or scope changes" /></label>
          <label className="text-xs font-medium text-slate-600">Reassessment date<input type="date" className="form-input mt-1" value={value(key, 'reassessment_date')} onChange={(e) => set(key, 'reassessment_date', e.target.value)} /></label>
          <div className="flex gap-2 md:col-span-2">
            <button disabled={Boolean(busy)} onClick={() => save(t, 'draft')} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">Save Draft</button>
            <button disabled={Boolean(busy)} onClick={() => save(t, 'approve')} className="rounded-lg bg-[#0F1E3C] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Approve Decision</button>
          </div>
        </div>
      </details>;
    })}</div>
  </div>;
}
