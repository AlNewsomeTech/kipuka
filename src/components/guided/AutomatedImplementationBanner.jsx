import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Zap, ArrowUpRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { graphDeploymentEnabled, isMicrosoftStack } from '@/lib/microsoftDeployment';

// Shown inside the guided DO step ONLY when the organization has the optional
// Microsoft Graph deployment entitlement AND a canonical definition exists for
// this control. The click-by-click manual instructions below always remain —
// this is an optional acceleration, never a replacement.
export default function AutomatedImplementationBanner({ organization, project, controlId }) {
  const [available, setAvailable] = useState(false);
  const enabled = graphDeploymentEnabled(organization) && isMicrosoftStack(project);

  useEffect(() => {
    let alive = true;
    if (!enabled || !controlId) { setAvailable(false); return; }
    base44.entities.MicrosoftPolicyDefinition.filter({ active: true }).then((defs) => {
      if (!alive) return;
      setAvailable(defs.some((d) =>
        d.primary_control_id === controlId || (d.related_control_ids || []).includes(controlId)));
    }).catch(() => {});
    return () => { alive = false; };
  }, [enabled, controlId]);

  if (!enabled || !available) return null;

  return (
    <div className="flex items-center justify-between gap-3 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5">
      <div className="flex items-start gap-2">
        <Zap className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-[13px] text-blue-950">
          <span className="font-bold">Automated Microsoft implementation available.</span>{' '}
          You can deploy this configuration through Microsoft Graph with a precheck, reviewed diff, and explicit
          approval — or continue with the guided manual steps below.
        </div>
      </div>
      <Link
        to={`/projects/${project.id}/microsoft`}
        className="inline-flex items-center gap-1 flex-shrink-0 text-xs font-bold text-blue-700 hover:underline"
      >
        Open deployment <ArrowUpRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}