import { useState } from 'react';
import { PlugZap, ShieldCheck, AlertTriangle, Loader2 } from 'lucide-react';
import { invokeConnection } from '@/lib/microsoftDeployment';

const HEALTH_STYLES = {
  Healthy: 'bg-green-50 text-green-700', Degraded: 'bg-amber-50 text-amber-700',
  Failed: 'bg-red-50 text-red-700', Unknown: 'bg-slate-100 text-slate-500',
};

// Organization-owned Microsoft tenant connection. Each customer connects its
// OWN Entra app registration — Kipuka never shares one Microsoft connection
// across organizations. The client secret is sent once to the backend and
// stored service-only; it is never readable from the browser afterward.
export default function TenantConnectionCard({ project, connection, readOnly, onChanged }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ tenant_id: '', client_id: '', client_secret: '' });
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const run = async (payload, label) => {
    setBusy(label);
    setError('');
    try {
      await invokeConnection({ ...payload, project_id: project.id });
      setShowForm(false);
      setForm({ tenant_id: '', client_id: '', client_secret: '' });
      onChanged?.();
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setBusy('');
    }
  };

  const connected = connection?.connection_status === 'Connected';

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-start gap-3">
          <div className={`rounded-lg p-2 ${connected ? 'bg-green-50' : 'bg-slate-100'}`}>
            {connected ? <ShieldCheck className="w-5 h-5 text-green-600" /> : <PlugZap className="w-5 h-5 text-slate-400" />}
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900">Microsoft tenant connection</div>
            {connected ? (
              <div className="text-xs text-slate-500 mt-0.5 space-y-0.5">
                <div>{connection.tenant_display_name || 'Tenant'} — {connection.tenant_primary_domain || 'no domain on record'}</div>
                <div className="font-mono text-[11px]">Tenant ID: {connection.tenant_id}</div>
                <div>Connected by {connection.connected_by} · {connection.granted_scopes?.length || 0} Graph application permissions granted</div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 mt-0.5 max-w-lg">
                {connection?.connection_status === 'Disconnected' || connection?.connection_status === 'Error'
                  ? `Status: ${connection.connection_status}. ${connection.error_details || ''}`
                  : 'Connect this organization\'s own Entra app registration (client-credentials) to enable Graph-assisted deployment. Request only the least-privilege policy permissions listed on each deployment.'}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {connection && (
            <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${HEALTH_STYLES[connection.connection_health] || HEALTH_STYLES.Unknown}`}>
              {connection.connection_health || 'Unknown'}
            </span>
          )}
          {!readOnly && (
            <>
              {connected && (
                <>
                  <button onClick={() => run({ action: 'test' }, 'test')} disabled={!!busy} className="btn-secondary text-xs">
                    {busy === 'test' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Test'}
                  </button>
                  <button onClick={() => run({ action: 'disconnect' }, 'disconnect')} disabled={!!busy} className="btn-secondary text-xs text-red-700">
                    {busy === 'disconnect' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Disconnect'}
                  </button>
                </>
              )}
              {!connected && (
                <button onClick={() => setShowForm((v) => !v)} className="btn-primary text-xs">
                  {showForm ? 'Cancel' : 'Connect tenant'}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-[13px] text-red-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {error}
        </div>
      )}

      {showForm && !readOnly && (
        <div className="mt-4 border-t border-slate-200 pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Tenant (directory) ID</label>
            <input className="form-input font-mono text-xs" value={form.tenant_id} onChange={(e) => setForm((f) => ({ ...f, tenant_id: e.target.value }))} placeholder="00000000-0000-0000-0000-000000000000" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Application (client) ID</label>
            <input className="form-input font-mono text-xs" value={form.client_id} onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))} placeholder="00000000-0000-0000-0000-000000000000" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Client secret</label>
            <input type="password" className="form-input text-xs" value={form.client_secret} onChange={(e) => setForm((f) => ({ ...f, client_secret: e.target.value }))} placeholder="Secret value" />
          </div>
          <div className="sm:col-span-3 flex items-center justify-between flex-wrap gap-2">
            <p className="text-[11px] text-slate-400 max-w-xl">
              Create an app registration in YOUR tenant, grant only the Graph application permissions required for the
              policies you deploy (with admin consent), then paste the values here. The secret is verified against your
              tenant and stored server-side only.
            </p>
            <button
              onClick={() => run({ action: 'connect', ...form }, 'connect')}
              disabled={!!busy || !form.tenant_id || !form.client_id || !form.client_secret}
              className="btn-primary text-xs"
            >
              {busy === 'connect' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Verify and connect'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}