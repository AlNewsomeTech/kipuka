import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { logAudit, AUDIT_ACTIONS } from '@/lib/auditLog';
import { REMEDIATION_PRIORITIES, REMEDIATION_STATUSES } from '@/lib/acolyte';
import { useAcolyteLinkables } from '@/lib/useAcolyteLinkables';
import RichTextField from '@/components/ui/RichTextField';
import LinkMultiSelect from './LinkMultiSelect';

export default function RemediationFormModal({ project, existing, fromFinding, findings = [], user, onClose, onSaved }) {
  const linkables = useAcolyteLinkables(project.id);
  const [form, setForm] = useState(existing || {
    remediation_title: fromFinding ? `Remediate: ${fromFinding.finding_title}` : '',
    remediation_description: fromFinding?.recommended_action || '',
    priority: 'Medium', status: 'Not Started', owner: fromFinding?.owner || '', due_date: '',
    finding_id: fromFinding?.id || '',
    related_control_ids: fromFinding?.related_control_ids || [],
    related_poam_ids: fromFinding?.related_poam_ids || [],
    related_evidence_ids: fromFinding?.related_evidence_ids || [],
    progress_notes: '', validation_notes: '', completed_date: '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.remediation_title?.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        organization_id: project.organization_id || '',
        project_id: project.id,
        completed_date: form.status === 'Complete' ? (form.completed_date || new Date().toISOString().slice(0, 10)) : (form.completed_date || ''),
      };
      let action = AUDIT_ACTIONS.ACOLYTE_REMEDIATION_CREATE;
      if (existing?.id) {
        await base44.entities.AcolyteRemediationItem.update(existing.id, payload);
        action = form.status === 'Complete' ? AUDIT_ACTIONS.ACOLYTE_REMEDIATION_COMPLETE
          : form.status === 'Deferred' ? AUDIT_ACTIONS.ACOLYTE_REMEDIATION_DEFER
          : AUDIT_ACTIONS.ACOLYTE_REMEDIATION_UPDATE;
      } else {
        await base44.entities.AcolyteRemediationItem.create(payload);
      }
      await logAudit({
        organizationId: payload.organization_id, user, actionType: action,
        targetEntity: 'AcolyteRemediationItem', targetRecordId: existing?.id || '',
        summary: `${existing?.id ? 'Updated' : 'Created'} ACOLYTE remediation "${form.remediation_title}".`,
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const findingOptions = findings.map((f) => ({ value: f.id, label: f.finding_title }));

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">{existing?.id ? 'Edit' : 'New'} Remediation Item</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Remediation Title *</label>
            <input className="form-input" value={form.remediation_title} onChange={(e) => set('remediation_title', e.target.value)} />
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Priority</label>
              <select className="form-input" value={form.priority} onChange={(e) => set('priority', e.target.value)}>
                {REMEDIATION_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
              <select className="form-input" value={form.status} onChange={(e) => set('status', e.target.value)}>
                {REMEDIATION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Due Date</label>
              <input type="date" className="form-input" value={form.due_date || ''} onChange={(e) => set('due_date', e.target.value)} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Owner</label>
              <input className="form-input" value={form.owner} onChange={(e) => set('owner', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Linked Finding</label>
              <select className="form-input" value={form.finding_id || ''} onChange={(e) => set('finding_id', e.target.value)}>
                <option value="">None</option>
                {findingOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <RichTextField label="Description" value={form.remediation_description} onChange={(v) => set('remediation_description', v)} />
          <LinkMultiSelect label="Related CMMC Controls" options={linkables.controls} selected={form.related_control_ids || []} onChange={(v) => set('related_control_ids', v)} emptyHint="No control assessments in this project yet." />
          <LinkMultiSelect label="Related POA&M Items" options={linkables.poams} selected={form.related_poam_ids || []} onChange={(v) => set('related_poam_ids', v)} emptyHint="No POA&M items in this project yet." />
          <LinkMultiSelect label="Related Evidence" options={linkables.evidence} selected={form.related_evidence_ids || []} onChange={(v) => set('related_evidence_ids', v)} emptyHint="No evidence in this project yet." />
          <RichTextField label="Progress Notes" value={form.progress_notes} onChange={(v) => set('progress_notes', v)} />
          {['Pending Validation', 'Complete'].includes(form.status) && (
            <RichTextField label="Validation Notes" value={form.validation_notes} onChange={(v) => set('validation_notes', v)} />
          )}
        </div>
        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-5 py-3 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200">Cancel</button>
          <button onClick={save} disabled={saving || !form.remediation_title?.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52] disabled:opacity-60">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save Remediation
          </button>
        </div>
      </div>
    </div>
  );
}