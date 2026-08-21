import { Loader2, RefreshCcw, Radar } from 'lucide-react';
import { CONNECTION_HEALTH_STYLES } from '@/lib/acolyteMicrosoft';

function fmt(dt) {
  return dt ? new Date(dt).toLocaleString() : '\u2014';
}

// Manual scan workflow: unattended scheduled scans are not offered because the
// authorization model is per-organization client credentials run server-side
// on demand; the snapshot data model supports adding secure scheduled
// collection later without changes.
export default function PostureScanBar({ connection, latest, canRun, scanning, onRun }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-4 flex-wrap">
        <div>
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Microsoft Connection</div>
          <span className={`inline-block mt-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${CONNECTION_HEALTH_STYLES[connection?.connection_health] || CONNECTION_HEALTH_STYLES.Unknown}`}>
            {connection?.connection_status === 'Connected' ? connection?.connection_health || 'Unknown' : 'Disconnected'}
          </span>
        </div>
        <div>
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Tenant</div>
          <div className="text-sm font-medium text-slate-800 mt-0.5">{connection?.tenant_primary_domain || connection?.tenant_id || '\u2014'}</div>
        </div>
        <div>
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Last Microsoft scan</div>
          <div className="text-sm font-medium text-slate-800 mt-0.5">{fmt(latest?.snapshot_date)}</div>
        </div>
        <div>
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Scan mode</div>
          <div className="text-sm font-medium text-slate-800 mt-0.5">Manual, on demand</div>
        </div>
      </div>
      {canRun && (
        <button onClick={onRun} disabled={scanning}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52] disabled:opacity-60">
          {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radar className="w-4 h-4" />}
          {scanning ? 'Scanning\u2026' : 'Run Microsoft 365 Posture Scan'}
        </button>
      )}
      {!canRun && (
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500"><RefreshCcw className="w-3.5 h-3.5" /> Read-only access: scans run by authorized roles.</span>
      )}
    </div>
  );
}