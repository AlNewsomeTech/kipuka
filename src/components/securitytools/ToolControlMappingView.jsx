import { useState, useEffect, useCallback } from 'react';
import { Loader2, Plus, Trash2, ShieldCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { SUPPORT_TYPES, TOOL_SUPPORT_DISCLAIMER } from '@/lib/securityTools';

// Manage which controls each active tool supports. These records drive the
// compact "Related Security Tools" area on control pages.
export default function ToolControlMappingView({ project, activeTools, readOnly }) {
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ tool_name: '', control_id: '', control_title: '', support_type: 'Supporting Evidence Source' });

  const load = useCallback(async () => {
    setLoading(true);
    const rows = await base44.entities.ToolControlMapping.filter({ project_id: project.id }).catch(() => []);
    setMappings(rows);
    setLoading(false);
  }, [project.id]);

  useEffect(() => { load(); }, [load]);

  const activeNames = activeTools.map((t) => t.tool_name);

  const addMapping = async () => {
    if (!form.tool_name || !form.control_id.trim()) return;
    await base44.entities.ToolControlMapping.create({
      organization_id: project.organization_id, project_id: project.id,
      tool_name: form.tool_name, control_id: form.control_id.trim().toUpperCase(),
      control_title: form.control_title.trim(), support_type: form.support_type, active: true,
    });
    setForm({ tool_name: '', control_id: '', control_title: '', support_type: 'Supporting Evidence Source' });
    setAdding(false);
    load();
  };

  const toggleActive = async (m) => { await base44.entities.ToolControlMapping.update(m.id, { active: !m.active }); load(); };
  const remove = async (id) => { await base44.entities.ToolControlMapping.delete(id); load(); };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#0F1E3C]" />
            <h2 className="text-lg font-bold text-slate-900">Tool Control Mapping</h2>
          </div>
          {!readOnly && activeNames.length > 0 && (
            <button onClick={() => setAdding((v) => !v)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52]">
              <Plus className="w-4 h-4" /> Add Mapping
            </button>
          )}
        </div>
        <p className="text-[13px] text-slate-500 mt-2">{TOOL_SUPPORT_DISCLAIMER}</p>

        {adding && (
          <div className="mt-4 grid sm:grid-cols-2 gap-3 border border-slate-200 rounded-lg p-3 bg-slate-50">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Tool</label>
              <select className="form-input" value={form.tool_name} onChange={(e) => setForm((f) => ({ ...f, tool_name: e.target.value }))}>
                <option value="">Select tool…</option>
                {activeNames.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Support Type</label>
              <select className="form-input" value={form.support_type} onChange={(e) => setForm((f) => ({ ...f, support_type: e.target.value }))}>
                {SUPPORT_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Control ID</label>
              <input className="form-input" placeholder="e.g. SI.L2-3.14.1" value={form.control_id} onChange={(e) => setForm((f) => ({ ...f, control_id: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Control Title (optional)</label>
              <input className="form-input" value={form.control_title} onChange={(e) => setForm((f) => ({ ...f, control_title: e.target.value }))} />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <button onClick={addMapping} disabled={!form.tool_name || !form.control_id.trim()}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] disabled:opacity-60">Add</button>
            </div>
          </div>
        )}
      </div>

      {mappings.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-500">
          No tool-to-control mappings yet. Enabling a tool seeds suggested mappings automatically, or add them manually above.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {mappings.map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span className="font-mono text-xs text-slate-500 w-28 flex-shrink-0">{m.control_id}</span>
              <span className="text-slate-700 font-medium flex-shrink-0">{m.tool_name}</span>
              <span className="text-xs text-slate-500">{m.support_type}</span>
              {m.control_title && <span className="text-xs text-slate-400 truncate hidden md:inline">{m.control_title}</span>}
              <div className="ml-auto flex items-center gap-2 flex-shrink-0">
                <button onClick={() => toggleActive(m)} disabled={readOnly}
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${m.active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                  {m.active ? 'Active' : 'Inactive'}
                </button>
                {!readOnly && <button onClick={() => remove(m.id)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}