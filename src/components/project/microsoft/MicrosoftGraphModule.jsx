import { useState, useEffect, useCallback } from 'react';
import { CloudCog, Lock } from 'lucide-react';
import { useOrg } from '@/lib/orgContext';
import { invokeDeployment, graphDeploymentEnabled, isMicrosoftStack } from '@/lib/microsoftDeployment';
import TenantConnectionCard from '@/components/project/microsoft/TenantConnectionCard';
import DeploymentLibrary from '@/components/project/microsoft/DeploymentLibrary';
import DeploymentWizard from '@/components/project/microsoft/DeploymentWizard';

// Optional Microsoft Graph Control Deployment module. Rendered only when the
// organization entitlement is on; shows a locked state otherwise. This is an
// acceleration option — the existing guided manual implementation workflow is
// unchanged and remains the default.
export default function MicrosoftGraphModule({ project, org, readOnly }) {
  const { selectedOrg } = useOrg();
  const organization = org || selectedOrg;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [wizardDefinition, setWizardDefinition] = useState(null);

  const enabled = graphDeploymentEnabled(organization);

  const load = useCallback(async () => {
    if (!enabled) { setLoading(false); return; }
    setLoading(true);
    setError('');
    try {
      setData(await invokeDeployment({ action: 'overview', project_id: project.id }));
    } catch (e) {
      setError(e?.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }, [project.id, enabled]);

  useEffect(() => { load(); }, [load]);

  if (!enabled) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <Lock className="w-8 h-8 text-slate-300 mx-auto mb-3" />
        <h1 className="text-lg font-bold text-slate-900 mb-1">Microsoft 365 Deployment</h1>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Automated Microsoft implementation is an optional platform capability that is not enabled for this
          organization. Your existing guided manual implementation workflow is unaffected.
        </p>
      </div>
    );
  }

  if (!isMicrosoftStack(project)) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <CloudCog className="w-8 h-8 text-slate-300 mx-auto mb-3" />
        <h1 className="text-lg font-bold text-slate-900 mb-1">Microsoft 365 Deployment</h1>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          This project's implementation stack is {project.implementation_stack || 'not Microsoft-based'}, so automated
          Microsoft deployment does not apply here. Use the guided manual implementation workflow instead.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5">
        <CloudCog className="w-5 h-5 text-[#0F1E3C]" />
        <div>
          <h1 className="text-lg font-bold text-slate-900">Microsoft 365 Deployment</h1>
          <p className="text-xs text-slate-500">
            Optional Graph-assisted implementation. Every change requires a precheck, a reviewed diff, and explicit
            approval — and is verified by reading the configuration back from Microsoft.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-[13px] text-red-800">{error}</div>
      )}

      <TenantConnectionCard project={project} connection={data?.connection} readOnly={readOnly} onChanged={load} />

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-400">Loading deployment library…</div>
      ) : (
        <DeploymentLibrary
          definitions={data?.definitions || []}
          deployments={data?.deployments || []}
          connected={data?.connection?.connection_status === 'Connected'}
          canDeploy={Boolean(data?.can_deploy) && !readOnly}
          project={project}
          onOpenWizard={setWizardDefinition}
          onChanged={load}
        />
      )}

      {wizardDefinition && (
        <DeploymentWizard
          project={project}
          definition={wizardDefinition}
          deployment={(data?.deployments || []).find((d) => d.definition_key === wizardDefinition.definition_key) || null}
          onClose={() => setWizardDefinition(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}