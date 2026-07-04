import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { logAudit, AUDIT_ACTIONS } from '@/lib/auditLog';
import { FINDING_CATEGORIES, SEVERITIES, FINDING_STATUSES } from '@/lib/acolyte';
import { useAcolyteLinkables } from '@/lib/useAcolyteLinkables';
import RichTextField from '@/components/ui/RichTextField';
import LinkMultiSelect from './LinkMultiSelect';

export default function FindingFormModal({ project, existing, user, onClose, onSaved }) {
  const linkables = useAcolyteLinkables(project.id);
  const [form, setForm] = useState(existing || {
    finding_title: '', finding_category: 'Other', severity: 'Moderate', finding_status: 'Open',
    description: '', affected_systems: '', business_impact: '', recommended_action: '', owner: '',
    target_resolution_date: '', related_control_ids: [], related_evidence_ids: [], related_poam_ids: [],
    closure_notes: '', validation_notes: '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.finding_title?.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        organization_id: project.organization_id || '',
        project_id: project.id,
        created_by: existing?.created_by || user?.full_name || user?.email || '',
      };
      let action = AUDIT_ACTIONS.ACOLYTE_FINDING_CREATE;
      if (existing?.id) {
        await base44.entities.CyberFinding.update(existing.id, payload);
        action = form.finding_status === 'Closed' ? AUDIT_ACTIONS.ACOLYTE_FINDING_CLOSE
          : form.finding_status === 'Accepted Risk' ? AUDIT_ACTIONS.ACOLYTE_FINDING_ACCEPT_RISK
          : AUDIT_ACTIONS.ACOLYTE_FINDING_UPDATE;
      } else {
        await base44.entities.CyberFinding.create(payload);
      }
      await logAudit({
        organizationId: payload.organization_id, user, actionType: action,
        targetEntity: 'CyberFinding', targetRecordId: existing?.id || '',
        summary: `${existing?.id ? 'Updated' : 'Created'} ACOLYTE finding "${form.finding_title}".`,
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">{existing?.id ? 'Edit' : 'New'} Cyber Finding</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Finding Title *</label>
            <input className="form-input" value={form.finding_title} onChange={(e) => set('finding_title', e.target.value)} />
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
              <select className="form-input" value={form.finding_category} onChange={(e) => set('finding_category', e.target.value)}>
                {FINDING_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Severity</label>
              <select className="form-input" value={form.severity} onChange={(e) => set('severity', e.target.value)}>
                {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
              <select className="form-input" value={form.finding_status} onChange={(e) => set('finding_status', e.target.value)}>
                {FINDING_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Owner</label>
              <input className="form-input" value={form.owner} onChange={(e) => set('owner', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Target Resolution Date</label>
              <input type="date" className="form-input" value={form.target_resolution_date || ''} onChange={(e) => set('target_resolution_date', e.target.value)} />
            </div>
          </div>
          <RichTextField label="Description" value={form.description} onChange={(v) => set('description', v)} />
          <RichTextField label="Affected Systems" value={form.affected_systems} onChange={(v) => set('affected_systems', v)} />
          <RichTextField label="Business Impact" value={form.business_impact} onChange={(v) => set('business_impact', v)} />
          <RichTextField label="Recommended Action" value={form.recommended_action} onChange={(v) => set('recommended_action', v)} />

          <div className="grid sm:grid-cols-1 gap-3">
            <LinkMultiSelect label="Related CMMC Controls" options={linkables.controls} selected={form.related_control_ids || []} onChange={(v) => set('related_control_ids', v)} emptyHint="No control assessments in this project yet." />
            <LinkMultiSelect label="Related Evidence" options={linkables.evidence} selected={form.related_evidence_ids || []} onChange={(v) => set('related_evidence_ids', v)} emptyHint="No evidence in this project yet." />
            <LinkMultiSelect label="Related POA&M Items" options={linkables.poams} selected={form.related_poam_ids || []} onChange={(v) => set('related_poam_ids', v)} emptyHint="No POA&M items in this project yet." />
          </div>

          {['Closed', 'Accepted Risk'].includes(form.finding_status) && (
            <RichTextField label={form.finding_status === 'Accepted Risk' ? 'Risk Acceptance Notes' : 'Closure Notes'} value={form.closure_notes} onChange={(v) => set('closure_notes', v)} />
          )}
          {form.finding_status === 'Pending Validation' && (
            <RichTextField label="Validation Notes" value={form.validation_notes} onChange={(v) => set('validation_notes', v)} />
          )}
        </div>
        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-5 py-3 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200">Cancel</button>
          <button onClick={save} disabled={saving || !form.finding_title?.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52] disabled:opacity-60">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save Finding
          </button>
        </div>
      </div>
    </div>
  );
}