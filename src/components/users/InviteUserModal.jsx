import { useState } from 'react';
import { X, UserPlus, Shield, Wrench, Building2 } from 'lucide-react';

const roles = [
  { value: 'admin', label: 'Admin', icon: Shield, description: 'See and manage all clients and users' },
  { value: 'technician', label: 'Technician', icon: Wrench, description: 'See assigned projects and clients' },
  { value: 'client', label: 'Client', icon: Building2, description: 'See their own project only' },
];

export default function InviteUserModal({ onInvite, onClose }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('technician');
  const [inviting, setInviting] = useState(false);

  const handleInvite = async () => {
    setInviting(true);
    try {
      await onInvite(email, role);
    } catch (e) {
      alert('Error inviting user: ' + e.message);
    }
    setInviting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Invite User</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 block">Email Address</label>
            <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="user@example.com" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-2 block">Role</label>
            <div className="space-y-2">
              {roles.map(r => {
                const Icon = r.icon;
                return (
                  <label key={r.value} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${role === r.value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <input type="radio" name="role" value={r.value} checked={role === r.value} onChange={e => setRole(e.target.value)} className="mt-1" />
                    <Icon className="w-4 h-4 text-slate-600 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-slate-800">{r.label}</div>
                      <div className="text-xs text-slate-500">{r.description}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 p-5 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
          <button onClick={handleInvite} disabled={inviting || !email} className="flex items-center gap-2 px-4 py-2 text-sm bg-[#0F1E3C] text-white rounded-lg hover:bg-[#1E2D4A] disabled:opacity-50">
            <UserPlus className="w-4 h-4" /> {inviting ? 'Inviting...' : 'Send Invite'}
          </button>
        </div>
      </div>
    </div>
  );
}