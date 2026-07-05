import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// A single persisted runbook checklist row. Toggling saves a
// TechnicianRunbookProgress record (Complete / Not Started). Read-only hides
// interaction. Tenant-scoped by organization_id + project_id.
export default function RunbookChecklistItem({ project, toolName, section, label, progress, currentUser, readOnly, onChange }) {
  const [saving, setSaving] = useState(false);
  const done = progress?.step_status === 'Complete';

  const toggle = async () => {
    if (readOnly || saving) return;
    setSaving(true);
    const who = currentUser?.full_name || currentUser?.email || '';
    try {
      if (progress?.id) {
        await base44.entities.TechnicianRunbookProgress.update(progress.id, {
          step_status: done ? 'Not Started' : 'Complete',
          completed_by: done ? '' : who,
          completed_date: done ? undefined : new Date().toISOString(),
        });
      } else {
        await base44.entities.TechnicianRunbookProgress.create({
          organization_id: project.organization_id,
          project_id: project.id,
          tool_name: toolName,
          runbook_section: section,
          step_title: label,
          step_status: 'Complete',
          completed_by: who,
          completed_date: new Date().toISOString(),
        });
      }
      await onChange?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <label className={`flex items-start gap-2.5 py-1.5 ${readOnly ? '' : 'cursor-pointer'}`}>
      {saving ? (
        <Loader2 className="w-5 h-5 text-slate-400 animate-spin mt-0.5 flex-shrink-0" />
      ) : (
        <input
          type="checkbox"
          checked={done}
          disabled={readOnly}
          onChange={toggle}
          className="w-5 h-5 rounded border-slate-300 mt-0.5 flex-shrink-0"
        />
      )}
      <span className={`text-[15px] leading-[1.5] ${done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{label}</span>
    </label>
  );
}