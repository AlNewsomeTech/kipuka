import { useState, useEffect, useCallback } from 'react';
import { Loader2, Plus, Trash2, ListChecks } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import StatusBadge from '@/components/StatusBadge';

const EVIDENCE_TYPES = ['Screenshot', 'Report Export', 'Configuration Export', 'Policy', 'Procedure', 'Log', 'Dashboard View', 'Other'];
const UPLOAD_STATUSES = ['Not Started', 'Uploaded', 'Needs Review', 'Accepted', 'Rejected'];

// Manual evidence checklist per tool. Rows can be added, status-tracked, and
// linked to controls. Evidence itself lives in the Evidence Vault; this tracks
// what still needs collecting.
export default function ToolEvidenceChecklistView({ project, activeTools, readOnly, onSeedFromRunbooks }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ tool_name: '', checklist_item_title: '', evidence_type: 'Screenshot' });

  const load = useCallback(async () => {
    setLoading(true);
    const rows = await base44.entities.ToolEvidenceChecklist.filter({ project_id: project.id }).catch(() => []);
    setItems(rows);
    setLoading(false);
  }, [project.id]);

  useEffect(() => { load(); }, [load]);

  const activeNames = activeTools.map((t) => t.tool_name);

  const addItem = async () => {
    if (!form.tool_name || !form.checklist_item_title.trim()) return;
    await base44.entities.ToolEvidenceChecklist.create({
      organization_id: project.organization_id, project_id: project.id,
      tool_name: form.tool_name, checklist_item_title: form.checklist_item_title.trim(),
      evidence_type: form.evidence_type, upload_status: 'Not Started',
    });
    setForm({ tool_name: '', checklist_item_title: '', evidence_type: 'Screenshot' });
    setAdding(false);
    load();
  };

  const setStatus = async (item, status) => { await base44.entities.ToolEvidenceChecklist.update(item.id, { upload_status: status }); load(); };
  const remove = async (id) => { await base44.entities.ToolEvidenceChecklist.delete(id); load(); };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-[#0F1E3C]" />
            <h2 className="text-lg font-bold text-slate-900">Tool Evidence Checklist</h2>
          </div>
          {!readOnly && activeNames.length > 0 && (
            <div className="flex gap-2">
              <button onClick={onSeedFromRunbooks} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200">
                Seed from Runbooks
              </button>
              <button onClick={() => setAdding((v) => !v)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52]">
                <Plus className="w-4 h-4" /> Add Item
              </button>
            </div>
          )}
        </div>

        {adding && (
          <div className="mt-4 grid sm:grid-cols-3 gap-3 border border-slate-200 rounded-lg p-3 bg-slate-50">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Tool</label>
              <select className="form-input" value={form.tool_name} onChange={(e) => setForm((f) => ({ ...f, tool_name: e.target.value }))}>
                <option value="">Select…</option>
                {activeNames.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Evidence Item</label>
              <input className="form-input" value={form.checklist_item_title} onChange={(e) => setForm((f) => ({ ...f, checklist_item_title: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Evidence Type</label>
              <select className="form-input" value={form.evidence_type} onChange={(e) => setForm((f) => ({ ...f, evidence_type: e.target.value }))}>
                {EVIDENCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="sm:col-span-3 flex justify-end">
              <button onClick={addItem} disabled={!form.tool_name || !form.checklist_item_title.trim()}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] disabled:opacity-60">Add</button>
            </div>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-500">
          No evidence checklist items yet. Use "Seed from Runbooks" to generate a starter checklist for each active tool, or add items manually.
        </div>
      ) : (
        <div className="space-y-3">
          {activeNames.map((toolName) => {
            const toolItems = items.filter((i) => i.tool_name === toolName);
            if (toolItems.length === 0) return null;
            return (
              <div key={toolName} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="text-sm font-bold text-slate-800 mb-2">{toolName}</div>
                <div className="divide-y divide-slate-100">
                  {toolItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 py-2.5 text-sm">
                      <span className="text-slate-700 flex-1 min-w-0">{item.checklist_item_title}</span>
                      <span className="text-[11px] text-slate-400 hidden md:inline">{item.evidence_type}</span>
                      {!readOnly ? (
                        <select value={item.upload_status} onChange={(e) => setStatus(item, e.target.value)}
                          className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700">
                          {UPLOAD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      ) : <StatusBadge status={item.upload_status} size="xs" />}
                      {!readOnly && <button onClick={() => remove(item.id)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}