import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Save, Loader2 } from 'lucide-react';

const FIELDS = [
  { key: 'system_name', label: 'System Name', type: 'text' },
  { key: 'system_description', label: 'System Description', type: 'textarea' },
  { key: 'authorization_boundary', label: 'Authorization Boundary', type: 'textarea' },
  { key: 'assessment_boundary', label: 'Assessment Boundary', type: 'textarea' },
  { key: 'fci_boundary', label: 'FCI Boundary', type: 'textarea' },
  { key: 'cui_boundary', label: 'CUI Boundary', type: 'textarea' },
  { key: 'data_types_in_scope', label: 'Data Types in Scope', type: 'textarea' },
  { key: 'data_flow_summary', label: 'Data Flow Summary', type: 'textarea' },
  { key: 'external_connections_summary', label: 'External Connections Summary', type: 'textarea' },
  { key: 'cloud_services_summary', label: 'Cloud Services Summary', type: 'textarea' },
  { key: 'endpoint_summary', label: 'Endpoint Summary', type: 'textarea' },
  { key: 'identity_summary', label: 'Identity Summary', type: 'textarea' },
  { key: 'email_summary', label: 'Email Summary', type: 'textarea' },
  { key: 'collaboration_summary', label: 'Collaboration Summary', type: 'textarea' },
  { key: 'security_tools_summary', label: 'Security Tools Summary', type: 'textarea' },
  { key: 'physical_facility_summary', label: 'Physical Facility Summary', type: 'textarea' },
  { key: 'remote_work_summary', label: 'Remote Work Summary', type: 'textarea' },
  { key: 'mobile_device_summary', label: 'Mobile Device Summary', type: 'textarea' },
  { key: 'macos_summary', label: 'macOS Summary', type: 'textarea' },
  { key: 'third_party_service_provider_summary', label: 'Third-Party Service Provider Summary', type: 'textarea' },
  { key: 'inherited_controls_summary', label: 'Inherited Controls Summary', type: 'textarea' },
  { key: 'shared_responsibility_summary', label: 'Shared Responsibility Summary', type: 'textarea' },
  { key: 'assumptions', label: 'Assumptions', type: 'textarea' },
  { key: 'exclusions', label: 'Exclusions', type: 'textarea' },
];

export default function SSPBuilder({ sspRecord, clientId, onUpdate }) {
  const [form, setForm] = useState(sspRecord || {});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Resync form when the SSP record changes (e.g. client switch or regenerate)
  useEffect(() => { setForm(sspRecord || {}); }, [sspRecord?.id, sspRecord?.client_id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      let result;
      if (sspRecord?.id) {
        result = await base44.entities.SSPRecord.update(sspRecord.id, form);
      } else {
        result = await base44.entities.SSPRecord.create({ ...form, client_id: clientId, ssp_title: form.ssp_title || 'SSP Draft' });
      }
      onUpdate(result);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      alert('Error saving SSP: ' + e.message);
    }
    setSaving(false);
  };

  const update = (key, value) => setForm({ ...form, [key]: value });

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-600">SSP Title</label>
            <input className="form-input mt-1" value={form.ssp_title || ''} onChange={e => update('ssp_title', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Level</label>
            <select className="form-input mt-1" value={form.ssp_level || 'Level 1'} onChange={e => update('ssp_level', e.target.value)}>
              <option>Level 1</option><option>Level 2 Ready</option><option>Level 2</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Version</label>
            <input className="form-input mt-1" value={form.version || '1.0'} onChange={e => update('version', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Status</label>
            <select className="form-input mt-1" value={form.status || 'Draft'} onChange={e => update('status', e.target.value)}>
              <option>Draft</option><option>In Review</option><option>Approved</option><option>Published</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {FIELDS.map(f => (
          <div key={f.key} className="bg-white rounded-xl border border-slate-200 p-4">
            <label className="text-xs font-medium text-slate-600">{f.label}</label>
            {f.type === 'textarea' ? (
              <textarea className="form-input mt-1 min-h-[80px] text-xs" value={form[f.key] || ''} onChange={e => update(f.key, e.target.value)} />
            ) : (
              <input className="form-input mt-1" value={form[f.key] || ''} onChange={e => update(f.key, e.target.value)} />
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-[#0F1E3C] text-white hover:bg-[#1E2D4A] disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {saved ? 'Saved!' : 'Save SSP Profile'}
        </button>
      </div>
    </div>
  );
}