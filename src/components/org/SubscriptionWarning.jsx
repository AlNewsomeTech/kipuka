import { AlertTriangle, Ban } from 'lucide-react';
import { useOrg } from '@/lib/orgContext';

// Prominent banner shown when the selected org's subscription is not healthy.
export default function SubscriptionWarning() {
  const { selectedOrg, status, suspended, expired, fullyDisabled } = useOrg();
  if (!selectedOrg) return null;

  if (fullyDisabled) {
    return (
      <Banner tone="red" icon={Ban}
        title="Access disabled by Pac-Sec"
        body="This organization has been fully disabled. Contact Pacific Global Security Group to restore access." />
    );
  }

  if (status === 'Suspended' || status === 'Cancelled') {
    return (
      <Banner tone="red" icon={Ban}
        title={`Subscription ${status.toLowerCase()}`}
        body="Exports and new projects are disabled. Access is read-only until the subscription is reactivated." />
    );
  }

  if (status === 'Past Due') {
    return (
      <Banner tone="amber" icon={AlertTriangle}
        title="Subscription past due"
        body="Payment is overdue. Exports and new projects are disabled until the account is brought current." />
    );
  }

  if (expired) {
    return (
      <Banner tone="amber" icon={AlertTriangle}
        title="Subscription expired"
        body="The subscription end date has passed. Exports and new projects are disabled. Contact Pac-Sec to renew." />
    );
  }

  return null;
}

function Banner({ tone, icon: Icon, title, body }) {
  const map = {
    red: 'bg-red-50 border-red-200 text-red-800',
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
  };
  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 mb-4 ${map[tone]}`}>
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs mt-0.5 opacity-90">{body}</p>
      </div>
    </div>
  );
}