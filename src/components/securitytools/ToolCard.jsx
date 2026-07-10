import { useState } from 'react';
import { Loader2, BookOpen, CheckCircle2, Clock, XCircle, Wrench } from 'lucide-react';
import { TOOL_STATUSES, isToolActive } from '@/lib/securityTools';

const STATUS_STYLE = {
  'Enabled': 'bg-green-50 text-green-700 border-green-200',
  'Planned': 'bg-blue-50 text-blue-700 border-blue-200',
  'In Review': 'bg-amber-50 text-amber-700 border-amber-200',
  'Disabled': 'bg-slate-100 text-slate-500 border-slate-200',
  'Not Used': 'bg-slate-100 text-slate-500 border-slate-200',
};

// One tool selection card. Handles status changes, owner/admin contact/notes,
// and links to the runbook when active. `record` may be null (not yet created).
export default function ToolCard({ tool, record, readOnly, saving, onSetStatus, onEditDetails, onOpenRunbook }) {
  const [busy, setBusy] = useState(null);
  const status = record?.tool_status || 'Not Used';
  const active = isToolActive(status);

  const handle = async (newStatus) => {
    setBusy(newStatus);
    await onSetStatus(tool, newStatus);
    setBusy(null);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-[#0F1E3C] flex-shrink-0" />
            <h3 className="text-[15px] font-bold text-slate-900 truncate">{tool.name}</h3>
          </div>
          <p className="text-[13px] text-slate-500 leading-[1.5] mt-1">{tool.description}</p>
        </div>
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${STATUS_STYLE[status]}`}>{status}</span>
      </div>

      {!tool.built && (
        <p className="text-[12px] text-slate-400 italic mt-3">Available for future configuration.</p>
      )}

      {tool.built && (
        <>
          {/* Status buttons */}
          {!readOnly && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              <StatusBtn label="Enable" icon={CheckCircle2} active={status === 'Enabled'} busy={busy === 'Enabled'} onClick={() => handle('Enabled')} tone="green" />
              <StatusBtn label="Planned" icon={Clock} active={status === 'Planned'} busy={busy === 'Planned'} onClick={() => handle('Planned')} tone="blue" />
              <StatusBtn label="Disable" icon={XCircle} active={status === 'Disabled'} busy={busy === 'Disabled'} onClick={() => handle('Disabled')} tone="slate" />
            </div>
          )}

          {/* Details */}
          {record && (
            <div className="mt-4 space-y-1 text-[13px] text-slate-600 border-t border-slate-100 pt-3">
              <DetailRow label="Owner" value={record.owner} />
              <DetailRow label="Admin contact" value={record.admin_contact_name} />
              {record.admin_contact_email && <DetailRow label="Admin email" value={record.admin_contact_email} />}
              {record.enabled_by && <DetailRow label="Enabled by" value={record.enabled_by} />}
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 flex flex-wrap gap-2">
            {active && tool.runbook && (
              <button onClick={() => onOpenRunbook(tool)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52]">
                <BookOpen className="w-3.5 h-3.5" /> Open Runbook
              </button>
            )}
            {!readOnly && (
              <button onClick={() => onEditDetails(tool, record)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200">
                Edit Details
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatusBtn({ label, icon: Icon, active, busy, onClick, tone }) {
  const toneCls = active
    ? tone === 'green' ? 'bg-green-600 text-white border-green-600'
      : tone === 'blue' ? 'bg-blue-600 text-white border-blue-600'
      : 'bg-slate-600 text-white border-slate-600'
    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300';
  return (
    <button onClick={onClick} disabled={busy}
      className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[12px] font-semibold border ${toneCls}`}>
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />} {label}
    </button>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex gap-2">
      <span className="text-slate-400 w-24 flex-shrink-0">{label}:</span>
      <span className="text-slate-700 truncate">{value || '—'}</span>
    </div>
  );
}

export { TOOL_STATUSES };