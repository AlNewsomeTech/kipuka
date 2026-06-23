import { useState, useEffect } from 'react';
import {
  ClipboardCheck, Mail, KeyRound, ShieldCheck, Globe, CreditCard,
  CheckCircle2, Circle, AlertCircle, Save, UserCog, FileText
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useClient } from '@/lib/clientContext';
import EmptyState from '@/components/EmptyState';
import StatusBadge from '@/components/StatusBadge';

const REQUIREMENTS = [
  {
    id: 'global_admin',
    icon: UserCog,
    title: 'Global Administrator Account',
    critical: true,
    instruction: 'Provide the credentials for a Global Administrator account on the M365 tenant. This account is required to configure security settings, conditional access policies, and compliance features across the tenant.',
    fields: ['global_admin_email', 'global_admin_credentials_confirmed'],
  },
  {
    id: 'e5_license',
    icon: ShieldCheck,
    title: 'Minimum One (1) Microsoft 365 E5 License',
    critical: true,
    instruction: 'The tenant must have at least one E5 license assigned to unlock full security features including Microsoft Defender for Endpoint, Purview, and advanced conditional access. Confirm the license count and that at least one is assigned to the global admin account.',
    fields: ['e5_license_count', 'e5_license_confirmed'],
  },
  {
    id: 'secondary_admin',
    icon: KeyRound,
    title: 'Secondary Admin Account (Break-Glass)',
    critical: false,
    instruction: 'Provide a secondary emergency/break-glass admin account to prevent lockout. This account should have MFA enrolled on a separate device and be stored securely.',
    fields: ['secondary_admin_email'],
  },
  {
    id: 'tenant_domain',
    icon: Globe,
    title: 'Tenant Domain Confirmation',
    critical: true,
    instruction: 'Confirm the exact M365 tenant domain (e.g., client.onmicrosoft.com). This is used for all admin center access and SharePoint archive setup.',
    fields: ['tenant_domain_confirmed'],
  },
  {
    id: 'dns_access',
    icon: Globe,
    title: 'DNS Registrar Access',
    critical: false,
    instruction: 'Provide access to the DNS registrar (GoDaddy, Cloudflare, etc.) or the contact for the person who manages DNS records. Required for domain verification, MX records, SPF/DKIM/DMARC, and email migration.',
    fields: ['dns_access_confirmed'],
  },
  {
    id: 'billing_admin',
    icon: CreditCard,
    title: 'Billing / Partner Admin Access',
    critical: false,
    instruction: 'Confirm billing admin access or that the MSP is set as a Partner of Record / Delegated Admin Partner (GDAP). Required to manage licenses and subscriptions.',
    fields: ['billing_admin_confirmed'],
  },
];

