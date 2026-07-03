import { Pencil, Trash2, CalendarDays, User } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';

export default function MaintenanceRow({ task, readOnly, overdue, onEdit, onDelete, onStatus }) {
  const status = overdue && task.status !== 'Complete' ? 'Overdue' : task.status;
  return (
    <div className="flex items-start gap-3 px-5 py-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-slate-800">{task.task_title}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">{task.task_category}</span>
          <StatusBadge status={status} size="xs" />
        </div>
        <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
          {task.due_date && (
            <span className={`inline-flex items-center gap-1 ${overdue ? 'text-red-600 font-semibold' : ''}`}>
              <CalendarDays className="w-3.5 h-3.5" /> {task.due_date}
            </span>
          )}
          {task.assigned_owner && <span className="inline-flex items-center gap-1"><User className="w-3.5 h-3.5" /> {task.assigned_owner}</span>}
          {(task.linked_evidence_ids?.length > 0) && <span>{task.linked_evidence_ids.length} evidence linked</span>}
        </div>
      </div>
      {!readOnly && (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <select value={task.status} onChange={(e) => onStatus(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700">
            {['Not Started', 'In Progress', 'Complete', 'Deferred'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><Pencil className="w-4 h-4" /></button>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><Trash2 className="w-4 h-4" /></button>
        </div>
      )}
    </div>
  );
}