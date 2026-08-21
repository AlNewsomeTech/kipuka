import { useState, useEffect } from 'react';
import { Cloud } from 'lucide-react';
import { invokeMonitoring, TELEMETRY_DISCLAIMER } from '@/lib/acolyteMicrosoft';

// Supporting Microsoft telemetry for readiness reviews. Renders nothing when
// the monitoring entitlement is disabled or no scan exists. Informational
// only: it never sets review statuses, and Secure Score alone never
// determines CMMC readiness.
export default function MicrosoftTelemetryHint({ projectId }) {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    let alive = true;
    if (!projectId) return undefined;
    invokeMonitoring({ action: 'status', project_id: projectId })
      .then((data) => { if (alive) setStatus(data); })
      .catch(() => { if (alive) setStatus(null); });
    return () => { alive = false; };
  }, [projectId]);

  const snap = status?.latest_snapshot;
  if (!status?.monitoring_enabled || !snap) return null;
  const mfa = snap.mfa_summary || {};
  const ca = snap.conditional_access_summary || {};
  const devices = snap.device_summary || {};
  const score = snap.secure_score_summary || {};
  const drift = snap.drift_summary?.items?.length || 0;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
      <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900 mb-1">
        <Cloud className="w-3.5 h-3.5" /> Microsoft telemetry (latest posture scan {snap.snapshot_date ? new Date(snap.snapshot_date).toLocaleDateString() : ''})
      </div>
      <div className="text-xs text-blue-900/80 flex flex-wrap gap-x-4 gap-y-0.5">
        <span>MFA coverage: <b>{mfa.coverage_percent != null ? `${mfa.coverage_percent}%` : '\u2014'}</b></span>
        <span>Conditional Access policies: <b>{ca.total ?? '\u2014'}</b></span>
        <span>Noncompliant devices: <b>{devices.noncompliant ?? '\u2014'}</b> of {devices.total ?? '\u2014'}</span>
        <span>Secure Score: <b>{score.percent != null ? `${score.percent}%` : '\u2014'}</b></span>
        <span>Open drift items: <b>{drift}</b></span>
      </div>
      <p className="text-[11px] text-blue-900/70 mt-1">
        Use as supporting source information for identity/access, cloud posture, endpoint posture, and compliance alignment. {TELEMETRY_DISCLAIMER}
      </p>
    </div>
  );
}