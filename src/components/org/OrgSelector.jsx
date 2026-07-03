import { Building2, ChevronDown } from 'lucide-react';
import { useOrg } from '@/lib/orgContext';
import TierBadge from './TierBadge';

// Compact org switcher for the top header. Only meaningful when the user
// can access more than one organization.
export default function OrgSelector() {
  const { organizations, selectedOrgId, selectOrg, selectedOrg } = useOrg();

  if (organizations.length === 0) return null;

  if (organizations.length === 1) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Building2 className="w-4 h-4 text-slate-400" />
        <span className="font-semibold text-slate-800 truncate max-w-[180px]">{selectedOrg?.organization_name}</span>
        {selectedOrg && <TierBadge tier={selectedOrg.subscription_tier} />}
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