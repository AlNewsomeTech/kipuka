import { useState, useMemo } from 'react';
import DeploymentRow from '@/components/project/microsoft/DeploymentRow';
import { DEPLOYMENT_STATUSES, controlFamily } from '@/lib/microsoftDeployment';

// Microsoft policy library: canonical Pac-Sec definitions plus this project's
// KIPUKA-MANAGED deployments, with filtering by service / control family /
// status / drift. Discovered (non-Kipuka) tenant policies are shown inside the
// deployment wizard's precheck results and are never claimed here.
export default function DeploymentLibrary({ definitions, deployments, connected, canDeploy, project, onOpenWizard, onChanged }) {
  const [service, setService] = useState('');
  const [family, setFamily] = useState('');
  const [status, setStatus] = useState('');
  const [drift, setDrift] = useState('');

  const byKey = useMemo(() => {
    const map = new Map();
    for (const d of deployments) map.set(d.definition_key, d);
    return map;
  }, [deployments]);

  const services = [...new Set(definitions.map((d) => d.microsoft_service).filter(Boolean))];
  const families = [...new Set(definitions.map((d) => controlFamily(d.primary_control_id)).filter(Boolean))].sort();

  const rows = definitions.filter((def) => {
    const dep = byKey.get(def.definition_key);
    if (service && def.microsoft_service !== service) return false;
    if (family && controlFamily(def.primary_control_id) !== family) return false;
    if (status && (dep?.status || 'Precheck Required') !== status) return false;
    if (drift && (dep?.drift_status || 'Unknown') !== drift) return false;
    return true;
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Microsoft policy library</h2>
          <p className="text-xs text-slate-500">
            {definitions.length} canonical implementation baselines · {deployments.length} Kipuka-managed deployments in this project
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select className="form-input text-xs py-1.5 w-auto" value={service} onChange={(e) => setService(e.target.value)}>
            <option value="">All services</option>
            {services.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="form-input text-xs py-1.5 w-auto" value={family} onChange={(e) => setFamily(e.target.value)}>
            <option value="">All control families</option>
            {families.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <select className="form-input text-xs py-1.5 w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {DEPLOYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="form-input text-xs py-1.5 w-auto" value={drift} onChange={(e) => setDrift(e.target.value)}>
            <option value="">All drift states</option>
            {['Unknown', 'In Sync', 'Drift Detected'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {!connected && (
        <div className="px-5 py-3 bg-amber-50 border-b border-amber-200 text-[13px] text-amber-800">
          Connect the Microsoft tenant above to run prechecks and deployments. The library is read-only until then.
        </div>
      )}

      {rows.length === 0 ? (
        <div className="p-8 text-center text-sm text-slate-400">No policies match the selected filters.</div>
      ) : (
        <div className="divide-y divide-slate-100">
          {rows.map((def) => (
            <DeploymentRow
              key={`${def.definition_key}@${def.definition_version}`}
              definition={def}
              deployment={byKey.get(def.definition_key) || null}
              connected={connected}
              canDeploy={canDeploy}
              project={project}
              onOpenWizard={onOpenWizard}
              onChanged={onChanged}
            />
          ))}
        </div>
      )}
    </div>
  );
}