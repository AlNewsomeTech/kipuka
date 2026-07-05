import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { ASSET_TYPE_OPTIONS, SCOPE_CATEGORIES, ASSET_STATUSES, scopeCategoryMeta } from '@/lib/assetCategories';

// Add/edit an asset. Writes route through the parent's onSave (which calls the
// server-side orgAssetWrite function for org-role enforcement).
export default function OrgAssetFormModal({ existing, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    asset_name: existing?.asset_name || '',
    asset_type: existing?.asset_type || 'Endpoint',
    scope_category: existing?.scope_category || 'Unknown',
    owner: existing?.owner || '',
    location: existing?.location || '',
    business_purpose: existing?.business_purpose || '',
    status: existing?.status || 'Active',
    handles_fci: !!existing?.handles_fci,
    handles_cui: !!existing?.handles_cui,
    processes_cui: !!existing?.processes_cui,
    stores_cui: !!existing?.stores_cui,
    transmits_cui: !!existing?.transmits_cui,
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.asset_name.trim()) { setError('Asset name is required.'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave(form);
      onClose();
    } catch (e) {
      setError(e.message || 'Could not save this asset.');
      setSaving(false);
    }
  };

  const catMeta = scopeCategoryMeta(form.scope_category);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white">
          <h2 className="text-base font-bold text-slate-900">{existing ? 'Edit Asset' : 'Add Asset'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Asset Name *</label>
              <input className="form-input" value={form.asset_name} onChange={(e) => set('asset_name', e.target.value)} placeholder="e.g. Finance-Laptop-04" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Type</label>
              <select className="form-input" value={form.asset_type} onChange={(e) => set('asset_type', e.target.value)}>
                {ASSET_TYPE_OPTIONS.map((t) => <option key={t.key || t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
              <select className="form-input" value={form.status} onChange={(e) => set('status', e.target.value)}>
                {ASSET_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Owner</label>
              <input className="form-input" value={form.owner} onChange={(e) => set('owner', e.target.value)} placeholder="Responsible person / team" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Location</label>
              <input className="form-input" value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Site, cloud region, or 'Remote'" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">CMMC Scope Category</label>
            <select className="form-input" value={form.scope_category} onChange={(e) => set('scope_category', e.target.value)}>
              {SCOPE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{catMeta.help}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Description / Business Purpose</label>
            <textarea rows={2} className="form-input" value={form.business_purpose} onChange={(e) => set('business_purpose', e.target.value)} placeholder="What this asset is used for." />
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs font-semibold text-slate-600 mb-2">Data Handling</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                ['handles_fci', 'Handles FCI'],
                ['handles_cui', 'Handles CUI'],
                ['processes_cui', 'Processes CUI'],
                ['stores_cui', 'Stores CUI'],
                ['transmits_cui', 'Transmits CUI'],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={!!form[key]} onChange={(e) => set(key, e.target.checked)} className="w-4 h-4 rounded border-slate-300 accent-[#0F1E3C]" />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-200 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
          <button onClick={submit} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#0F1E3C] rounded-lg hover:bg-[#1E2D4A] disabled:opacity-60">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} {existing ? 'Save Changes' : 'Add Asset'}
          </button>
        </div>
      </div>
    </div>
  );
}