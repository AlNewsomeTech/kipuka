import { useState, useEffect } from 'react';
import { Settings, Save, Loader2, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAcolyteScope } from '@/lib/useAcolyteScope';
import { useAcolyteProfile } from '@/lib/useAcolyteProfile';
import { logAudit, AUDIT_ACTIONS } from '@/lib/auditLog';
import {
  SERVICE_TIERS, SERVICE_STATUSES, REVIEW_CADENCES, POSTURE_STATUSES, POSTURE_CARDS,
} from '@/lib/acolyte';
import AcolyteHeader from '@/components/acolyte/AcolyteHeader';
import AcolyteProjectBar from '@/components/acolyte/AcolyteProjectBar';
import NoProjectState from '@/components/acolyte/NoProjectState';
import RichTextField from '@/components/ui/RichTextField';

function Sel({ label, value, onChange, options, disabled }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      <select className="form-input" value={value || ''} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
function Inp({ label, value, onChange, type = 'text', disabled }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      <input type={type} className="form-input" value={value || ''} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
    </div>
  );
}

export default function AcolyteSettings() {
  const scope = useAcolyteScope();
  const { project, projects, projectId, selectProject, orgNameForProject, selectedOrgId, readOnly, user } = scope;
  const { profile, loading, refresh } = useAcolyteProfile(projectId);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm(profile || {});
  }, [profile]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!projectId) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        organization_id: project?.organization_id || selectedOrgId || '',
        project_id: projectId,
        current_readiness_score: Number(form.current_readiness_score) || 0,
      };
      if (profile?.id) {
        await base44.entities.AcolyteProfile.update(profile.id, payload);
      } else {
        await base44.entities.AcolyteProfile.create(payload);
      }
      await logAudit({
        organizationId: payload.organization_id, user,
        actionType: AUDIT_ACTIONS.ACOLYTE_PROFILE_UPDATE,
        targetEntity: 'AcolyteProfile', targetRecordId: projectId,
        summary: `Updated ACOLYTE service profile for "${project?.project_name}".`,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <AcolyteHeader title="ACOLYTE Settings" subtitle="Configure the ACOLYTE managed service profile for this organization and project." icon={Settings} />
      <AcolyteProjectBar projects={projects} projectId={projectId} onSelect={selectProject} orgName={orgNameForProject} />

      {!project ? (
        <NoProjectState />
      ) : loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-800">Service Configuration</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Sel label="Service Tier" value={form.service_tier} onChange={(v) => set('service_tier', v)} options={SERVICE_TIERS} disabled={readOnly} />
              <Sel label="Service Status" value={form.service_status} onChange={(v) => set('service_status', v)} options={SERVICE_STATUSES} disabled={readOnly} />
              <Sel label="Review Cadence" value={form.review_cadence} onChange={(v) => set('review_cadence', v)} options={REVIEW_CADENCES} disabled={readOnly} />
              <Inp label="Pac-Sec Service Lead" value={form.pacsec_service_lead} onChange={(v) => set('pacsec_service_lead', v)} disabled={readOnly} />
              <Inp label="Primary Service Owner" value={form.primary_service_owner} onChange={(v) => set('primary_service_owner', v)} disabled={readOnly} />
              <Inp label="Executive Contact Name" value={form.executive_contact_name} onChange={(v) => set('executive_contact_name', v)} disabled={readOnly} />
              <Inp label="Executive Contact Email" type="email" value={form.executive_contact_email} onChange={(v) => set('executive_contact_email', v)} disabled={readOnly} />
              <Inp label="Service Start Date" type="date" value={form.service_start_date} onChange={(v) => set('service_start_date', v)} disabled={readOnly} />
              <Inp label="Service Renewal Date" type="date" value={form.service_renewal_date} onChange={(v) => set('service_renewal_date', v)} disabled={readOnly} />
              <Inp label="Current Readiness Score" type="number" value={form.current_readiness_score} onChange={(v) => set('current_readiness_score', v)} disabled={readOnly} />
              <Inp label="Last Review Date" type="date" value={form.last_review_date} onChange={(v) => set('last_review_date', v)} disabled={readOnly} />
              <Inp label="Next Review Target Date" type="date" value={form.next_review_target_date} onChange={(v) => set('next_review_target_date', v)} disabled={readOnly} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-800">Posture Status</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {POSTURE_CARDS.map((c) => (
                <Sel key={c.key} label={c.label} value={form[c.key]} onChange={(v) => set(c.key, v)} options={POSTURE_STATUSES} disabled={readOnly} />
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-800">Narrative</h2>
            <RichTextField label="Executive Summary" value={form.executive_summary} onChange={(v) => set('executive_summary', v)} disabled={readOnly} />
            <RichTextField label="Key Risks Summary" value={form.key_risks_summary} onChange={(v) => set('key_risks_summary', v)} disabled={readOnly} />
            <RichTextField label="Next Steps Summary" value={form.next_steps_summary} onChange={(v) => set('next_steps_summary', v)} disabled={readOnly} />
            <RichTextField label="Notes" value={form.notes} onChange={(v) => set('notes', v)} disabled={readOnly} />
          </div>

          {!readOnly && (
            <div className="flex justify-end">
              <button onClick={save} disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52] disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {saved ? 'Saved' : 'Save ACOLYTE Profile'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}