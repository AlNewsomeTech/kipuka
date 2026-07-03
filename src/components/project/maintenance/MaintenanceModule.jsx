import { useState, useEffect, useCallback, useMemo } from 'react';
import { Wrench, Loader2, Plus, CalendarClock, CalendarDays, CalendarRange } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { TEMPLATE_SETS, isMaintenanceOverdue } from '@/lib/maintenanceTemplates';
import MaintenanceRow from './MaintenanceRow';
import MaintenanceFormModal from './MaintenanceFormModal';

const VIEWS = [
  { key: 'open', label: 'Open' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'complete', label: 'Complete' },
  { key: 'all', label: 'All' },
];

const TEMPLATE_BTNS = [
  { key: 'monthly', icon: CalendarClock },
  { key: 'quarterly', icon: CalendarDays },
  { key: 'annual', icon: CalendarRange },
];

export default function MaintenanceModule({ project, readOnly, currentUser }) {
  const [tasks, setTasks] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('open');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [seeding, setSeeding] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [mt, ev] = await Promise.all([
      base44.entities.MaintenanceTask.filter({ project_id: project.id }, '-created_date', 500).catch(() => []),
      base44.entities.ProjectEvidence.filter({ project_id: project.id }).catch(() => []),
    ]);
    setTasks(mt);
    setEvidence(ev);
    setLoading(false);
  }, [project.id]);

  useEffect(() => { load(); }, [load]);

  const applyTemplate = async (key) => {
    setSeeding(key);
    const drafts = TEMPLATE_SETS[key].tasks.map((t) => ({
      ...t,
      organization_id: project.organization_id,
      project_id: project.id,
      assigned_owner: '',
      status: 'Not Started',
    }));
    await base44.entities.MaintenanceTask.bulkCreate(drafts);
    setSeeding(null);
    load();
  };

  const remove = async (id) => { await base44.entities.MaintenanceTask.delete(id); load(); };
  const updateStatus = async (id, status) => { await base44.entities.MaintenanceTask.update(id, { status }); load(); };

  const overdue = useMemo(() => tasks.filter(isMaintenanceOverdue), [tasks]);
  const rows = useMemo(() => {
    if (view === 'overdue') return overdue;
    if (view === 'complete') return tasks.filter((t) => t.status === 'Complete');
    if (view === 'open') return tasks.filter((t) => t.status !== 'Complete');
    return tasks;
  }, [view, tasks, overdue]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <Wrench className="w-5 h-5 text-[#0F1E3C]" />
            <h1 className="text-lg font-bold text-slate-900">CMMC Maintenance</h1>
          </div>
          {!readOnly && (
            <button onClick={() => { setEditing(null); setModal(true); }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52]">
              <Plus className="w-4 h-4" /> New Task
            </button>
          )}
        </div>
        <p className="text-sm text-slate-500 mt-1">Track recurring compliance work. Tasks are created manually — no automatic scheduling.</p>

        {!readOnly && (
          <div className="mt-4">
            <div className="text-xs font-semibold text-slate-500 mb-2">Quick-add template sets</div>
            <div className="flex flex-wrap gap-2">
              {TEMPLATE_BTNS.map(({ key, icon: Icon }) => (
                <button key={key} onClick={() => applyTemplate(key)} disabled={seeding === key}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-60">
                  {seeding === key ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />} {TEMPLATE_SETS[key].label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-2 mt-4">
          {VIEWS.map((v) => (
            <button key={v.key} onClick={() => setView(v.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${view === v.key ? 'bg-[#0F1E3C] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {v.label}
              {v.key === 'overdue' && overdue.length > 0 && <span className="ml-1.5 text-red-300">({overdue.length})</span>}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-500">
          No maintenance tasks in this view. Use a template set or add a task to get started.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {rows.map((t) => (
            <MaintenanceRow key={t.id} task={t} readOnly={readOnly} overdue={isMaintenanceOverdue(t)}
              onEdit={() => { setEditing(t); setModal(true); }} onDelete={() => remove(t.id)} onStatus={(s) => updateStatus(t.id, s)} />
          ))}
        </div>
      )}

      {modal && (
        <MaintenanceFormModal project={project} existing={editing} evidence={evidence}
          onClose={() => setModal(false)} onSaved={() => { setModal(false); load(); }} />
      )}
    </div>
  );
}