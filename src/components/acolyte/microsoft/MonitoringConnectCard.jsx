import { useState } from 'react';
import { Loader2, PlugZap, ShieldCheck } from 'lucide-react';
import { invokeConnection } from '@/lib/microsoftDeployment';

// Connect the organization's OWN Microsoft tenant for READ-ONLY monitoring.
// Uses the same isolated per-organization connection as the deployment
// capability; only READ permissions are required for monitoring.
export default function MonitoringConnectCard({ projectId, requiredPermissions = [], onConnected }) {
  const [form, setForm] = useState({ tenant_id: '', client_id: '', client_secret: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const connect = async () => {
    setBusy(true); setError('');
    try {
      await invokeConnection({ action: 'connect', project_id: projectId, ...form });
      onConnected();
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Connection failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-2 mb-2">
        <PlugZap className="w-4 h-4 text-[#0F1E3C]" />
        <h2 className="text-sm font-bold text-slate-800">Connect Your Microsoft Tenant</h2>
      </div>
      <p className="text-xs text-slate-500 mb-3">
        Create an app registration in your own Microsoft Entra tenant and grant it ONLY the
        read permissions below. Monitoring is read-only: no write permission is needed and
        Kipuka never changes your Microsoft configuration from this module.
      </p>
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-green-600" /> Required application permissions (read-only)
        </div>
        <div className="flex flex-wrap gap-1.5">
          {requiredPermissions.map((p) => (
            <span key={p} className="text-[11px] font-mono bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-700">{p}</span>
          ))}
        </div>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Tenant (directory) ID</label>
          <input className="form-input" value={form.tenant_id} onChange={(e) => setForm((f) => ({ ...f, tenant_id: e.target.value }))} placeholder="00000000-0000-0000-0000-000000000000" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Application (client) ID</label>
          <input className="form-input" value={form.client_id} onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))} placeholder="00000000-0000-0000-0000-000000000000" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Client secret</label>
          <input type="password" className="form-input" value={form.client_secret} onChange={(e) => setForm((f) => ({ ...f, client_secret: e.target.value }))} placeholder="Secret value" />
        </div>
      </div>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      <div className="mt-3 flex justify-end">
        <button onClick={connect} disabled={busy || !form.tenant_id || !form.client_id || !form.client_secret}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52] disabled:opacity-60">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} Verify & Connect Tenant
        </button>
      </div>
    </div>
  );
}