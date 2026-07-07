import { useState } from 'react';
import {
  ChevronDown, ChevronRight, Target, User, MousePointerClick, SlidersHorizontal,
  Camera, FileSignature, FolderOpen, CheckCircle2, AlertTriangle, ExternalLink,
  Image as ImageIcon, FileDown, FileText, ListChecks,
} from 'lucide-react';

// Each runbook step: only rendered when the task actually has that field.
const STEPS = [
  { key: 'runbook_purpose', label: 'Purpose', icon: Target },
  { key: 'runbook_role', label: 'Required Role', icon: User },
  { key: 'runbook_clicks', label: 'What to Click', icon: MousePointerClick },
  { key: 'runbook_setting', label: 'Setting to Choose', icon: SlidersHorizontal },
  { key: 'runbook_screenshot', label: 'Screenshot to Capture', icon: Camera },
  { key: 'runbook_naming', label: 'File Naming', icon: FileSignature },
  { key: 'runbook_save_location', label: 'Where to Save', icon: FolderOpen },
  { key: 'runbook_validation', label: 'How to Validate', icon: CheckCircle2 },
];

// "Required" fields shown after the runbook steps.
const REQUIRED = [
  { key: 'required_screenshots', label: 'Required Screenshots', icon: ImageIcon },
  { key: 'required_exports', label: 'Required Exports', icon: FileDown },
  { key: 'required_documents', label: 'Required Documents', icon: FileText },
  { key: 'validation_checklist', label: 'Validation Checklist', icon: ListChecks },
];

function StepRow({ icon: Icon, label, value }) {
  return (
    <div className="flex gap-2">
      <Icon className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
        <div className="text-[11px] text-slate-700 whitespace-pre-line leading-snug">{value}</div>
      </div>
    </div>
  );
}

export default function TaskRunbookInline({ task }) {
  const [open, setOpen] = useState(false);

  const steps = STEPS.filter((s) => task[s.key]?.trim());
  const required = REQUIRED.filter((r) => task[r.key]?.trim());
  const hasInstructions = task.instructions?.trim();
  const hasMistakes = task.runbook_mistakes?.trim();
  const hasAny = steps.length > 0 || required.length > 0 || hasInstructions || hasMistakes || task.admin_center_url;

  if (!hasAny) {
    return (
      <div className="mt-2 text-[10px] italic text-slate-400" style={{ fontSize: '10px' }}>
        No step-by-step instructions on this task yet.
      </div>
    );
  }

  return (
    <div className="mt-2 border-t border-slate-100 pt-2">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="flex items-center gap-1 text-[10px] font-semibold text-blue-700 hover:text-blue-800"
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        Step-by-step instructions
      </button>

      {open && (
        <div className="mt-2 space-y-2.5" onClick={(e) => e.stopPropagation()}>
          {hasInstructions && (
            <div className="text-[11px] text-slate-700 whitespace-pre-line leading-snug bg-slate-50 rounded-md p-2">
              {task.instructions}
            </div>
          )}

          {steps.map((s) => (
            <StepRow key={s.key} icon={s.icon} label={s.label} value={task[s.key]} />
          ))}

          {required.length > 0 && (
            <div className="space-y-2 border-t border-slate-100 pt-2">
              {required.map((r) => (
                <StepRow key={r.key} icon={r.icon} label={r.label} value={task[r.key]} />
              ))}
            </div>
          )}

          {hasMistakes && (
            <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-md p-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">Common Mistakes</div>
                <div className="text-[11px] text-amber-800 whitespace-pre-line leading-snug">{task.runbook_mistakes}</div>
              </div>
            </div>
          )}

          {task.admin_center_url && (
            <a
              href={task.admin_center_url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 hover:underline"
            >
              <ExternalLink className="w-3 h-3" /> Open Admin Center
            </a>
          )}
        </div>
      )}
    </div>
  );
}