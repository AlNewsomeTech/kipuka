import { useState, useEffect } from 'react';
import { UserCog, UserPlus, ShieldAlert } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useClient } from '@/lib/clientContext';
import { useAuth } from '@/lib/AuthContext';
import EmptyState from '@/components/EmptyState';
import UserCard from '@/components/users/UserCard';
import InviteUserModal from '@/components/users/InviteUserModal';

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const { clients } = useClient();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => { loadUsers(); }, []);

  const loadUsers = async () => {
    try {
      let list = await base44.entities.User.list();
      // Apply any pending custom app role to users who have now accepted their invite.
      for (const u of list) {
        const emailKey = (u.email || '').toLowerCase();
        const pending = emailKey && localStorage.getItem('pending_role_' + emailKey);
        if (pending && u.role !== pending) {
          try {
            await base44.entities.User.update(u.id, { role: pending });
            u.role = pending;
          } catch { /* will retry on next load */ }
          localStorage.removeItem('pending_role_' + emailKey);
        }
        // Apply a pending client assignment queued when the client was created
        // (the invitee didn't exist as a User record until they accepted).
        const pendingAssign = emailKey && localStorage.getItem('pending_assign_' + emailKey);
        if (pendingAssign) {
          const ids = (u.assigned_client_ids || '').split(',').filter(Boolean);
          if (!ids.includes(pendingAssign)) {
            try {
              const assignedStr = [...ids, pendingAssign].join(',');
              await base44.entities.User.update(u.id, { assigned_client_ids: assignedStr });
              u.assigned_client_ids = assignedStr;
            } catch { /* will retry on next load */ }
          }
          localStorage.removeItem('pending_assign_' + emailKey);
        }
      }
      setUsers(list);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleRoleChange = async (userId, role) => {
    try {
      await base44.entities.User.update(userId, { role });
      setUsers(users.map(u => u.id === userId ? { ...u, role } : u));
    } catch (e) { alert('Error updating role: ' + e.message); }
  };

  const handleToggleClient = async (userId, clientId, currentAssigned) => {
    const ids = (currentAssigned || '').split(',').filter(Boolean);
    const newIds = ids.includes(clientId) ? ids.filter(id => id !== clientId) : [...ids, clientId];
    const assignedStr = newIds.join(',');
    try {
      await base44.entities.User.update(userId, { assigned_client_ids: assignedStr });
      setUsers(users.map(u => u.id === userId ? { ...u, assigned_client_ids: assignedStr } : u));
    } catch (e) { alert('Error updating assignment: ' + e.message); }
  };

  const handleInvite = async (email, role) => {
    // Platform invite API only accepts 'admin' or 'user'. Map custom app roles
    // (technician/client) to 'user' at the platform level, then apply the real
    // app role to the user record once they accept and appear in the list.
    const platformRole = role === 'admin' ? 'admin' : 'user';
    await base44.users.inviteUser(email, platformRole);
    if (role !== 'admin' && role !== 'user') {
      localStorage.setItem('pending_role_' + email.toLowerCase(), role);
    }
    setShowInvite(false);
    loadUsers();
  };

  if (currentUser?.role !== 'admin') {
    return <EmptyState icon={ShieldAlert} title="Admin Access Required" description="Only admins can manage users." />;
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manage user roles and client assignments</p>
        </div>
        <button onClick={() => setShowInvite(true)} className="flex items-center gap-2 bg-[#0F1E3C] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#1E2D4A]">
          <UserPlus className="w-4 h-4" /> Invite User
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <span className="font-semibold text-blue-800">Admin</span>
          <p className="text-blue-600 mt-0.5">Sees and manages all clients and users</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <span className="font-semibold text-amber-800">Technician</span>
          <p className="text-amber-600 mt-0.5">Sees assigned projects and clients</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <span className="font-semibold text-green-800">Client</span>
          <p className="text-green-600 mt-0.5">Sees their own project only</p>
        </div>
      </div>

      {users.length === 0 ? (
        <EmptyState icon={UserCog} title="No users found" description="Invite users to get started." />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {users.map(u => (
            <UserCard key={u.id} user={u} clients={clients} onRoleChange={handleRoleChange} onToggleClient={handleToggleClient} />
          ))}
        </div>
      )}

      {showInvite && <InviteUserModal onInvite={handleInvite} onClose={() => setShowInvite(false)} />}
    </div>
  );
}