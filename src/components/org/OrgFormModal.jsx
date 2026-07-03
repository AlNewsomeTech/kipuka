import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { TIERS, getTierConfig } from '@/lib/subscriptionTiers';
import { logAudit, AUDIT_ACTIONS } from '@/lib/auditLog';

const SAM_STATUSES = ['Unknown', 'Active', 'Inactive', 'Pending', 'Not Applicable'];
const SUB_STATUSES = ['Trial', 'Active', 'Past Due', 'Suspended', 'Cancelled'];
const SUPPORT_LEVELS = ['Standard', 'Priority', 'Pac-Sec Managed'];

const empty = {
  organization_name: '', legal_name: '', short_name: '', primary_contact_name: '',
  primary_contact_email: '', primary_contact_phone: '', website: '', uei: '',
  cage_codes: [], sam_registration_status: 'Unknown', subscription_tier: 'Trial',
  subscription_status: 'Trial', subscription_start_date: '', subscription_end_date: '',
  seat_limit: 5, storage_limit_gb: 5, support_level: 'Standard', customer_logo_url: '', notes: '',
};

export default function OrgFormModal({ open, onClose, org, onSaved }) {
  const { user } = useAuth();
  const [form, setForm] = useState(empty);
  const [cageInput, setCageInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (org) {
      setForm({ ...empty, ...org, cage_codes: org.cage_codes || [] });
      setCageInput((org.cage_codes || []).join(', '));
    } else {
      setForm(empty);
      setCageInput('');
    }
  }, [org, open]);

  if (!open) return null;
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // When tier changes, pre-fill the limits from the tier defaults (editable after).
  const applyTierDefaults = (tier) => {
    const cfg = getTierConfig(tier);
    setForm((f) => ({
      ...f,
      subscription_tier: tier,
      seat_limit: cfg.seat_limit == null ? f.seat_limit : cfg.seat_limit,
      storage_limit_gb: cfg.storage_limit_gb == null ? f.storage_limit_gb : cfg.storage_limit_gb,
    }));
  };

  const save = async () => {
    if (!form.organization_name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        cage_codes: cageInput.split(',').map((s) => s.trim()).filter(Boolean),
        seat_limit: Number(form.seat_limit) || 0,
        storage_limit_gb: Number(form.storage_limit_gb) || 0,
      };
      let saved;
      if (org?.id) {
        saved = await base44.entities.Organization.update(org.id, payload);
        await logAudit({ organizationId: org.id, user, actionType: AUDIT_ACTIONS.ORG_SETTINGS_CHANGE, targetEntity: 'Organization', targetRecordId: org.id, summary: `Updated organization ${payload.organization_name}` });
      } else {
        saved = await base44.entities.Organization.create(payload);
        // Create a matching license record so billing can be layered on later.
        const cfg = getTierConfig(payload.subscription_tier);
        await base44.entities.LicenseRecord.create({
          organization_id: saved.id, subscription_tier: payload.subscription_tier,
          billing_status: payload.subscription_status, start_date: payload.subscription_start_date || undefined,
          renewal_date: payload.subscription_end_date || undefined, seat_limit: payload.seat_limit,
          storage_limit_gb: payload.storage_limit_gb, allowed_projects: cfg.project_limit || 0,
          allowed_exports_per_month: cfg.exports_per_month || 0,
        }).catch(() => {});
        await logAudit({ organizationId: saved.id, user, actionType: AUDIT_ACTIONS.ORG_SETTINGS_CHANGE, targetEntity: 'Organization', targetRecordId: saved.id, summary: `Created organization ${payload.organization_name}` });
      }
      onSaved && onSaved(saved);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white">
          <h3 className="text-base font-semibold text-slate-800">{org ? 'Edit Organization' : 'Add Organization'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Organization name *"><input className="form-input" value={form.organization_name} onChange={(e) => set('organization_name', e.target.value)} /></Field>
            <Field label="Legal name"><input className="form-input" value={form.legal_name} onChange={(e) => set('legal_name', e.target.value)} /></Field>
            <Field label="Short name"><input className="form-input" value={form.short_name} onChange={(e) => set('short_name', e.target.value)} /></Field>
            <Field label="Website"><input className="form-input" value={form.website} onChange={(e) => set('website', e.target.value)} /></Field>
            <Field label="Primary contact name"><input className="form-input" value={form.primary_contact_name} onChange={(e) => set('primary_contact_name', e.target.value)} /></Field>
            <Field label="Primary contact email"><input className="form-input" value={form.primary_contact_email} onChange={(e) => set('primary_contact_email', e.target.value)} /></Field>
            <Field label="Primary contact phone"><input className="form-input" value={form.primary_contact_phone} onChange={(e) => set('primary_contact_phone', e.target.value)} /></Field>
            <Field label="Customer logo URL"><input className="form-input" value={form.customer_logo_url} onChange={(e) => set('customer_logo_url', e.target.value)} /></Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="UEI"><input className="form-input" value={form.uei} onChange={(e) => set('uei', e.target.value)} /></Field>
            <Field label="CAGE codes (comma separated)"><input className="form-input" value={cageInput} onChange={(e) => setCageInput(e.target.value)} /></Field>
            <Field label="SAM status">
              <select className="form-input" value={form.sam_registration_status} onChange={(e) => set('sam_registration_status', e.target.value)}>
                {SAM_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Subscription tier">
              <select className="form-input" value={form.subscription_tier} onChange={(e) => applyTierDefaults(e.target.value)}>
                {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Subscription status">
              <select className="form-input" value={form.subscription_status} onChange={(e) => set('subscription_status', e.target.value)}>
                {SUB_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Subscription start"><input type="date" className="form-input" value={form.subscription_start_date || ''} onChange={(e) => set('subscription_start_date', e.target.value)} /></Field>
            <Field label="Subscription end"><input type="date" className="form-input" value={form.subscription_end_date || ''} onChange={(e) => set('subscription_end_date', e.target.value)} /></Field>
            <Field label="Seat limit"><input type="number" className="form-input" value={form.seat_limit} onChange={(e) => set('seat_limit', e.target.value)} /></Field>
            <Field label="Storage limit (GB)"><input type="number" className="form-input" value={form.storage_limit_gb} onChange={(e) => set('storage_limit_gb', e.target.value)} /></Field>
            <Field label="Support level">
              <select className="form-input" value={form.support_level} onChange={(e) => set('support_level', e.target.value)}>
                {SUPPORT_LEVELS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Notes"><textarea rows={3} className="form-input" value={form.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">Cancel</button>
          <button onClick={save} disabled={saving || !form.organization_name.trim()} className="px-4 py-2 text-sm font-semibold bg-[#0F1E3C] text-white rounded-lg hover:bg-[#1E2D4A] disabled:opacity-50">{saving ? 'Saving…' : (org ? 'Save Changes' : 'Create Organization')}</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-600 mb-1 block">{label}</label>
      {children}
    </div>
  );
}