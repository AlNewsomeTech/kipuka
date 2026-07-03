import { useState, useEffect } from 'react';
import { X, Loader2, Save } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import RichTextField from '@/components/ui/RichTextField';
import { MAINTENANCE_CATEGORIES, MAINTENANCE_STATUSES } from '@/lib/maintenanceTemplates';

const EMPTY = {
  task_title: '', task_category: 'Monthly Review', assigned_owner: '',
  due_date: '', status: 'Not Started', completion_notes: '',
  related_control_ids: [], linked_evidence_ids: [],
};

export default function MaintenanceFormModal({ project, existing, evidence = [], onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existing) setForm({ ...EMPTY, ...existing, linked_evidence_ids: existing.linked_evidence_ids || [], related_control_ids: existing.related_control_ids || [] });
  }, [existing]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleEvidence = (id) => set('linked_evidence_ids', form.linked_evidence_ids.includes(id)
    ? form.linked_evidence_ids.filter((e) => e !== id)
    : [...form.linked_evidence_ids, id]);

  const save = async () => {
    setSaving(true);
    const payload = {
      ...form,
      organization_id: project.organization_id,
      project_id: project.id,
      due_date: form.due_date || undefined,
    };
    if (existing?.id) await base44.entities.MaintenanceTask.update(existing.id, payload);
    else await base44.entities.MaintenanceTask.create(payload);
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 sticky top-0 bg-white">
          <h3 className="text-sm font-bold text-slate-800">{existing ? 'Edit Maintenance Task' : 'New Maintenance Task'}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Task Title *</label>
            <input className="form-input" value={form.task_title} onChange={(e) => set('task_title', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
              <select className="form-input" value={form.task_category} onChange={(e) => set('task_category', e.target.value)}>
                {MAINTENANCE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
              <select className="form-input" value={form.status} onChange={(e) => set('status', e.target.value)}>
                {MAINTENANCE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Assigned Owner</label>
              <input className="form-input" value={form.assigned_owner} onChange={(e) => set('assigned_owner', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Due Date</label>
              <input type="date" className="form-input" value={form.due_date || ''} onChange={(e) => set('due_date', e.target.value)} />
            </div>
          </div>

          <RichTextField label="Completion Notes" value={form.completion_notes} onChange={(v) => set('completion_notes', v)} />

          {evidence.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Link Evidence (SSP / POA&M / policy updates)</label>
              <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1">
                {evidence.map((ev) => (
                  <label key={ev.id} className="flex items-center gap-2 text-xs text-slate-700">
                    <input type="checkbox" checked={form.linked_evidence_ids.includes(ev.id)} onChange={() => toggleEvidence(ev.id)} />
                    {ev.evidence_title}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-200 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 bg-slate-100">Cancel</button>
          <button onClick={save} disabled={saving || !form.task_title.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Task
          </button>
        </div>
      </div>
    </div>
  );
}