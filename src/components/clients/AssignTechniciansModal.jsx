import { useState, useEffect } from 'react';
import { X, UserCheck, Search } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function AssignTechniciansModal({ client, onClose, onAssigned }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [assignedIds, setAssignedIds] = useState(new Set());

  useEffect(() => {
    base44.entities.User.list()
      .then((data) => {
        const eligible = data.filter((u) => u.role === 'admin' || u.role === 'technician');
        setUsers(eligible);
        const initial = new Set(
          eligible
            .filter((u) => (u.assigned_client_ids || '').split(',').filter(Boolean).includes(client.id))
            .map((u) => u.id)
        );
        setAssignedIds(initial);
      })
      .catch((e) => alert('Error loading users: ' + e.message))
      .finally(() => setLoading(false));
  }, [client.id]);

  const toggle = (userId) => {
    setAssignedIds((prev) => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all(
        users.map((u) => {
          const ids = (u.assigned_client_ids || '').split(',').filter(Boolean);
          const has = ids.includes(client.id);
          const shouldHave = assignedIds.has(u.id);
          if (has === shouldHave) return null;
          const nextIds = shouldHave ? [...ids, client.id] : ids.filter((id) => id !== client.id);
          return base44.entities.User.update(u.id, { assigned_client_ids: nextIds.join(',') });
        })
      );
      onAssigned && onAssigned();
      onClose();
    } catch (e) {
      alert('Error saving assignments: ' + e.message);
    }
    setSaving(false);
  };

  const filtered = users.filter(
    (u) =>
      !search ||
      (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => !saving && onClose()}>
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Assign Team</h2>
            <p className="text-sm text-slate-500">Grant access to {client.legal_name}</p>
          </div>
          <button onClick={() => !saving && onClose()} disabled={saving} className="text-slate-400 hover:text-slate-600 disabled:opacity-50"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              placeholder="Search admins & technicians..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {loading ? (
            <div className="flex justify-center py-10"><div className="w-6 h-6 border-4 border-slate-200 border-t-[#0F1E3C] rounded-full animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No admins or technicians found.</p>
          ) : (
            filtered.map((u) => (
              <label key={u.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                <input type="checkbox" checked={assignedIds.has(u.id)} onChange={() => toggle(u.id)} className="w-4 h-4 rounded border-slate-300" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{u.full_name || u.email}</p>
                  <p className="text-xs text-slate-500 truncate">{u.email}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>{u.role}</span>
              </label>
            ))
          )}
        </div>

        <div className="flex justify-end gap-2 p-5 border-t border-slate-200">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50">Cancel</button>
          <button onClick={handleSave} disabled={saving || loading} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-[#0F1E3C] text-white rounded-lg hover:bg-[#1E2D4A] disabled:opacity-50">
            <UserCheck className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Assignments'}
          </button>
        </div>
      </div>
    </div>
  );
}