import { useState, useMemo } from 'react';
import { X, Loader2, Wand2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { SRM_TEMPLATES, buildSrmResponsibilities, templateNote, RESPONSIBILITY_OPTIONS } from '@/lib/srmTemplates';

const PROVIDER_TYPES = ['External Service Provider (ESP)', 'Cloud Service Provider (CSP)', 'Managed Service Provider (MSP)', 'SaaS Application', 'Other'];
const FEDRAMP = ['Unknown', 'Not Applicable', 'FedRAMP Moderate', 'FedRAMP High', 'FedRAMP Equivalent', 'DoD IL4', 'DoD IL5'];

export default function ProviderFormModal({ project, existing, fromAsset, assessments, onClose, onSaved }) {
  const [form, setForm] = useState(() => existing || {
    provider_name: fromAsset?.asset_name || '',
    provider_type: fromAsset?.asset_type === 'External Provider' ? 'External Service Provider (ESP)' : 'Cloud Service Provider (CSP)',
    service_description: fromAsset?.business_purpose || '',
    prefill_template: 'None',
    fedramp_status: 'Unknown',
    asset_id: fromAsset?.id || '',
    responsibilities: [],
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const controlList = useMemo(() =>
    assessments.map((a) => ({ control_id: a.control_id, control_title: a.control_title })), [assessments]);

  const applyTemplate = (name) => {
    if (name === 'None') { setForm((f) => ({ ...f, prefill_template: name })); return; }
    const rows = buildSrmResponsibilities(name, controlList);
    setForm((f) => ({ ...f, prefill_template: name, responsibilities: rows, notes: f.notes || templateNote(name) }));
  };

  const updateRow = (idx, patch) => setForm((f) => {
    const rows = [...(f.responsibilities || [])];
    rows[idx] = { ...rows[idx], ...patch };
    return { ...f, responsibilities: rows };
  });

  const save = async () => {
    if (!form.provider_name.trim()) return;
    setSaving(true);
    const payload = {
      organization_id: project.organization_id, project_id: project.id,
      provider_name: form.provider_name, provider_type: form.provider_type,
      service_description: form.service_description, prefill_template: form.prefill_template,
      fedramp_status: form.fedramp_status, asset_id: form.asset_id || '',
      responsibilities: form.responsibilities || [], notes: form.notes || '',
    };
    if (existing?.id) await base44.entities.ServiceProvider.update(existing.id, payload);
    else await base44.entities.ServiceProvider.create(payload);
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
          <h2 className="text-sm font-bold text-slate-900">{existing ? 'Edit Provider' : 'Add Service Provider'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Provider Name</label>
              <input className="form-input" value={form.provider_name} onChange={(e) => setForm({ ...form, provider_name: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Provider Type</label>
              <select className="form-input" value={form.provider_type} onChange={(e) => setForm({ ...form, provider_type: e.target.value })}>
                {PROVIDER_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">FedRAMP / Authorization</label>
              <select className="form-input" value={form.fedramp_status} onChange={(e) => setForm({ ...form, fedramp_status: e.target.value })}>
                {FEDRAMP.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Prefill Template</label>
              <select className="form-input" value={form.prefill_template} onChange={(e) => applyTemplate(e.target.value)}>
                <option value="None">None</option>
                {SRM_TEMPLATES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Service Description</label>
            <textarea className="form-input min-h-[60px]" value={form.service_description} onChange={(e) => setForm({ ...form, service_description: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Inheritance Notes</label>
            <textarea className="form-input min-h-[60px]" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>

          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-600">Responsibility by Control ({(form.responsibilities || []).length})</label>
            {controlList.length > 0 && (form.responsibilities || []).length === 0 && (
              <button onClick={() => setForm((f) => ({ ...f, responsibilities: controlList.map((c) => ({ ...c, responsibility: 'Customer', inheritance_notes: '' })) }))}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F1E3C] hover:underline">
                <Wand2 className="w-3.5 h-3.5" /> Load all controls
              </button>
            )}
          </div>
          {(form.responsibilities || []).length === 0 ? (
            <p className="text-xs text-slate-400 italic">Apply a prefill template or click "Load all controls" to map responsibilities.</p>
          ) : (
            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {form.responsibilities.map((row, idx) => (
                <div key={row.control_id + idx} className="p-2.5 grid sm:grid-cols-[1fr_130px] gap-2 items-start">
                  <div className="min-w-0">
                    <div className="text-xs font-mono text-slate-500">{row.control_id}</div>
                    <div className="text-xs text-slate-700 truncate">{row.control_title}</div>
                    <input className="form-input mt-1 text-xs py-1" placeholder="Inheritance notes"
                      value={row.inheritance_notes || ''} onChange={(e) => updateRow(idx, { inheritance_notes: e.target.value })} />
                  </div>
                  <select className="form-input text-xs py-1" value={row.responsibility}
                    onChange={(e) => updateRow(idx, { responsibility: e.target.value })}>
                    {RESPONSIBILITY_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200">Cancel</button>
          <button onClick={save} disabled={saving || !form.provider_name.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52] disabled:opacity-60">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save Provider
          </button>
        </div>
      </div>
    </div>
  );
}