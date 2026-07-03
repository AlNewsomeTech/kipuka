import { useState } from 'react';
import { X, Loader2, Save, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import RichTextField from '@/components/ui/RichTextField';

const STATUSES = ['Draft', 'In Review', 'Approved', 'Archived'];

export default function PolicyEditorModal({ policy, onClose, onSaved, onDelete }) {
  const [form, setForm] = useState({ ...policy, mapped_control_ids: policy.mapped_control_ids || [] });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    await base44.entities.PolicyTemplate.update(policy.id, {
      policy_name: form.policy_name, policy_category: form.policy_category,
      mapped_control_ids: (form.mapped_control_ids_str ?? (form.mapped_control_ids || []).join(', '))
        .split(',').map((s) => s.trim()).filter(Boolean),
      policy_body: form.policy_body, version: form.version, owner: form.owner,
      effective_date: form.effective_date || null, review_date: form.review_date || null,
      approval_status: form.approval_status, approved_by: form.approved_by,
    });
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h3 className="text-sm font-bold text-slate-800">Edit Policy</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Policy Name</label>
            <input className="form-input" value={form.policy_name} onChange={(e) => set('policy_name', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
              <input className="form-input" value={form.policy_category || ''} onChange={(e) => set('policy_category', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Owner</label>
              <input className="form-input" value={form.owner || ''} onChange={(e) => set('owner', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Version</label>
              <input className="form-input" value={form.version || ''} onChange={(e) => set('version', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Approval Status</label>
              <select className="form-input" value={form.approval_status} onChange={(e) => set('approval_status', e.target.value)}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Effective Date</label>
              <input type="date" className="form-input" value={form.effective_date || ''} onChange={(e) => set('effective_date', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Review Date</label>
              <input type="date" className="form-input" value={form.review_date || ''} onChange={(e) => set('review_date', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Mapped Control IDs (comma-separated)</label>
            <input className="form-input" defaultValue={(form.mapped_control_ids || []).join(', ')}
              onChange={(e) => set('mapped_control_ids_str', e.target.value)} />
          </div>
          <RichTextField label="Policy Body" value={form.policy_body} onChange={(v) => set('policy_body', v)} />
        </div>
        <div className="flex justify-between gap-2 px-5 py-3 border-t border-slate-200 sticky bottom-0 bg-white">
          <button onClick={onDelete} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-red-700 bg-red-50 hover:bg-red-100">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 bg-slate-100">Cancel</button>
            <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] disabled:opacity-60">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}