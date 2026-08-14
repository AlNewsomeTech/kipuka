import { useState } from 'react';
import { Globe2, Loader2, ShieldCheck, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { normalizeWebsiteUrl, WEBSITE_AUTHORIZATION_STATEMENT } from '@/lib/websiteScanner';

export default function WebsiteTargetModal({
  project,
  clients = [],
  organizationName,
  user,
  onClose,
  onSaved,
}) {
  const [form, setForm] = useState({
    target_name: '',
    start_url: '',
    client_id: clients.length === 1 ? clients[0].id : '',
    scan_profile: 'Standard',
    max_pages: 10,
    request_timeout_seconds: 12,
    notes: '',
    authorization_attested: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const save = async () => {
    setError('');
    if (!form.target_name.trim()) {
      setError('Enter a name for this website.');
      return;
    }
    if (clients.length > 0 && !form.client_id) {
      setError('Assign this website to a client.');
      return;
    }
    if (!form.authorization_attested) {
      setError('Confirm the authorization statement before adding the target.');
      return;
    }

    let normalized;
    try {
      normalized = normalizeWebsiteUrl(form.start_url);
    } catch (urlError) {
      setError(urlError.message || 'Enter a valid public website URL.');
      return;
    }

    setSaving(true);
    try {
      const response = await base44.functions.invoke('runWebsiteScan', {
        action: 'create_target',
        project_id: project.id,
        client_id: form.client_id || '',
        target_name: form.target_name.trim(),
        start_url: normalized.toString(),
        authorization_attested: true,
        authorization_statement: WEBSITE_AUTHORIZATION_STATEMENT,
        scan_profile: form.scan_profile,
        max_pages: form.scan_profile === 'Baseline' ? 1 : Math.min(Math.max(Number(form.max_pages) || 10, 1), 15),
        request_timeout_seconds: Math.min(Math.max(Number(form.request_timeout_seconds) || 12, 5), 20),
        notes: form.notes.trim(),
      });
      const record = response?.data?.target;
      if (!record?.id) throw new Error('The server did not confirm the website target.');
      onSaved(record);
    } catch (saveError) {
      setError(saveError?.response?.data?.error || saveError?.message || 'The website target could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div className="app-surface w-full max-w-2xl rounded-2xl border border-slate-200 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <Globe2 className="h-5 w-5 text-blue-700" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Add authorized website</h2>
              <p className="mt-0.5 text-xs text-slate-500">Assign a public website to this ACOLYTE client project.</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Website name">
              <input className="form-input" value={form.target_name} onChange={(event) => set('target_name', event.target.value)} placeholder="Public company website" />
            </Field>
            <Field label="Website URL">
              <input className="form-input" value={form.start_url} onChange={(event) => set('start_url', event.target.value)} placeholder="https://www.example.com" />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Assigned client">
              {clients.length > 0 ? (
                <select className="form-input" value={form.client_id} onChange={(event) => set('client_id', event.target.value)}>
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
            <Field label="Scan profile">
              <select className="form-input" value={form.scan_profile} onChange={(event) => set('scan_profile', event.target.value)}>
                <option value="Baseline">Baseline, home page only</option>
                <option value="Standard">Standard, same-origin crawl</option>
              </select>
            </Field>
            <Field label="Maximum pages">
              <input type="number" min="1" max="15" disabled={form.scan_profile === 'Baseline'} className="form-input"
                value={form.scan_profile === 'Baseline' ? 1 : form.max_pages}
                onChange={(event) => set('max_pages', event.target.value)} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Request timeout in seconds">
              <input type="number" min="5" max="20" className="form-input" value={form.request_timeout_seconds}
                onChange={(event) => set('request_timeout_seconds', event.target.value)} />
            </Field>
            <Field label="Notes">
              <input className="form-input" value={form.notes} onChange={(event) => set('notes', event.target.value)} placeholder="Scope or authorization reference" />
            </Field>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
            <input type="checkbox" className="mt-0.5 h-4 w-4" checked={form.authorization_attested}
              onChange={(event) => set('authorization_attested', event.target.checked)} />
            <span>
              <span className="flex items-center gap-1.5 text-sm font-bold text-blue-900">
                <ShieldCheck className="h-4 w-4" /> Authorization required
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-slate-700">{WEBSITE_AUTHORIZATION_STATEMENT}</span>
              <span className="mt-1 block text-[11px] text-slate-500">
                The attestation is recorded with your identity and timestamp. Scans are non-destructive and limited to public website configuration checks.
              </span>
            </span>
          </label>

          {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">{error}</div>}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 p-5">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary disabled:opacity-60">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Add authorized target
          </button>
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
