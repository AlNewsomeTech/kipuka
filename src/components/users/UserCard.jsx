import { Shield, Wrench, Building2, Check } from 'lucide-react';

const roles = [
  { value: 'admin', label: 'Admin', icon: Shield },
  { value: 'technician', label: 'Technician', icon: Wrench },
  { value: 'client', label: 'Client', icon: Building2 },
];

export default function UserCard({ user, clients, onRoleChange, onToggleClient }) {
  const assignedIds = (user.assigned_client_ids || '').split(',').filter(Boolean);
  const showAssignment = user.role === 'technician' || user.role === 'client';

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#0F1E3C] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
            {(user.full_name || user.email || '?').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-800 truncate">{user.full_name || 'Unnamed'}</div>
            <div className="text-xs text-slate-500 truncate">{user.email}</div>
          </div>
        </div>
        <select
          value={user.role || 'technician'}
          onChange={e => onRoleChange(user.id, e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 flex-shrink-0"
        >
          {roles.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>
      {showAssignment && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="text-[10px] font-semibold text-slate-500 uppercase mb-2">
            Assigned Clients {user.role === 'client' ? '(their project)' : ''}
          </div>
          {clients.length === 0 ? (
            <p className="text-xs text-slate-400">No clients available to assign.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {clients.map(c => {
                const isAssigned = assignedIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => onToggleClient(user.id, c.id, user.assigned_client_ids)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${isAssigned ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}
                  >
                    {isAssigned && <Check className="w-3 h-3 inline mr-1" />}
                    {c.legal_name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}