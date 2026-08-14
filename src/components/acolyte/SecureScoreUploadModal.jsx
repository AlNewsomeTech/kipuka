import { useState } from 'react';
import { FileJson, FileSpreadsheet, Loader2, ShieldCheck, Upload, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const MAX_FILE_BYTES = 10_000_000;

export default function SecureScoreUploadModal({
  project,
  clients = [],
  organizationName,
  onClose,
  onSaved,
}) {
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({
    client_id: clients.length === 1 ? clients[0].id : '',
    report_date: '',
    tenant_id: '',
    current_score: '',
    max_score: '',
    notes: '',
  });
  const [stage, setStage] = useState('');
  const [error, setError] = useState('');

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const chooseFile = (event) => {
    const selected = event.target.files?.[0] || null;
    setError('');
    if (!selected) {
      setFile(null);
      return;
    }
    const extension = selected.name.toLowerCase().split('.').pop();
    if (!['csv', 'json'].includes(extension)) {
      setFile(null);
      setError('Choose a Microsoft Secure Score CSV or Microsoft Graph JSON export.');
      return;
    }
    if (!selected.size || selected.size > MAX_FILE_BYTES) {
      setFile(null);
      setError('The export must contain data and be no larger than 10 MB.');
      return;
    }
    setFile(selected);
  };

  const save = async () => {
    setError('');
    if (!file) {
      setError('Choose a Secure Score export.');
      return;
    }
    if (clients.length > 0 && !form.client_id) {
      setError('Assign this export to a client.');
      return;
    }
    const hasCurrent = form.current_score !== '';
    const hasMaximum = form.max_score !== '';
    if (hasCurrent !== hasMaximum) {
      setError('Enter both current and maximum score, or leave both blank for automatic parsing.');
      return;
    }
    if (hasCurrent && (Number(form.current_score) < 0 || Number(form.max_score) <= 0 || Number(form.current_score) > Number(form.max_score))) {
      setError('Current score must be between zero and the maximum score.');
      return;
    }

    try {
      setStage('Uploading export');
      const uploaded = await base44.integrations.Core.UploadFile({ file });
      if (!uploaded?.file_url) throw new Error('The upload service did not return a file URL.');
      setStage('Securing and parsing');
      const response = await base44.functions.invoke('manageSecureScoreImport', {
        action: 'upload',
        project_id: project.id,
        client_id: form.client_id || '',
        file_url: uploaded.file_url,
        original_file_name: file.name,
        report_date: form.report_date,
        tenant_id: form.tenant_id.trim(),
        current_score: form.current_score,
        max_score: form.max_score,
        notes: form.notes.trim(),
      });
      const record = response?.data?.import;
      if (!record?.id) throw new Error('The server did not confirm the Secure Score import.');
      onSaved(record);
    } catch (saveError) {
      setError(saveError?.response?.data?.error || saveError?.message || 'The Secure Score export could not be stored.');
    } finally {
      setStage('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !stage) onClose();
    }}>
      <div className="app-surface w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
              <ShieldCheck className="h-5 w-5 text-blue-700" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Upload Microsoft Secure Score export</h2>
              <p className="mt-0.5 text-xs text-slate-500">Assign, privately store, hash, and summarize the export for this ACOLYTE project.</p>
            </div>
          </div>
          <button onClick={onClose} disabled={Boolean(stage)} aria-label="Close" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <label className="block cursor-pointer rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/60 p-5 text-center hover:border-blue-400">
            <input type="file" accept=".csv,.json,text/csv,application/json" className="sr-only" onChange={chooseFile} disabled={Boolean(stage)} />
            <div className="flex justify-center">
              {file?.name.toLowerCase().endsWith('.json')
                ? <FileJson className="h-8 w-8 text-blue-700" />
                : <FileSpreadsheet className="h-8 w-8 text-blue-700" />}
            </div>
            <div className="mt-2 text-sm font-bold text-slate-900">{file?.name || 'Choose CSV or JSON export'}</div>
            <div className="mt-1 text-xs text-slate-600">
              {file ? `${(file.size / 1024).toFixed(1)} KB selected` : 'Maximum 10 MB. The original file is retained in private storage.'}
            </div>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Assigned client">
              {clients.length ? (
                <select className="form-input" value={form.client_id} onChange={(event) => set('client_id', event.target.value)} disabled={Boolean(stage)}>
                  <option value="">Select client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>{client.legal_name || client.dba_name || 'Unnamed client'}</option>
                  ))}
                </select>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {organizationName || project.project_name}
                </div>
              )}
            </Field>
            <Field label="Report date, optional">
              <input type="date" className="form-input" value={form.report_date} onChange={(event) => set('report_date', event.target.value)} disabled={Boolean(stage)} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Current score, optional">
              <input type="number" min="0" step="0.1" className="form-input" value={form.current_score}
                onChange={(event) => set('current_score', event.target.value)} placeholder="Auto-detect" disabled={Boolean(stage)} />
            </Field>
            <Field label="Maximum score, optional">
              <input type="number" min="0.1" step="0.1" className="form-input" value={form.max_score}
                onChange={(event) => set('max_score', event.target.value)} placeholder="Auto-detect" disabled={Boolean(stage)} />
            </Field>
            <Field label="Microsoft tenant ID, optional">
              <input className="form-input" value={form.tenant_id} onChange={(event) => set('tenant_id', event.target.value)}
                placeholder="Auto-detect" disabled={Boolean(stage)} />
            </Field>
          </div>

          <Field label="Import notes, optional">
            <textarea rows={3} className="form-input" value={form.notes} onChange={(event) => set('notes', event.target.value)}
              placeholder="Export scope, collection method, or reviewer notes" disabled={Boolean(stage)} />
          </Field>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
            CSV and Graph JSON layouts are parsed using recognized Secure Score fields. If the layout cannot be recognized, ACOLYTE preserves the original export and marks it for review instead of calculating an unsupported score.
          </div>

          {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">{error}</div>}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-200 p-5">
          <div className="text-xs font-semibold text-blue-700">{stage}</div>
          <div className="flex gap-2">
            <button onClick={onClose} disabled={Boolean(stage)} className="btn-secondary disabled:opacity-50">Cancel</button>
            <button onClick={save} disabled={Boolean(stage) || !file} className="btn-primary disabled:opacity-50">
              {stage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {stage || 'Store export'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span>
      {children}
    </label>
  );
}
