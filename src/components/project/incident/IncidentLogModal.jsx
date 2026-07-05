import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const CATEGORIES = ['Malware', 'Unauthorized Access', 'Phishing', 'Data Loss', 'Denial of Service', 'Insider Threat', 'Lost/Stolen Device', 'Policy Violation', 'Other'];
const SEVERITIES = ['Low', 'Moderate', 'High', 'Critical'];
const STATUSES = ['Open', 'Contained', 'Recovering', 'Closed'];

export default function IncidentLogModal({ project, existing, onClose, onSaved }) {
  const [form, setForm] = useState(() => existing || {
    incident_date: new Date().toISOString().slice(0, 10),
    title: '', description: '', category: 'Other', severity: 'Moderate',
    affected_assets: '', actions_taken: '', reported_to_dibnet: false,
    dibnet_report_date: '', icf_number: '', involved_cui: false, status: 'Open',
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const payload = {
      organization_id: project.organization_id, project_id: project.id,
      incident_date: form.incident_date, title: form.title, description: form.description,
      category: form.category, severity: form.severity, affected_assets: form.affected_assets,
      actions_taken: form.actions_taken, reported_to_dibnet: !!form.reported_to_dibnet,
      dibnet_report_date: form.dibnet_report_date || '', icf_number: form.icf_number || '',
      involved_cui: !!form.involved_cui, status: form.status,
    };
    if (existing?.id) await base44.entities.IncidentLog.update(existing.id, payload);
    else await base44.entities.IncidentLog.create(payload);
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
          <h2 className="text-sm font-bold text-slate-900">{existing ? 'Edit Incident' : 'Log Incident'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3 overflow-y-auto">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Title</label>
              <input className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Date</label>
              <input type="date" className="form-input" value={form.incident_date || ''} onChange={(e) => setForm({ ...form, incident_date: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
              <select className="form-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Severity</label>
              <select className="form-input" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>{SEVERITIES.map((c) => <option key={c}>{c}</option>)}</select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
            <textarea className="form-input min-h-[60px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Affected Assets</label>
            <input className="form-input" value={form.affected_assets} onChange={(e) => setForm({ ...form, affected_assets: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Actions Taken</label>
            <textarea className="form-input min-h-[60px]" value={form.actions_taken} onChange={(e) => setForm({ ...form, actions_taken: e.target.value })} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
              <select className="form-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{STATUSES.map((c) => <option key={c}>{c}</option>)}</select>
            </div>
            <label className="flex items-center gap-2 mt-6 cursor-pointer">
              <input type="checkbox" checked={!!form.involved_cui} onChange={(e) => setForm({ ...form, involved_cui: e.target.checked })} className="w-4 h-4 rounded border-slate-300" />
              <span className="text-sm text-slate-700">Involved CUI</span>
            </label>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!form.reported_to_dibnet} onChange={(e) => setForm({ ...form, reported_to_dibnet: e.target.checked })} className="w-4 h-4 rounded border-slate-300" />
              <span className="text-sm font-semibold text-amber-800">Reported to DIBNet (DFARS 72-hour reporting)</span>
            </label>
            {form.reported_to_dibnet && (
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-amber-700 mb-1">Report Date</label>
                  <input type="date" className="form-input" value={form.dibnet_report_date || ''} onChange={(e) => setForm({ ...form, dibnet_report_date: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-amber-700 mb-1">ICF Number</label>
                  <input className="form-input" value={form.icf_number || ''} onChange={(e) => setForm({ ...form, icf_number: e.target.value })} />
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200">Cancel</button>
          <button onClick={save} disabled={saving || !form.title.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52] disabled:opacity-60">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save
          </button>
        </div>
      </div>
    </div>
  );
}