import { useState, useEffect, useCallback, useMemo } from 'react';
import { Library, Plus, Loader2, Search } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ControlLibraryEditor from '@/components/controllibrary/ControlLibraryEditor';

export default function ControlLibraryAdmin() {
  const [controls, setControls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const list = await base44.entities.ControlLibrary.list('sort_order', 500).catch(() => []);
    setControls(list);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => controls.filter((c) => {
    if (level && c.cmmc_level !== level) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return [c.control_id, c.control_title, c.domain].some((v) => (v || '').toLowerCase().includes(q));
  }), [controls, search, level]);

  const byDomain = useMemo(() => {
    const map = {};
    filtered.forEach((c) => (map[c.domain || 'Other'] ||= []).push(c));
    return map;
  }, [filtered]);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <Library className="w-5 h-5 text-[#0F1E3C]" />
            <div>
              <h1 className="text-lg font-bold text-slate-900">Control Library</h1>
              <p className="text-sm text-slate-500">Maintain the master control content used across all projects.</p>
            </div>
          </div>
          <button onClick={() => setCreating(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52]">
            <Plus className="w-4 h-4" /> Add Control
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input className="form-input pl-9" placeholder="Search controls…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="form-input max-w-[160px]" value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="">All Levels</option>
            {['Level 1', 'Level 2', 'Level 3', 'Not Applicable'].map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
      ) : (
        Object.keys(byDomain).sort().map((domain) => (
          <div key={domain} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 text-sm font-bold text-slate-800">{domain} <span className="text-slate-400 font-normal">({byDomain[domain].length})</span></div>
            <div className="divide-y divide-slate-100">
              {byDomain[domain].map((c) => (
                <button key={c.id} onClick={() => setEditing(c)} className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-50 text-left">
                  <span className="text-xs font-mono font-semibold text-slate-500">{c.control_id}</span>
                  <span className="text-sm text-slate-800 flex-1 truncate">{c.control_title}</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{c.cmmc_level}</span>
                  {!c.active && <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">Inactive</span>}
                </button>
              ))}
            </div>
          </div>
        ))
      )}

      {(editing || creating) && (
        <ControlLibraryEditor
          existing={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={() => { setEditing(null); setCreating(false); load(); }}
        />
      )}
    </div>
  );
}