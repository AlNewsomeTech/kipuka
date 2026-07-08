import { useState } from 'react';
import { HelpCircle, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { GUIDED_STUCK_STATUS } from '@/lib/simpleStatus';

// Item 3 — "I'm stuck" button on every guided step. Opens a short reason box,
// creates a POA&M item with the control pre-linked, and sets status Gap Identified.
export default function StuckButton({ project, libEntry, assessment, onStuck }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    const gap = reason.trim() || `Unable to implement ${libEntry.control_id} yet.`;
    await base44.entities.ProjectPOAM.create({
      organization_id: project.organization_id,
      project_id: project.id,
      control_id: libEntry.control_id,
      poam_title: `${libEntry.control_id} — needs help`,
      gap_statement: gap,
      remediation_plan: libEntry.poam_gap_starter || '',
      risk_rating: assessment?.risk_rating || 'Moderate',
      status: 'Open',
    });
    if (assessment?.id) {
      await base44.entities.ControlAssessment.update(assessment.id, { status: GUIDED_STUCK_STATUS });
    }
    setSaving(false);
    setOpen(false);
    setReason('');
    onStuck?.();
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100"
      >
        <HelpCircle className="w-4 h-4" /> I'm stuck / can't do this yet
      </button>
    );
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2 w-full">
      <label className="block text-xs font-semibold text-red-700">Tell us what's blocking you (optional)</label>
      <textarea
        rows={2}
        className="form-input"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="e.g. I don't have admin access to this setting"
      />
      <div className="flex gap-2">
        <button onClick={submit} disabled={saving} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <HelpCircle className="w-3.5 h-3.5" />} Flag as stuck &amp; create a to-do
        </button>
        <button onClick={() => setOpen(false)} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-white border border-slate-200">Cancel</button>
      </div>
      <p className="text-[11px] text-red-700/80">This adds the control to your POA&amp;M list so nothing gets forgotten.</p>
    </div>
  );
}