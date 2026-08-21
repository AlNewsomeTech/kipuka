import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Cloud, ArrowRight } from 'lucide-react';
import { invokeMonitoring, TELEMETRY_DISCLAIMER } from '@/lib/acolyteMicrosoft';

function Tile({ label, value, tone = 'slate' }) {
  const tones = { slate: 'text-slate-700', red: 'text-red-600', green: 'text-green-600', amber: 'text-amber-600' };
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
      <div className={`text-xl font-bold ${tones[tone]}`}>{value ?? '\u2014'}</div>
      <div className="text-[11px] font-medium text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}

// Compact Microsoft 365 posture panel for the ACOLYTE overview dashboard.
// Renders NOTHING unless the monitoring entitlement is enabled server-side,
// so organizations without the option see no behavioral change.
export default function MicrosoftPosturePanel({ projectId }) {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    let alive = true;
    setStatus(null);
    if (!projectId) return undefined;
    invokeMonitoring({ action: 'status', project_id: projectId })
      .then((data) => { if (alive) setStatus(data); })
      .catch(() => { if (alive) setStatus(null); });
    return () => { alive = false; };
  }, [projectId]);

  if (!status?.monitoring_enabled) return null;
  const snap = status.latest_snapshot;
  const ca = snap?.conditional_access_summary || {};
  const mfa = snap?.mfa_summary || {};
  const devices = snap?.device_summary || {};
  const score = snap?.secure_score_summary || {};
  const driftCount = snap?.drift_summary?.items?.length || 0;
  const connected = status.connection?.connection_status === 'Connected';

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Cloud className="w-4 h-4 text-[#0F1E3C]" />
          <h2 className="text-sm font-bold text-slate-800">Microsoft 365 Posture</h2>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${connected ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {connected ? status.connection?.connection_health || 'Connected' : 'Disconnected'}
          </span>
        </div>
        <Link to="/acolyte/microsoft" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline">
          Open posture monitoring <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      {!snap ? (
        <p className="text-sm text-slate-500">No posture scan yet. Run the first Microsoft 365 posture scan from the monitoring page.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            <Tile label="MFA Coverage" value={mfa.coverage_percent != null ? `${mfa.coverage_percent}%` : null} />
            <Tile label="CA Policies" value={ca.total} />
            <Tile label="Kipuka-managed" value={ca.kipuka_managed} />
            <Tile label="Drift Items" value={driftCount} tone={driftCount ? 'red' : 'green'} />
            <Tile label="Managed Devices" value={devices.total} />
            <Tile label="Noncompliant" value={devices.noncompliant} tone={devices.noncompliant ? 'amber' : 'slate'} />
            <Tile label="Secure Score" value={score.percent != null ? `${score.percent}%` : null} />
            <Tile label="MS Findings" value={status.open_findings} tone={status.high_or_critical_findings ? 'red' : 'slate'} />
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Last scan {snap.snapshot_date ? new Date(snap.snapshot_date).toLocaleString() : '\u2014'}. {TELEMETRY_DISCLAIMER}
          </p>
        </>
      )}
    </div>
  );
}