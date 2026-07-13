import { useState } from 'react';
import { Building2, Pencil, Mail, Phone, Globe, FileBadge, ShieldCheck } from 'lucide-react';
import { useOrg } from '@/lib/orgContext';
import { PERMS } from '@/lib/orgRoles';
import { planLimits } from '@/lib/planTiers';
import TierBadge from '@/components/org/TierBadge';
import SubscriptionWarning from '@/components/org/SubscriptionWarning';
import OrgFormModal from '@/components/org/OrgFormModal';
import OrgUserManager from '@/components/org/OrgUserManager';
import EmptyState from '@/components/EmptyState';

export default function OrgSettings() {
  const { selectedOrg, orgRole, can, isPacSec, refreshOrgs, planTier, status } = useOrg();
  const [editOpen, setEditOpen] = useState(false);

  const canManageSettings = can(PERMS.MANAGE_ORG_SETTINGS) || isPacSec;
  const canManageUsers = can(PERMS.MANAGE_USERS) || isPacSec;

  if (!selectedOrg) {
    return (
      <div className="max-w-2xl mx-auto py-16">
        <EmptyState icon={Building2} title="No organization selected" description="Select an organization from the header to view its settings." />
      </div>
    );
  }

  const cfg = planLimits(planTier);
  const org = selectedOrg;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <SubscriptionWarning />

      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {org.customer_logo_url ? (
            <img src={org.customer_logo_url} alt="logo" className="w-14 h-14 rounded-xl object-contain bg-white border border-slate-200 p-1" />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-[#0F1E3C] flex items-center justify-center"><Building2 className="w-7 h-7 text-white" /></div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{org.organization_name}</h1>
              <TierBadge org={selectedOrg} size="md" />
            </div>
            <p className="text-sm text-slate-500 mt-0.5">{org.legal_name || org.short_name || 'Organization settings'}</p>
          </div>
        </div>
        {canManageSettings && (
          <button onClick={() => setEditOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">
            <Pencil className="w-4 h-4" /> Edit
          </button>
        )}
      </div>

      {/* Profile + subscription */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card title="Organization Profile" icon={Building2}>
          <Row label="Legal name" value={org.legal_name} />
          <Row label="Short name" value={org.short_name} />
          <Row label="UEI" value={org.uei} />
          <Row label="CAGE codes" value={(org.cage_codes || []).join(', ')} />
          <Row label="SAM registration" value={org.sam_registration_status} />
          <Row label="Website" value={org.website} icon={Globe} />
        </Card>

        <Card title="Subscription" icon={FileBadge}>
          <Row label="Tier" value={<TierBadge org={selectedOrg} />} />
          <Row label="Status" value={status} />
          <Row label="Support level" value={org.support_level} />
          <Row label="Seats" value={cfg.seat_limit != null ? `${org.seat_limit ?? cfg.seat_limit}` : 'Custom'} />
          <Row label="Projects allowed" value={cfg.project_limit != null ? cfg.project_limit : 'Custom'} />
          <Row label="Storage" value={org.storage_limit_gb != null ? `${org.storage_limit_gb} GB` : 'Custom'} />
          <Row label="Start" value={org.subscription_start_date} />
          <Row label="End" value={org.subscription_end_date} />
        </Card>
      </div>

      {/* Support contact */}
      <Card title="Support Contact" icon={ShieldCheck}>
        <Row label="Primary contact" value={org.primary_contact_name} />
        <Row label="Email" value={org.primary_contact_email} icon={Mail} />
        <Row label="Phone" value={org.primary_contact_phone} icon={Phone} />
        <Row label="Your role" value={orgRole || '—'} />
      </Card>

      {/* User management */}
      <OrgUserManager organizationId={org.id} canManage={canManageUsers} seatLimit={cfg.seat_limit != null ? (org.seat_limit ?? cfg.seat_limit) : null} />

      <OrgFormModal open={editOpen} org={org} onClose={() => setEditOpen(false)} onSaved={refreshOrgs} />
    </div>
  );
}

function Card({ title, icon: Icon, children }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800 flex items-center gap-1.5 text-right">
        {Icon && value && <Icon className="w-3.5 h-3.5 text-slate-400" />}
        {value || <span className="text-slate-300">—</span>}
      </span>
    </div>
  );
}