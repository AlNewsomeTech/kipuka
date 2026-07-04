import { Building2, ChevronDown } from 'lucide-react';
import { useOrg } from '@/lib/orgContext';
import { useClient } from '@/lib/clientContext';
import TierBadge from './TierBadge';

// Compact org switcher for the top header. Follows the active client's
// organization so the badge always matches the client shown on the page.
export default function OrgSelector() {
  const { organizations, selectedOrgId, selectOrg, selectedOrg } = useOrg();
  const { selectedClient } = useClient();

  if (organizations.length === 0) return null;

  // When a client is selected, show that client's organization (falling back
  // to the currently selected org) so the two selectors stay in sync.
  const clientOrg = selectedClient?.organization_id
    ? organizations.find((o) => o.id === selectedClient.organization_id)
    : null;
  const displayOrg = clientOrg || selectedOrg;

  if (organizations.length === 1 || clientOrg) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Building2 className="w-4 h-4 text-slate-400" />
        <span className="font-semibold text-slate-800 truncate max-w-[180px]">{displayOrg?.organization_name || 'No organization'}</span>
        {displayOrg && <TierBadge tier={displayOrg.subscription_tier} />}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Building2 className="w-4 h-4 text-slate-400" />
      <div className="relative">
        <select
          value={selectedOrgId || ''}
          onChange={(e) => selectOrg(e.target.value || null)}
          className="appearance-none bg-white border border-slate-200 rounded-lg pl-3 pr-8 py-1.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        >
          <option value="">Select organization…</option>
          {organizations.map((o) => (
            <option key={o.id} value={o.id}>{o.organization_name}</option>
          ))}
        </select>
        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
      {selectedOrg && <TierBadge tier={selectedOrg.subscription_tier} />}
    </div>
  );
}