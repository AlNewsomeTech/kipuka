import { useState, useEffect } from 'react';
import { KanbanSquare, Plus, X, ExternalLink, CheckCircle2, AlertCircle, ListChecks } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useClient } from '@/lib/clientContext';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import BulkUpdateBar from '@/components/BulkUpdateBar';
import Level2Board from '@/components/board/Level2Board';

const phases = [
  'Intake', 'Scope', 'Tenant Baseline', 'Google Migration Planning', 'Identity Setup',
  'MFA and Conditional Access', 'SharePoint Evidence Archive', 'FCI Storage Setup',
  'Exchange Security', 'Defender and Security Baseline', 'NinjaOne Endpoint Setup',
  'Level 1 Control Validation', 'Level 1 Evidence Review', 'SPRS and Attestation',
  'Level 2 Readiness', 'Final Package'
];
const statuses = ['Not Started', 'In Progress', 'Evidence Needed', 'Ready for Review', 'Reviewed', 'Complete', 'Blocker'];
const priorities = ['Low', 'Medium', 'High', 'Critical'];

export default function DeploymentBoard() {
  const { selectedClientId, selectedClient } = useClient();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggedId, setDraggedId] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = () => {
    setGenerating(true);
    base44.functions.invoke('generateDeploymentTasks', { client_id: selectedClientId })
      .then(() => loadTasks())
      .catch(() => {})
      .finally(() => setGenerating(false));
  };

  const loadTasks = () => {
    if (!selectedClientId) { setLoading(false); return; }
    base44.entities.DeploymentTask.filter({ client_id: selectedClientId })
      .then(setTasks)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(loadTasks, [selectedClientId]);

  const handleDrop = (phase) => {
    if (!draggedId) return;
    base44.entities.DeploymentTask.update(draggedId, { phase })
      .then(() => { setDraggedId(null); loadTasks(); });
  };

  const toggleSelect = (taskId) => {
    setSelectedIds(prev => prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]);
  };

  const exitBulkMode = () => { setBulkMode(false); setSelectedIds([]); };
  const activePhases = phases.filter(p => tasks.some(t => t.phase === p));
  const otherTasks = tasks.filter(t => !phases.includes(t.phase));

  if (!selectedClient) return <EmptyState icon={KanbanSquare} title="No client selected" description="Select a client to view the deployment board." />;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Deployment Board</h1>
          <p className="text-sm text-slate-500 mt-1">Level 1 &amp; Level 2 boards for {selectedClient.legal_name} — drag cards between phases</p>
        </div>
        <button
          onClick={() => bulkMode ? exitBulkMode() : setBulkMode(true)}
          className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-colors ${bulkMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
        >
          <ListChecks className="w-4 h-4" /> {bulkMode ? 'Exit Bulk Update' : 'Bulk Update'}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-[#0F1E3C] rounded-full animate-spin" /></div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={KanbanSquare}
          title="No tasks yet"
          description="Generate the standard CMMC deployment task set for this client to populate the board."
          action={
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-2 bg-[#0F1E3C] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#1E2D4A] transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" /> {generating ? 'Generating...' : 'Generate Deployment Tasks'}
            </button>
          }
        />
      ) : (
      <div>
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
            <KanbanSquare className="w-5 h-5 text-blue-700" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Level 1 Deployment Board</h2>
            <p className="text-sm text-slate-500">{tasks.length} tasks across implementation phases</p>
          </div>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-4">
        {[...activePhases, ...(otherTasks.length > 0 ? ['Other'] : [])].map((phase) => {
          const phaseTasks = phase === 'Other' ? otherTasks : tasks.filter(t => t.phase === phase);
          return (
            <div
              key={phase}
              onDragOver={e => e.preventDefault()}
              onDrop={() => handleDrop(phase)}
              className="flex-shrink-0 w-64 bg-slate-100/70 rounded-xl p-2.5 min-h-[200px]"
            >
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-semibold text-slate-700">{phase}</span>
                <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full">{phaseTasks.length}</span>
              </div>
              <div className="space-y-2">
                {phaseTasks.map((task) => (
                  <div
                    key={task.id}
                    draggable={!bulkMode}
                    onDragStart={() => setDraggedId(task.id)}
                    onClick={() => bulkMode ? toggleSelect(task.id) : setSelectedTask(task)}
                    className={`bg-white rounded-lg p-3 shadow-sm border cursor-pointer hover:shadow-md transition-all ${bulkMode && selectedIds.includes(task.id) ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200/60 hover:border-slate-300'}`}
                  >
                    {bulkMode && (
                      <div className="flex items-center gap-2 mb-1.5">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(task.id)}
                          onChange={() => toggleSelect(task.id)}
                          onClick={e => e.stopPropagation()}
                          className="w-4 h-4 rounded border-slate-300"
                        />
                        <span className="text-xs font-medium text-slate-800 leading-tight flex-1">{task.title}</span>
                      </div>
                    )}
                    {!bulkMode && (
                      <div className="flex items-start justify-between gap-1 mb-1.5">
                        <span className="text-xs font-medium text-slate-800 leading-tight">{task.title}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <StatusBadge status={task.status} size="xs" />
                      {task.priority === 'Critical' && <span className="text-[10px] text-red-600 font-medium">🔴 {task.priority}</span>}
                      {task.priority === 'High' && <span className="text-[10px] text-amber-600 font-medium">{task.priority}</span>}
                    </div>
                    {task.related_control && <div className="text-[10px] text-slate-400 mt-1.5">{task.related_control}</div>}
                    {task.owner && <div className="text-[10px] text-slate-400 mt-0.5">👤 {task.owner}</div>}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        </div>
      </div>
      )}

      <div className="pt-4 mt-2 border-t border-slate-200">
        <Level2Board clientId={selectedClientId} />
      </div>

      {selectedTask && <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} onUpdate={loadTasks} />}

      {bulkMode && (
        <BulkUpdateBar
          selectedIds={selectedIds}
          onClear={() => setSelectedIds([])}
          onApplied={() => { setSelectedIds([]); loadTasks(); }}
        />
      )}
    </div>
  );
}

function TaskDetailModal({ task, onClose, onUpdate }) {
  const [form, setForm] = useState(task);
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    base44.entities.DeploymentTask.update(task.id, form)
      .then(() => { setSaving(false); onUpdate(); onClose(); })
      .catch(() => setSaving(false));
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-slate-900">{form.title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Status"><select className="form-input" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>{statuses.map(s => <option key={s}>{s}</option>)}</select></Field>
            <Field label="Priority"><select className="form-input" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>{priorities.map(s => <option key={s}>{s}</option>)}</select></Field>
            <Field label="Phase"><select className="form-input" value={form.phase} onChange={e => setForm({...form, phase: e.target.value})}>{phases.map(s => <option key={s}>{s}</option>)}</select></Field>
            <Field label="Owner"><input className="form-input" value={form.owner || ''} onChange={e => setForm({...form, owner: e.target.value})} /></Field>
            <Field label="Due Date"><input type="date" className="form-input" value={form.due_date || ''} onChange={e => setForm({...form, due_date: e.target.value})} /></Field>
            <Field label="Related Control"><input className="form-input" value={form.related_control || ''} onChange={e => setForm({...form, related_control: e.target.value})} /></Field>
            <Field label="Related System"><input className="form-input" value={form.related_system || ''} onChange={e => setForm({...form, related_system: e.target.value})} /></Field>
            <Field label="Admin Center URL"><input className="form-input" value={form.admin_center_url || ''} onChange={e => setForm({...form, admin_center_url: e.target.value})} /></Field>
          </div>

          <Field label="Instructions"><textarea className="form-input min-h-[60px]" value={form.instructions || ''} onChange={e => setForm({...form, instructions: e.target.value})} /></Field>

          {/* Runbook */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-600" /> Technician Runbook</h3>
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Purpose"><textarea className="form-input" value={form.runbook_purpose || ''} onChange={e => setForm({...form, runbook_purpose: e.target.value})} /></Field>
              <Field label="Required Role"><input className="form-input" value={form.runbook_role || ''} onChange={e => setForm({...form, runbook_role: e.target.value})} /></Field>
              <Field label="What to Click"><textarea className="form-input" value={form.runbook_clicks || ''} onChange={e => setForm({...form, runbook_clicks: e.target.value})} /></Field>
              <Field label="Setting to Choose"><textarea className="form-input" value={form.runbook_setting || ''} onChange={e => setForm({...form, runbook_setting: e.target.value})} /></Field>
              <Field label="Screenshot to Capture"><textarea className="form-input" value={form.runbook_screenshot || ''} onChange={e => setForm({...form, runbook_screenshot: e.target.value})} /></Field>
              <Field label="File Naming Convention"><input className="form-input" value={form.runbook_naming || ''} onChange={e => setForm({...form, runbook_naming: e.target.value})} /></Field>
              <Field label="Where to Save Evidence"><input className="form-input" value={form.runbook_save_location || ''} onChange={e => setForm({...form, runbook_save_location: e.target.value})} /></Field>
              <Field label="How to Validate"><textarea className="form-input" value={form.runbook_validation || ''} onChange={e => setForm({...form, runbook_validation: e.target.value})} /></Field>
            </div>
            <Field label="Common Mistakes"><textarea className="form-input" value={form.runbook_mistakes || ''} onChange={e => setForm({...form, runbook_mistakes: e.target.value})} /></Field>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Required Screenshots"><textarea className="form-input" value={form.required_screenshots || ''} onChange={e => setForm({...form, required_screenshots: e.target.value})} /></Field>
            <Field label="Required Exports"><textarea className="form-input" value={form.required_exports || ''} onChange={e => setForm({...form, required_exports: e.target.value})} /></Field>
            <Field label="Required Documents"><textarea className="form-input" value={form.required_documents || ''} onChange={e => setForm({...form, required_documents: e.target.value})} /></Field>
            <Field label="Validation Checklist"><textarea className="form-input" value={form.validation_checklist || ''} onChange={e => setForm({...form, validation_checklist: e.target.value})} /></Field>
          </div>
          <Field label="Notes"><textarea className="form-input" value={form.notes || ''} onChange={e => setForm({...form, notes: e.target.value})} /></Field>
          {form.admin_center_url && <a href={form.admin_center_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"><ExternalLink className="w-4 h-4" /> Open Admin Center</a>}
        </div>
        <div className="flex justify-end gap-2 p-5 border-t border-slate-200 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Close</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-[#0F1E3C] text-white rounded-lg hover:bg-[#1E2D4A] disabled:opacity-50">{saving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return <div><label className="text-xs font-medium text-slate-600 mb-1 block">{label}</label>{children}</div>;
}