import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

const fields = [
  ['filename_short_name', 'Filename short name'], ['policy_owner_name', 'Policy owner'],
  ['approving_authority_name', 'Approving authority'], ['default_responsible_team', 'Responsible team'],
  ['reporting_channel', 'Reporting channel'], ['document_repository', 'Document repository'],
  ['evidence_repository', 'Evidence repository'], ['retention_schedule', 'Retention schedule'],
  ['approval_workflow', 'Approval workflow'], ['timezone', 'Timezone'],
];

export default function DocumentConfigurationEditor({ project, configs, onChanged }) {
  const current = configs.find((c) => c.project_id === project.id) || configs.find((c) => !c.project_id) || {};
  const [form, setForm] = useState(/** @type {Record<string, any>} */ ({}));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => setForm({
    classification: current.classification || 'Internal', review_cycle_days: current.review_cycle_days || 365,
    timezone: current.timezone || 'America/Chicago', ...current,
  }), [current.id, project.id]);

  const save = async () => {
    setBusy(true); setMessage('');
    try {
      const payload = { project_id: project.id };
      for (const [key] of fields) payload[key] = form[key] || '';
      payload.classification = form.classification || 'Internal';
      payload.review_cycle_days = Number(form.review_cycle_days || 365);
      const res = await base44.functions.invoke('saveProjectDocumentConfiguration', payload);
      setMessage('Project document settings saved.');
      setForm(res.data.configuration);
      await onChanged();
    } catch (e) { setMessage(e.response?.data?.error || e.message); }
    finally { setBusy(false); }
  };

  return <div className="rounded-xl border border-slate-200 bg-white p-5">
    <h2 className="text-lg font-semibold text-slate-900">Project Document Settings</h2>
    <p className="mt-1 text-sm text-slate-500">These values populate policy ownership, repositories, review timing, reporting, classification, and filenames.</p>
    <div className="mt-5 grid gap-4 md:grid-cols-2">
      <label className="text-xs font-medium text-slate-600">Classification<select className="form-input mt-1" value={form.classification || 'Internal'} onChange={(e) => setForm((f) => ({ ...f, classification: e.target.value }))}><option>Public</option><option>Internal</option><option>Confidential</option></select></label>
      <label className="text-xs font-medium text-slate-600">Review cycle days<input type="number" min="1" max="3650" className="form-input mt-1" value={form.review_cycle_days || 365} onChange={(e) => setForm((f) => ({ ...f, review_cycle_days: e.target.value }))} /></label>
      {fields.map(([key, label]) => <label key={key} className="text-xs font-medium text-slate-600">{label}<input className="form-input mt-1" value={form[key] || ''} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} /></label>)}
    </div>
    <div className="mt-4 flex items-center gap-3"><button onClick={save} disabled={busy} className="rounded-lg bg-[#0F1E3C] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Saving…' : 'Save Project Settings'}</button>{message && <span className="text-xs text-slate-600">{message}</span>}</div>
  </div>;
}
