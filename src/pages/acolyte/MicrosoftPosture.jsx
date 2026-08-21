import { useState, useEffect, useCallback } from 'react';
import { Cloud, Loader2, Lock, BadgeCheck } from 'lucide-react';
import { useAcolyteScope } from '@/lib/useAcolyteScope';
import { invokeMonitoring, TELEMETRY_DISCLAIMER } from '@/lib/acolyteMicrosoft';
import { ACOLYTE_BRAND } from '@/lib/acolyte';
import AcolyteHeader from '@/components/acolyte/AcolyteHeader';
import AcolyteProjectBar from '@/components/acolyte/AcolyteProjectBar';
import NoProjectState from '@/components/acolyte/NoProjectState';
import MonitoringConnectCard from '@/components/acolyte/microsoft/MonitoringConnectCard';
import PostureScanBar from '@/components/acolyte/microsoft/PostureScanBar';
import PostureSnapshotSections from '@/components/acolyte/microsoft/PostureSnapshotSections';
import DriftPanel from '@/components/acolyte/microsoft/DriftPanel';

export default function MicrosoftPosture() {
  const scope = useAcolyteScope();
  const { project, projects, projectId, selectProject, orgNameForProject, readOnly } = scope;
  const [status, setStatus] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState('');
  const [scanResult, setScanResult] = useState(null);

  const load = useCallback(async () => {
    if (!projectId) { setStatus(null); setLoading(false); return; }
    setLoading(true);
    try {
      const data = await invokeMonitoring({ action: 'status', project_id: projectId });
      setStatus(data);
      if (data?.monitoring_enabled) {
        const list = await invokeMonitoring({ action: 'list_snapshots', project_id: projectId }).catch(() => null);
        setSnapshots(list?.snapshots || []);
      } else {
        setSnapshots([]);
      }
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const runScan = async () => {
    setScanning(true); setError(''); setScanResult(null);
    try {
      const result = await invokeMonitoring({ action: 'run_scan', project_id: projectId });
      setScanResult(result);
      await load();
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'The posture scan failed.');
    } finally {
      setScanning(false);
    }
  };

  const approveBaseline = async () => {
    if (!status?.latest_snapshot?.id) return;
    setApproving(true); setError('');
    try {
      await invokeMonitoring({ action: 'approve_baseline', project_id: projectId, snapshot_id: status.latest_snapshot.id });
      await load();
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Baseline approval failed.');
    } finally {
      setApproving(false);
    }
  };

  const snap = status?.latest_snapshot;

  return (
    <div className="space-y-4">
      <AcolyteHeader
        title="Microsoft 365 Posture Monitoring"
        subtitle="Read-only Microsoft Graph monitoring, evidence collection, and configuration drift detection."
        icon={Cloud}
      />
      <AcolyteProjectBar projects={projects} projectId={projectId} onSelect={selectProject} orgName={orgNameForProject} />

      {!project ? (
        <NoProjectState />
      ) : loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
      ) : !status?.monitoring_enabled ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
          <Lock className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <h2 className="text-sm font-bold text-slate-800 mb-1">Microsoft Graph monitoring is not enabled</h2>
          <p className="text-sm text-slate-500 max-w-lg mx-auto">
            ACOLYTE Microsoft Graph monitoring is an optional read-only capability enabled by Pacific
            Global Security Group for organizations with an ACOLYTE service entitlement. Contact
            Pac-Sec to add it to your service. All existing ACOLYTE features continue unchanged.
          </p>
        </div>
      ) : (
        <>
          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}
          {scanResult && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
              Scan complete ({scanResult.snapshot?.collection_status}): {scanResult.drift_items?.length || 0} drift item(s),{' '}
              {scanResult.findings_created} finding(s) created, {scanResult.findings_updated} updated,{' '}
              {scanResult.findings_pending_validation} moved to pending validation.
              {scanResult.evidence_id ? ' Raw Graph evidence preserved for review.' : ''}
            </div>
          )}

          {!status.connection || status.connection.connection_status !== 'Connected' ? (
            <MonitoringConnectCard
              projectId={projectId}
              requiredPermissions={status.required_read_permissions || []}
              onConnected={load}
            />
          ) : (
            <PostureScanBar
              connection={status.connection}
              latest={snap}
              canRun={status.can_run_scan && !readOnly}
              scanning={scanning}
              onRun={runScan}
            />
          )}

          {snap && (
            <>
              {/* Baseline */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <BadgeCheck className={`w-4 h-4 ${status.baseline ? 'text-green-600' : 'text-slate-300'}`} />
                  <div>
                    <div className="text-sm font-bold text-slate-800">Microsoft Baseline</div>
                    <div className="text-xs text-slate-500">
                      {status.baseline
                        ? `Approved by ${status.baseline.approved_by} on ${new Date(status.baseline.approved_date).toLocaleString()} (snapshot SHA-256 ${String(status.baseline.snapshot_sha256).slice(0, 12)}\u2026)`
                        : 'No approved baseline yet. The first scan is never treated as a baseline automatically — review a snapshot and approve it.'}
                    </div>
                  </div>
                </div>
                {status.can_approve_baseline && !readOnly && snap.id !== status.baseline?.snapshot_id && (
                  <button onClick={approveBaseline} disabled={approving}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52] disabled:opacity-60">
                    {approving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Approve Latest Snapshot as Microsoft Baseline
                  </button>
                )}
              </div>

              <DriftPanel snapshot={snap} deploymentEnabled={status.deployment_enabled} projectId={projectId} />
              <PostureSnapshotSections snapshot={snap} projectId={projectId} />

              {(snap.warnings || []).length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="text-xs font-bold text-amber-800 mb-1">Collection warnings (partial scan)</div>
                  <ul className="text-xs text-amber-800/90 list-disc pl-4 space-y-0.5">
                    {snap.warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}

              {/* Snapshot history — every scan is a new immutable record */}
              {snapshots.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <h2 className="text-sm font-bold text-slate-800 mb-3">Snapshot History</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-slate-500 border-b border-slate-200">
                          <th className="py-1.5 pr-3 font-semibold">Date</th>
                          <th className="py-1.5 pr-3 font-semibold">Status</th>
                          <th className="py-1.5 pr-3 font-semibold">Comparison</th>
                          <th className="py-1.5 pr-3 font-semibold">MFA</th>
                          <th className="py-1.5 pr-3 font-semibold">Secure Score</th>
                          <th className="py-1.5 pr-3 font-semibold">Drift</th>
                          <th className="py-1.5 font-semibold">Baseline</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {snapshots.map((s) => (
                          <tr key={s.id}>
                            <td className="py-1.5 pr-3 text-slate-700">{new Date(s.snapshot_date).toLocaleString()}</td>
                            <td className="py-1.5 pr-3 text-slate-600">{s.collection_status}</td>
                            <td className="py-1.5 pr-3 text-slate-600">{s.comparison_status}</td>
                            <td className="py-1.5 pr-3 text-slate-600">{s.mfa_coverage_percent != null ? `${s.mfa_coverage_percent}%` : '\u2014'}</td>
                            <td className="py-1.5 pr-3 text-slate-600">{s.secure_score_percent != null ? `${s.secure_score_percent}%` : '\u2014'}</td>
                            <td className="py-1.5 pr-3 text-slate-600">{s.drift_count}</td>
                            <td className="py-1.5">{s.is_approved_baseline ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-50 text-green-700">Approved</span> : ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {!snap && status.connection?.connection_status === 'Connected' && (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <p className="text-sm text-slate-500">No posture scan has been run yet. Run the first Microsoft 365 Posture Scan to collect identity, MFA, Conditional Access, Intune, and Secure Score posture.</p>
            </div>
          )}

          <p className="text-[11px] text-slate-400">{TELEMETRY_DISCLAIMER} {ACOLYTE_BRAND.preparedBy}.</p>
        </>
      )}
    </div>
  );
}