import { useState } from 'react';
import { X, Loader2, SearchCheck, ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { invokeDeployment, MODE_LABELS } from '@/lib/microsoftDeployment';
import DeploymentDiff from '@/components/project/microsoft/DeploymentDiff';

// Staged Graph-assisted implementation: PRECHECK → BUILD & DIFF → APPROVE AND
// DEPLOY → READ BACK & VERIFY. Precheck makes no changes; nothing deploys
// without explicit approval of the exact configuration hash.
export default function DeploymentWizard({ project, definition, deployment, onClose, onChanged }) {
  const [precheck, setPrecheck] = useState(null);
  const [result, setResult] = useState(null);
  const [approved, setApproved] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const runPrecheck = async () => {
    setBusy('precheck');
    setError('');
    try {
      const data = await invokeDeployment({ action: 'precheck', project_id: project.id, definition_id: definition.id });
      setPrecheck(data);
      onChanged?.();
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setBusy('');
    }
  };

  const runDeploy = async () => {
    setBusy('deploy');
    setError('');
    try {
      const data = await invokeDeployment({
        action: 'deploy', project_id: project.id, deployment_id: precheck.deployment.id,
        approve: true, approved_desired_sha256: precheck.deployment.desired_sha256,
      });
      setResult(data);
      onChanged?.();
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setBusy('');
    }
  };

  const blocked = precheck && (precheck.name_conflict || (precheck.permissions?.missing || []).length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <div>
            <h3 className="text-base font-semibold text-slate-800">{definition.display_label}</h3>
            <p className="text-[11px] text-slate-400">
              {definition.microsoft_service} · {definition.primary_control_id} · v{definition.definition_version} · {MODE_LABELS[definition.initial_deployment_mode]}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-[13px] text-red-800">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /> {error}
            </div>
          )}

          {result ? (
            <ResultPanel result={result} />
          ) : !precheck ? (
            <div className="text-center py-6">
              <SearchCheck className="w-8 h-8 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-600 max-w-md mx-auto mb-1 font-semibold">Stage 1 — Precheck (read-only)</p>
              <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
                Kipuka reads the current tenant configuration, verifies the tenant identity, Graph permissions,
                existing policies, and conflicts. No changes are made during precheck.
              </p>
              <button onClick={runPrecheck} disabled={!!busy} className="btn-primary text-sm">
                {busy === 'precheck' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Run precheck'}
              </button>
              {deployment?.graph_object_id && (
                <p className="text-[11px] text-slate-400 mt-3">
                  This policy is already Kipuka-managed (object {deployment.graph_object_id}); deployment will UPDATE it
                  in place and keep its original name and date.
                </p>
              )}
            </div>
          ) : (
            <>
              <PrecheckSummary precheck={precheck} definition={definition} />
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Stage 3 — Review the exact changes</div>
                <DeploymentDiff diff={precheck.diff} />
              </div>

              {!blocked && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-2">Stage 4 — Approval</div>
                  <label className="flex items-start gap-2 text-[13px] text-blue-950">
                    <input type="checkbox" className="mt-0.5" checked={approved} onChange={(e) => setApproved(e.target.checked)} />
                    <span>
                      I reviewed the comparison above and approve deploying
                      <span className="font-mono font-semibold"> {precheck.deployment.deployed_display_name} </span>
                      exactly as proposed (configuration hash {precheck.deployment.desired_sha256.slice(0, 12)}…).
                      {definition.graph_resource_type === 'conditionalAccessPolicy' && precheck.deployment.deployment_mode === 'report_only' && (
                        <> The policy starts in <strong>report-only</strong> mode and will not enforce or lock anyone out.</>
                      )}
                    </span>
                  </label>
                  <button onClick={runDeploy} disabled={!approved || !!busy} className="btn-primary text-sm mt-3">
                    {busy === 'deploy' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Approve and Deploy'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, mono = false }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400 mb-0.5">{label}</div>
      <div className={`text-slate-800 break-all ${mono ? 'font-mono text-[12px]' : ''}`}>{value}</div>
    </div>
  );
}

function PrecheckSummary({ precheck, definition }) {
  const missing = precheck.permissions?.missing || [];
  return (
    <div className="space-y-3">
      {precheck.name_conflict && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2.5 text-[13px] text-orange-800">
          <strong>Conflict detected:</strong> an existing Microsoft policy already uses the proposed name and was not
          created by Kipuka. Kipuka will not claim or overwrite it. Resolve the conflict in your tenant first.
        </div>
      )}
      {missing.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-[13px] text-amber-800">
          <strong>Missing Graph application permissions:</strong> {missing.join(', ')}. Grant these (with admin consent)
          to the connected app registration, then run the precheck again.
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px]">
        <Info label="Generated policy name" value={precheck.deployment.deployed_display_name} mono />
        <Info label="Tenant" value={`${precheck.tenant.domain || ''} (${precheck.tenant.id})`} mono />
        <Info label="Assignments" value={precheck.deployment.assignment_summary || 'None'} />
        <Info label="Exclusions" value={precheck.deployment.exclusion_summary || 'None'} />
        <Info label="Supported controls" value={[definition.primary_control_id, ...(definition.related_control_ids || [])].filter((v, i, a) => a.indexOf(v) === i).join(', ')} />
        <Info label="Assessment objectives" value={(definition.related_objective_ids || []).join(', ') || '—'} />
      </div>
      {(precheck.existing_policies || []).length > 0 && (
        <div>
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Discovered existing Microsoft policies (not managed by Kipuka)</div>
          <div className="rounded-lg border border-slate-200 divide-y divide-slate-100 max-h-40 overflow-y-auto">
            {precheck.existing_policies.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-3 py-1.5 text-[12px]">
                <span className="text-slate-700 truncate">{p.displayName}</span>
                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${p.kipuka_managed ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                  {p.kipuka_managed ? 'Kipuka managed' : 'Discovered'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ResultPanel({ result }) {
  const ok = result.verified;
  return (
    <div className={`rounded-xl border p-5 ${ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
      <div className="flex items-center gap-2 mb-2">
        {ok ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <AlertTriangle className="w-5 h-5 text-red-600" />}
        <span className={`text-sm font-bold ${ok ? 'text-green-900' : 'text-red-900'}`}>
          {ok ? 'Deployed and verified' : 'Deployed but verification failed'}
        </span>
      </div>
      <p className={`text-[13px] ${ok ? 'text-green-900' : 'text-red-900'}`}>
        {ok
          ? 'The configuration was read back from Microsoft Graph and matches the approved configuration. Before/after evidence was created in the project evidence queue (Needs Review) — final control determination still follows the normal assessment workflow.'
          : 'The change was submitted but the configuration Microsoft returned does not match the approved configuration. The deployment is marked Verification Failed and was NOT recorded as compliant.'}
      </p>
      {!ok && (result.failures || []).length > 0 && (
        <ul className="mt-2 space-y-1 text-[12px] text-red-800 list-disc pl-5">
          {result.failures.map((f, i) => <li key={i}>{f}</li>)}
        </ul>
      )}
      <div className="flex items-center gap-2 mt-3 text-[11px] text-slate-500">
        <ShieldCheck className="w-3.5 h-3.5" />
        Evidence: {result.before_evidence_id ? 'before snapshot ✓' : 'before snapshot unavailable'} · {result.after_evidence_id ? 'after snapshot ✓' : 'after snapshot unavailable'}
      </div>
    </div>
  );
}