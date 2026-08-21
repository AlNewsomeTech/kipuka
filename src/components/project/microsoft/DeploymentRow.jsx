import { useState } from 'react';
import { format } from 'date-fns';
import { Loader2, RotateCcw, RefreshCw } from 'lucide-react';
import { STATUS_STYLES, DRIFT_STYLES, MODE_LABELS, invokeDeployment } from '@/lib/microsoftDeployment';

// One canonical definition + its Kipuka-managed deployment state (if any).
export default function DeploymentRow({ definition, deployment, connected, canDeploy, project, onOpenWizard, onChanged }) {
  const [busy, setBusy] = useState('');
  const [confirmRollback, setConfirmRollback] = useState(false);
  const [error, setError] = useState('');

  const status = deployment?.status || 'Precheck Required';

  const run = async (payload, label) => {
    setBusy(label);
    setError('');
    try {
      await invokeDeployment({ ...payload, project_id: project.id, deployment_id: deployment.id });
      setConfirmRollback(false);
      onChanged?.();
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="px-5 py-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-slate-900">{definition.display_label}</span>
            <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
              {definition.microsoft_service}
            </span>
            {deployment?.graph_object_id && (
              <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
                Kipuka managed
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">{definition.description}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap text-[11px] text-slate-400">
            <span className="font-semibold text-slate-500">{definition.primary_control_id}</span>
            {(definition.related_control_ids || []).filter((c) => c !== definition.primary_control_id).map((c) => (
              <span key={c}>{c}</span>
            ))}
            <span>· {MODE_LABELS[definition.initial_deployment_mode] || definition.initial_deployment_mode}</span>
            <span>· v{definition.definition_version}</span>
            {deployment?.verified_date && <span>· verified {format(new Date(deployment.verified_date), 'MMM d, yyyy')}</span>}
            {deployment?.last_drift_check && <span>· drift checked {format(new Date(deployment.last_drift_check), 'MMM d, yyyy')}</span>}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${STATUS_STYLES[status] || 'bg-slate-100 text-slate-500'}`}>{status}</span>
          {deployment && (
            <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${DRIFT_STYLES[deployment.drift_status] || DRIFT_STYLES.Unknown}`}>
              {deployment.drift_status || 'Unknown'}
            </span>
          )}
          {canDeploy && connected && (
            <>
              <button onClick={() => onOpenWizard(definition)} className="btn-primary text-xs">
                {deployment?.graph_object_id ? 'Update' : 'Deploy'}
              </button>
              {deployment?.graph_object_id && (
                <button onClick={() => run({ action: 'check_drift' }, 'drift')} disabled={!!busy} title="Check drift" className="btn-secondary text-xs">
                  {busy === 'drift' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                </button>
              )}
              {deployment?.rollback_available && (
                <button onClick={() => setConfirmRollback((v) => !v)} className="btn-secondary text-xs text-red-700">
                  <RotateCcw className="w-3.5 h-3.5" /> Rollback
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {deployment?.error_details && status !== 'Verified' && (
        <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-[12px] text-amber-800">{deployment.error_details}</div>
      )}
      {error && <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-[12px] text-red-800">{error}</div>}

      {confirmRollback && deployment && (
        <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-[13px] text-red-900 font-semibold mb-1">Restore the saved pre-change configuration?</p>
          <p className="text-[12px] text-red-800 mb-2">
            This PATCHes the stored Microsoft object ({deployment.graph_object_id}) back to the verified snapshot taken
            before Kipuka's change, reads it back to verify, and records evidence and an audit event.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => run({ action: 'rollback', approve: true, rollback_snapshot_sha256: deployment.rollback_snapshot_sha256 }, 'rollback')}
              disabled={!!busy}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-red-700 hover:bg-red-800 disabled:opacity-50"
            >
              {busy === 'rollback' ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : 'Approve rollback'}
            </button>
            <button onClick={() => setConfirmRollback(false)} className="btn-secondary text-xs">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}