export default function ClientIntake() {
  const { selectedClient, selectedClientId } = useClient();
  const [intake, setIntake] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    global_admin_email: '',
    global_admin_credentials_confirmed: false,
    secondary_admin_email: '',
    e5_license_count: 0,
    e5_license_confirmed: false,
    tenant_domain_confirmed: false,
    dns_access_confirmed: false,
    billing_admin_confirmed: false,
    intake_notes: '',
  });

  useEffect(() => {
    if (!selectedClientId) { setLoading(false); return; }
    setLoading(true);
    base44.entities.ClientIntake.filter({ client_id: selectedClientId })
      .then((records) => {
        if (records.length > 0) {
          const r = records[0];
          setIntake(r);
          setForm({
            global_admin_email: r.global_admin_email || '',
            global_admin_credentials_confirmed: r.global_admin_credentials_confirmed || false,
            secondary_admin_email: r.secondary_admin_email || '',
            e5_license_count: r.e5_license_count || 0,
            e5_license_confirmed: r.e5_license_confirmed || false,
            tenant_domain_confirmed: r.tenant_domain_confirmed || false,
            dns_access_confirmed: r.dns_access_confirmed || false,
            billing_admin_confirmed: r.billing_admin_confirmed || false,
            intake_notes: r.intake_notes || '',
          });
        } else {
          setIntake(null);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedClientId]);

  const completedChecklist = REQUIREMENTS.filter((req) => {
    if (req.id === 'global_admin') return form.global_admin_email && form.global_admin_credentials_confirmed;
    if (req.id === 'e5_license') return form.e5_license_confirmed && form.e5_license_count >= 1;
    if (req.id === 'secondary_admin') return form.secondary_admin_email;
    if (req.id === 'tenant_domain') return form.tenant_domain_confirmed;
    if (req.id === 'dns_access') return form.dns_access_confirmed;
    if (req.id === 'billing_admin') return form.billing_admin_confirmed;
    return false;
  });

  const allCriticalDone = REQUIREMENTS.filter((r) => r.critical).every((req) => {
    if (req.id === 'global_admin') return form.global_admin_email && form.global_admin_credentials_confirmed;
    if (req.id === 'e5_license') return form.e5_license_confirmed && form.e5_license_count >= 1;
    if (req.id === 'tenant_domain') return form.tenant_domain_confirmed;
    return false;
  });

  const progressPct = (completedChecklist.length / REQUIREMENTS.length) * 100;

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        client_id: selectedClientId,
        checklist_completed: completedChecklist.map((r) => r.id).join(','),
        intake_status: allCriticalDone ? 'Complete' : completedChecklist.length > 0 ? 'In Progress' : 'Not Started',
        completed_date: allCriticalDone ? new Date().toISOString().split('T')[0] : null,
      };
      if (intake) {
        await base44.entities.ClientIntake.update(intake.id, payload);
      } else {
        const created = await base44.entities.ClientIntake.create(payload);
        setIntake(created);
      }
    } catch (e) {
      alert('Error saving intake: ' + e.message);
    }
    setSaving(false);
  };

  if (!selectedClient) {
    return <EmptyState icon={ClipboardCheck} title="No client selected" description="Select a client from the dropdown to manage their intake form." />;
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Client Intake Form</h1>
          <p className="text-sm text-slate-500 mt-1">{selectedClient.legal_name} — collect required access and prerequisites before deployment begins</p>
        </div>
        <StatusBadge status={allCriticalDone ? 'Complete' : completedChecklist.length > 0 ? 'In Progress' : 'Not Started'} />
      </div>

      {/* Progress banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-[#0F1E3C]" />
            <h3 className="text-sm font-semibold text-slate-800">Intake Progress</h3>
          </div>
          <span className="text-sm font-bold text-slate-800">{completedChecklist.length}/{REQUIREMENTS.length} complete</span>
        </div>
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-2.5 bg-green-500 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
        </div>
        {allCriticalDone ? (
          <div className="mt-3 flex items-center gap-2 text-xs text-green-700 bg-green-50 px-3 py-2 rounded-lg">
            <CheckCircle2 className="w-4 h-4" /> All critical requirements met — deployment can begin.
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
            <AlertCircle className="w-4 h-4" /> Critical requirements still needed before deployment can start.
          </div>
        )}
      </div>

      {/* Instructions + Form */}
      <div className="grid lg:grid-cols-2 gap-4">
        {REQUIREMENTS.map((req) => {
          const isComplete = completedChecklist.some((r) => r.id === req.id);
          const Icon = req.icon;
          return (
            <div key={req.id} className={`bg-white rounded-xl border p-5 ${isComplete ? 'border-green-200' : req.critical ? 'border-amber-200' : 'border-slate-200'}`}>
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isComplete ? 'bg-green-50' : req.critical ? 'bg-amber-50' : 'bg-slate-100'}`}>
                  {isComplete ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <Icon className={`w-5 h-5 ${req.critical ? 'text-amber-600' : 'text-slate-500'}`} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-800">{req.title}</h3>
                    {req.critical && <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">CRITICAL</span>}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{req.instruction}</p>
                </div>
              </div>

              <div className="space-y-2 mt-4 pl-12">
                {req.fields.includes('global_admin_email') && (
                  <div>
                    <label className="text-[10px] font-medium text-slate-500 mb-0.5 block">Global Admin Email</label>
                    <div className="relative">
                      <Mail className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                      <input className="form-input pl-8" placeholder="admin@client.com" value={form.global_admin_email} onChange={(e) => setForm({ ...form, global_admin_email: e.target.value })} />
                    </div>
                  </div>
                )}
                {req.fields.includes('global_admin_credentials_confirmed') && (
                  <CheckRow label="Global admin credentials provided via secure channel (password manager, encrypted email, or direct handoff) — do NOT store passwords in this app" checked={form.global_admin_credentials_confirmed} onChange={(v) => setForm({ ...form, global_admin_credentials_confirmed: v })} />
                )}
                {req.fields.includes('secondary_admin_email') && (
                  <div>
                    <label className="text-[10px] font-medium text-slate-500 mb-0.5 block">Break-Glass Admin Email</label>
                    <div className="relative">
                      <Mail className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                      <input className="form-input pl-8" placeholder="emergency@client.com" value={form.secondary_admin_email} onChange={(e) => setForm({ ...form, secondary_admin_email: e.target.value })} />
                    </div>
                  </div>
                )}
                {req.fields.includes('e5_license_count') && (
                  <div>
                    <label className="text-[10px] font-medium text-slate-500 mb-0.5 block">E5 Licenses Assigned on Tenant</label>
                    <input type="number" min="0" className="form-input" value={form.e5_license_count} onChange={(e) => setForm({ ...form, e5_license_count: +e.target.value })} />
                  </div>
                )}
                {req.fields.includes('e5_license_confirmed') && (
                  <CheckRow label="Confirmed: at least 1 E5 license assigned to global admin" checked={form.e5_license_confirmed} onChange={(v) => setForm({ ...form, e5_license_confirmed: v })} />
                )}
                {req.fields.includes('tenant_domain_confirmed') && (
                  <CheckRow label={`Confirmed tenant domain: ${selectedClient.ms_tenant_domain || '— (set in client profile)'}`} checked={form.tenant_domain_confirmed} onChange={(v) => setForm({ ...form, tenant_domain_confirmed: v })} />
                )}
                {req.fields.includes('dns_access_confirmed') && (
                  <CheckRow label="DNS registrar access provided or contact shared" checked={form.dns_access_confirmed} onChange={(v) => setForm({ ...form, dns_access_confirmed: v })} />
                )}
                {req.fields.includes('billing_admin_confirmed') && (
                  <CheckRow label="Billing admin access confirmed / GDAP delegated" checked={form.billing_admin_confirmed} onChange={(v) => setForm({ ...form, billing_admin_confirmed: v })} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Notes */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-800">Intake Notes</h3>
        </div>
        <textarea className="form-input min-h-[80px]" placeholder="Additional notes, special access instructions, or items still pending from the client..." value={form.intake_notes} onChange={(e) => setForm({ ...form, intake_notes: e.target.value })} />
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-[#0F1E3C] text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-[#1E2D4A] transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Intake Form'}
        </button>
      </div>
    </div>
  );
}

function CheckRow({ label, checked, onChange }) {
  return (
    <label className="flex items-start gap-2 cursor-pointer text-xs text-slate-600 py-1">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4 rounded border-slate-300 mt-0.5 flex-shrink-0" />
      <span>{label}</span>
    </label>
  );
}