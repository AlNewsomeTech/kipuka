import { useState } from 'react';
import { X, Loader2, Save } from 'lucide-react';
import { TOOL_STATUSES } from '@/lib/securityTools';
import RichTextField from '@/components/ui/RichTextField';

// Edit owner / admin contact / status / notes for a tool. Saving is handled by
// the parent so it can create-or-update and seed control mappings.
export default function ToolDetailsModal({ tool, record, saving, onClose, onSave }) {
  const [form, setForm] = useState({
    tool_status: record?.tool_status || 'Not Used',
    owner: record?.owner || '',
    admin_contact_name: record?.admin_contact_name || '',
    admin_contact_email: record?.admin_contact_email || '',
    notes: record?.notes || '',
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h3 className="text-sm font-bold text-slate-800">{tool.name} — Details</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
            <select className="form-input" value={form.tool_status} onChange={(e) => set('tool_status', e.target.value)}>
              {TOOL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Owner</label>
            <input className="form-input" value={form.owner} onChange={(e) => set('owner', e.target.value)} />
          </div>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Admin Contact Name</label>
              <input className="form-input" value={form.admin_contact_name} onChange={(e) => set('admin_contact_name', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Admin Contact Email</label>
              <input type="email" className="form-input" value={form.admin_contact_email} onChange={(e) => set('admin_contact_email', e.target.value)} />
            </div>
          </div>
          <RichTextField label="Notes" value={form.notes} onChange={(v) => set('notes', v)} />
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-200 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 bg-slate-100">Cancel</button>
          <button onClick={() => onSave(form)} disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
          </button>
        </div>
      </div>
    </div>
  );
}