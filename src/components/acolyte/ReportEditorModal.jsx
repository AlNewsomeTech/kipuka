import { useState } from 'react';
import { X, Loader2, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { logAudit, AUDIT_ACTIONS } from '@/lib/auditLog';
import { REPORT_STATUSES } from '@/lib/acolyte';
import { REPORT_SECTIONS } from '@/lib/acolyteReportSections';
import { defaultReportHeader } from '@/lib/executiveReportGenerator';
import RichTextField from '@/components/ui/RichTextField';
import ReportDraftPanel from '@/components/acolyte/ReportDraftPanel';

export default function ReportEditorModal({ project, existing, user, orgName, canAssist = true, autoDraft = false, onClose, onSaved }) {
  const [form, setForm] = useState(existing || {
    ...defaultReportHeader({ orgName, user }),
    report_status: 'Draft',
  });
  const [saving, setSaving] = useState(false);
  const [drafting, setDrafting] = useState(autoDraft && canAssist);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const applyFields = (patch) => setForm((f) => ({ ...f, ...patch }));

  const save = async () => {
    if (!form.report_title?.trim()) return;
    setSaving(true);
    try {
      const payload = { ...form, organization_id: project.organization_id || '', project_id: project.id };
      const create = !existing?.id;
      if (create) await base44.entities.AcolyteExecutiveReport.create(payload);
      else await base44.entities.AcolyteExecutiveReport.update(existing.id, payload);
      await logAudit({ organizationId: payload.organization_id, user, actionType: AUDIT_ACTIONS.ACOLYTE_REPORT_CREATE, targetEntity: 'AcolyteExecutiveReport', targetRecordId: existing?.id || '', summary: `${create ? 'Created' : 'Updated'} executive report "${form.report_title}".` });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">{existing?.id ? 'Edit' : 'New'} Executive Cyber Report</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          {canAssist && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2.5">
              <p className="text-xs text-purple-700">Draft report fields from current project data with the ACOLYTE Analyst Assistant.</p>
              <button
                type="button"
                onClick={() => setDrafting(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-br from-purple-600 to-blue-600 hover:opacity-90 flex-shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" /> Generate Draft from Current Data
              </button>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Report Title *</label>
            <input className="form-input" value={form.report_title} onChange={(e) => set('report_title', e.target.value)} />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
              <select className="form-input" value={form.report_status} onChange={(e) => set('report_status', e.target.value)}>
                {REPORT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Prepared By</label>
              <input className="form-input" value={form.prepared_by} onChange={(e) => set('prepared_by', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Period Start</label>
              <input type="date" className="form-input" value={form.report_period_start || ''} onChange={(e) => set('report_period_start', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Period End</label>
              <input type="date" className="form-input" value={form.report_period_end || ''} onChange={(e) => set('report_period_end', e.target.value)} />
            </div>
          </div>
          {REPORT_SECTIONS.map(([key, label]) => (
            <RichTextField key={key} label={label} value={form[key]} onChange={(v) => set(key, v)} />
          ))}
        </div>
        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-5 py-3 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200">Cancel</button>
          <button onClick={save} disabled={saving || !form.report_title?.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52] disabled:opacity-60">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save Report
          </button>
        </div>
      </div>

      {drafting && (
        <ReportDraftPanel
          project={project}
          orgName={orgName}
          user={user}
          currentValues={form}
          onApplyFields={applyFields}
          onClose={() => setDrafting(false)}
        />
      )}
    </div>
  );
}