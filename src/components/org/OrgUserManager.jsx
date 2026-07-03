import { useState, useEffect, useCallback } from 'react';
import { UserPlus, Trash2, ShieldCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { ORG_ROLES } from '@/lib/orgRoles';
import { logAudit, AUDIT_ACTIONS } from '@/lib/auditLog';
import StatusBadge from '@/components/StatusBadge';

// Manage OrganizationUser records for a given organization.
export default function OrgUserManager({ organizationId, canManage, seatLimit }) {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [invite, setInvite] = useState({ user_email: '', user_name: '', role: 'Evidence Contributor' });

  const load = useCallback(async () => {
    setLoading(true);
    const rows = await base44.entities.OrganizationUser.filter({ organization_id: organizationId }).catch(() => []);
    setUsers(rows.filter((r) => r.status !== 'Removed'));
    setLoading(false);
  }, [organizationId]);

  useEffect(() => { if (organizationId) load(); }, [organizationId, load]);

  const atSeatLimit = seatLimit != null && users.length >= seatLimit;

  const addUser = async () => {
    if (!invite.user_email.trim()) return;
    const created = await base44.entities.OrganizationUser.create({
      organization_id: organizationId, user_email: invite.user_email.trim(),
      user_name: invite.user_name.trim(), role: invite.role, status: 'Invited',
    });
    await logAudit({ organizationId, user, actionType: AUDIT_ACTIONS.USER_ROLE_CHANGE, targetEntity: 'OrganizationUser', targetRecordId: created.id, summary: `Invited ${invite.user_email} as ${invite.role}` });
    setInvite({ user_email: '', user_name: '', role: 'Evidence Contributor' });
    setShowInvite(false);
    load();
  };

  const changeRole = async (u, role) => {
    await base44.entities.OrganizationUser.update(u.id, { role });
    await logAudit({ organizationId, user, actionType: AUDIT_ACTIONS.USER_ROLE_CHANGE, targetEntity: 'OrganizationUser', targetRecordId: u.id, summary: `Changed ${u.user_email} role to ${role}` });
    load();
  };

  const removeUser = async (u) => {
    await base44.entities.OrganizationUser.update(u.id, { status: 'Removed' });
    await logAudit({ organizationId, user, actionType: AUDIT_ACTIONS.USER_ROLE_CHANGE, targetEntity: 'OrganizationUser', targetRecordId: u.id, summary: `Removed ${u.user_email}` });
    load();
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-800">User Management</h3>
          <span className="text-xs text-slate-400">{users.length}{seatLimit != null ? ` / ${seatLimit} seats` : ' users'}</span>
        </div>
        {canManage && (
          <button onClick={() => setShowInvite((s) => !s)} disabled={atSeatLimit} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 disabled:opacity-50">
            <UserPlus className="w-3.5 h-3.5" /> Add User
          </button>
        )}
      </div>

      {atSeatLimit && canManage && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">Seat limit reached. Upgrade the subscription tier or remove a user to add more.</p>
      )}

      {showInvite && canManage && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-4 p-3 bg-slate-50 rounded-lg">
          <input className="form-input" placeholder="Email" value={invite.user_email} onChange={(e) => setInvite({ ...invite, user_email: e.target.value })} />
          <input className="form-input" placeholder="Name" value={invite.user_name} onChange={(e) => setInvite({ ...invite, user_name: e.target.value })} />
          <select className="form-input" value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value })}>
            {ORG_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button onClick={addUser} className="px-3 py-2 text-xs font-semibold bg-[#0F1E3C] text-white rounded-lg hover:bg-[#1E2D4A]">Add</button>
        </div>
      )}

      {loading ? (
        <div className="py-8 flex justify-center"><div className="w-5 h-5 border-2 border-slate-200 border-t-slate-700 rounded-full animate-spin" /></div>
      ) : users.length === 0 ? (
        <p className="text-sm text-slate-400 italic py-4 text-center">No users yet.</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-3 py-2.5">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-800 truncate">{u.user_name || u.user_email}</div>
                <div className="text-xs text-slate-400 truncate">{u.user_email}</div>
              </div>
              <StatusBadge status={u.status === 'Active' ? 'Active' : u.status === 'Disabled' ? 'Disabled' : 'Pending'} size="xs" />
              {canManage ? (
                <select value={u.role} onChange={(e) => changeRole(u, e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700">
                  {ORG_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              ) : (
                <span className="text-xs text-slate-500">{u.role}</span>
              )}
              {canManage && (
                <button onClick={() => removeUser(u)} title="Remove" className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}