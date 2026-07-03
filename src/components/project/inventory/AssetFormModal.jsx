import { useState, useEffect } from 'react';
import { X, Loader2, Save } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { ASSET_TYPES, SCOPE_CATEGORIES, ASSET_STATUSES } from '@/lib/assetInventory';
import RichTextField from '@/components/ui/RichTextField';

export default function AssetFormModal({ project, defaultType, existing, onClose, onSaved }) {
  const [form, setForm] = useState({
    asset_name: '', asset_type: defaultType || 'Endpoint', owner: '', business_purpose: '',
    in_scope: true, scope_category: 'Unknown', handles_fci: false, handles_cui: false,
    stores_cui: false, processes_cui: false, transmits_cui: false, location: '',
    management_tool: '', operating_system: '', notes: '', status: 'Active',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (existing) setForm(existing); }, [existing]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    const payload = { ...form, organization_id: project.organization_id, project_id: project.id };
    if (existing?.id) await base44.entities.Asset.update(existing.id, payload);
    else await base44.entities.Asset.create(payload);
    setSaving(false);
    onSaved();
  };

  const cuiFlags = [
    ['stores_cui', 'Stores CUI'], ['processes_cui', 'Processes CUI'],
    ['transmits_cui', 'Transmits CUI'], ['handles_fci', 'Handles FCI'], ['handles_cui', 'Handles CUI'],
  ];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 sticky top-0 bg-white">
          <h3 className="text-sm font-bold text-slate-800">{existing ? 'Edit Asset' : 'Add Asset'}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Asset Name *</label>
            <input className="form-input" value={form.asset_name} onChange={(e) => set('asset_name', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Type</label>
              <select className="form-input" value={form.asset_type} onChange={(e) => set('asset_type', e.target.value)}>
                {ASSET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Scope Category</label>
              <select className="form-input" value={form.scope_category} onChange={(e) => set('scope_category', e.target.value)}>
                {SCOPE_CATEGORIES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Owner</label>
              <input className="form-input" value={form.owner} onChange={(e) => set('owner', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
              <select className="form-input" value={form.status} onChange={(e) => set('status', e.target.value)}>
                {ASSET_STATUSES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Location</label>
              <input className="form-input" value={form.location} onChange={(e) => set('location', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Operating System</label>
              <input className="form-input" value={form.operating_system} onChange={(e) => set('operating_system', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Management Tool</label>
              <input className="form-input" value={form.management_tool} onChange={(e) => set('management_tool', e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Business Purpose</label>
            <input className="form-input" value={form.business_purpose} onChange={(e) => set('business_purpose', e.target.value)} />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={!!form.in_scope} onChange={(e) => set('in_scope', e.target.checked)} /> In scope
          </label>

          <div className="flex flex-wrap gap-3">
            {cuiFlags.map(([k, label]) => (
              <label key={k} className="flex items-center gap-1.5 text-xs text-slate-700">
                <input type="checkbox" checked={!!form[k]} onChange={(e) => set(k, e.target.checked)} /> {label}
              </label>
            ))}
          </div>

          <RichTextField label="Notes" value={form.notes} onChange={(v) => set('notes', v)} />
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-200 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 bg-slate-100">Cancel</button>
          <button onClick={save} disabled={saving || !form.asset_name.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Asset
          </button>
        </div>
      </div>
    </div>
  );
}