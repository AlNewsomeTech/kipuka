import { useState, useEffect } from 'react';
import { X, Loader2, Save } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import RichTextField from '@/components/ui/RichTextField';

const RISKS = ['Low', 'Moderate', 'High', 'Critical'];
const STATUSES = ['Open', 'In Progress', 'Blocked', 'Pending Validation', 'Closed', 'Deferred', 'Accepted Risk'];

export default function PoamFormModal({ project, existing, evidence = [], onClose, onSaved }) {
  const [form, setForm] = useState({
    poam_title: '', control_id: '', gap_statement: '', risk_rating: 'Moderate',
    remediation_plan: '', milestones: '', responsible_owner: '', target_completion_date: '',
    actual_completion_date: '', status: 'Open', closure_evidence_ids: [], closure_notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (existing) setForm(existing); }, [existing]);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    const payload = { ...form, organization_id: project.organization_id, project_id: project.id };
    if (existing?.id) await base44.entities.ProjectPOAM.update(existing.id, payload);
    else await base44.entities.ProjectPOAM.create(payload);
    setSaving(false);
    onSaved();
  };

  const toggleEvidence = (id) => set('closure_evidence_ids',
    (form.closure_evidence_ids || []).includes(id)
      ? form.closure_evidence_ids.filter((x) => x !== id)
      : [...(form.closure_evidence_ids || []), id]);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h3 className="text-sm font-bold text-slate-800">{existing ? 'Edit POA&M Item' : 'New POA&M Item'}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Title *</label>
            <input className="form-input" value={form.poam_title} onChange={(e) => set('poam_title', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Related Control ID</label>
              <input className="form-input" value={form.control_id} onChange={(e) => set('control_id', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Risk Rating</label>
              <select className="form-input" value={form.risk_rating} onChange={(e) => set('risk_rating', e.target.value)}>
                {RISKS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Owner</label>
              <input className="form-input" value={form.responsible_owner} onChange={(e) => set('responsible_owner', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
              <select className="form-input" value={form.status} onChange={(e) => set('status', e.target.value)}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Target Completion</label>
              <input type="date" className="form-input" value={form.target_completion_date || ''} onChange={(e) => set('target_completion_date', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Actual Completion</label>
              <input type="date" className="form-input" value={form.actual_completion_date || ''} onChange={(e) => set('actual_completion_date', e.target.value)} />
            </div>
          </div>

          <RichTextField label="Gap Statement" value={form.gap_statement} onChange={(v) => set('gap_statement', v)} />
          <RichTextField label="Remediation Plan" value={form.remediation_plan} onChange={(v) => set('remediation_plan', v)} />
          <RichTextField label="Milestones" value={form.milestones} onChange={(v) => set('milestones', v)} />

          {evidence.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Closure Evidence</label>
              <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1">
                {evidence.map((e) => (
                  <label key={e.id} className="flex items-center gap-2 text-xs text-slate-700">
                    <input type="checkbox" checked={(form.closure_evidence_ids || []).includes(e.id)} onChange={() => toggleEvidence(e.id)} />
                    {e.evidence_title}
                  </label>
                ))}
              </div>
            </div>
          )}
          <RichTextField label="Closure Notes" value={form.closure_notes} onChange={(v) => set('closure_notes', v)} />
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-200 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 bg-slate-100">Cancel</button>
          <button onClick={save} disabled={saving || !form.poam_title.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
          </button>
        </div>
      </div>
    </div>
  );
}