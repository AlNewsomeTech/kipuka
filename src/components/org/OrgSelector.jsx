import { Building2 } from 'lucide-react';
import { useOrg } from '@/lib/orgContext';
import { useClient } from '@/lib/clientContext';
import TierBadge from './TierBadge';

// Compact org badge for the top header. Follows the active client's
// organization so the badge always matches the client shown on the page.
export default function OrgSelector() {
  const { organizations } = useOrg();
  const { selectedClient } = useClient();

  if (organizations.length === 0) return null;

  // The badge follows the active client's organization. When no specific
  // client is selected (e.g. "All Clients"), show a neutral label instead of
  // naming a single organization.
  const clientOrg = selectedClient?.organization_id
    ? organizations.find((o) => o.id === selectedClient.organization_id)
    : null;

  if (selectedClient) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Building2 className="w-4 h-4 text-slate-400" />
        <span className="font-semibold text-slate-800 truncate max-w-[180px]">{clientOrg?.organization_name || 'No organization'}</span>
        {clientOrg && <TierBadge tier={clientOrg.subscription_tier} />}
      </div>
    );
  }

  // No specific client selected (e.g. "All Clients") — show a neutral label,
  // never a single organization's name/tier.
  return (
    <div className="flex items-center gap-2 text-sm">
      <Building2 className="w-4 h-4 text-slate-400" />
      <span className="font-semibold text-slate-800 truncate max-w-[180px]">All Organizations</span>
    </div>
  );
}