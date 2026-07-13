import { useState, useEffect, useCallback, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Building2, Users, FolderKanban, HardDrive, Clock, ShieldCheck, Ban, Play, Pencil, ExternalLink, ShieldAlert, ChevronRight, FlaskConical } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useOrg } from '@/lib/orgContext';
import { planLimits } from '@/lib/planTiers';
import { logAudit, AUDIT_ACTIONS } from '@/lib/auditLog';
import TierBadge from '@/components/org/TierBadge';
import StatusBadge from '@/components/StatusBadge';
import OrgFormModal from '@/components/org/OrgFormModal';
import EmptyState from '@/components/EmptyState';
import LegacyMigrationCard from '@/components/admin/LegacyMigrationCard';

export default function SaaSAdmin() {
  const { user } = useAuth();
  const { isPlatformAdmin, selectOrg } = useOrg();
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState([]);
  const [orgUsers, setOrgUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [expandedOrg, setExpandedOrg] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [o, ou, p, c] = await Promise.all([
      base44.entities.Organization.list('-created_date', 500).catch(() => []),
      base44.entities.OrganizationUser.list('-created_date', 2000).catch(() => []),
      base44.entities.Project.list('-created_date', 2000).catch(() => []),
      base44.entities.Client.list('-created_date', 2000).catch(() => []),
    ]);
    setOrgs(o); setOrgUsers(ou); setProjects(p); setClients(c);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!isPlatformAdmin) {
    return (
      <div className="max-w-2xl mx-auto py-16">
        <EmptyState icon={ShieldAlert} title="Restricted area" description="The Pac-Sec SaaS Admin console is available to Pac-Sec administrators only." />
      </div>
    );
  }

  const usersFor = (orgId) => orgUsers.filter((u) => u.organization_id === orgId && u.status !== 'Removed');
  const projectsFor = (orgId) => projects.filter((p) => p.organization_id === orgId);
  const clientsFor = (orgId) => clients.filter((c) => c.organization_id === orgId);

  const toggleSuspend = async (org) => {
    const suspend = org.subscription_status !== 'Suspended';
    await base44.entities.Organization.update(org.id, { subscription_status: suspend ? 'Suspended' : 'Active' });
    await logAudit({
      organizationId: org.id, user,
      actionType: suspend ? AUDIT_ACTIONS.ORG_SUSPEND : AUDIT_ACTIONS.ORG_REACTIVATE,
      targetEntity: 'Organization', targetRecordId: org.id,
      summary: `${suspend ? 'Suspended' : 'Reactivated'} ${org.organization_name}`,
    });
    load();
  };

  const openWorkspace = (org) => {
    selectOrg(org.id);
    navigate('/org-settings');
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#0F1E3C]" /> Pac-Sec SaaS Admin
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage all customer organizations, subscriptions, and access.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/demo-workspace')} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-amber-500 text-slate-900 rounded-lg hover:bg-amber-400">
            <FlaskConical className="w-4 h-4" /> Launch Demo Workspace
          </button>
          <button onClick={() => { setEditing(null); setModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-[#0F1E3C] text-white rounded-lg hover:bg-[#1E2D4A]">
            <Plus className="w-4 h-4" /> Add Organization
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon={Building2} label="Organizations" value={orgs.length} />
        <StatCard icon={ShieldCheck} label="Active" value={orgs.filter((o) => o.subscription_status === 'Active' || o.subscription_status === 'Trial').length} />
        <StatCard icon={Ban} label="Suspended" value={orgs.filter((o) => o.subscription_status === 'Suspended' || o.subscription_status === 'Cancelled').length} />
        <StatCard icon={Users} label="Total seats used" value={orgUsers.filter((u) => u.status !== 'Removed').length} />
      </div>

      <LegacyMigrationCard />

      {loading ? (
        <div className="py-16 flex justify-center"><div className="w-6 h-6 border-2 border-slate-200 border-t-slate-700 rounded-full animate-spin" /></div>
      ) : orgs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200">
          <EmptyState icon={Building2} title="No organizations yet" description="Add your first customer organization to begin licensing the platform." />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-slate-500 border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3">Organization</th>
                  <th className="px-4 py-3">Tier</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"><span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Seats</span></th>
                  <th className="px-4 py-3"><span className="inline-flex items-center gap-1"><FolderKanban className="w-3.5 h-3.5" /> Projects</span></th>
                  <th className="px-4 py-3"><span className="inline-flex items-center gap-1"><HardDrive className="w-3.5 h-3.5" /> Storage</span></th>
                  <th className="px-4 py-3"><span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Last login</span></th>
                  <th className="px-4 py-3">Terms</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orgs.map((org) => {
                  const seats = usersFor(org.id);
                  const cfg = planLimits(org.plan_tier);
                  const orgProjects = projectsFor(org.id);
                  const orgClients = clientsFor(org.id);
                  const projCount = orgProjects.length;
                  const lastLogin = seats
                    .map((s) => s.last_login_date).filter(Boolean)
                    .sort().slice(-1)[0];
                  const accepted = seats.filter((s) => s.terms_accepted_version).length;
                  const isExpanded = expandedOrg === org.id;
                  return (
                    <Fragment key={org.id}>
                    <tr className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <button onClick={() => setExpandedOrg(isExpanded ? null : org.id)} className="flex items-center gap-1.5 text-left">
                          <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                          <span>
                            <span className="block font-semibold text-slate-800">{org.organization_name}</span>
                            {org.short_name && <span className="block text-xs text-slate-400">{org.short_name}</span>}
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-3"><TierBadge org={org} /></td>
                      <td className="px-4 py-3"><StatusBadge status={mapStatus(org.subscription_status)} /></td>
                      <td className="px-4 py-3 text-slate-700">{seats.length}{cfg.seat_limit != null ? ` / ${org.seat_limit ?? cfg.seat_limit}` : ' / ∞'}</td>
                      <td className="px-4 py-3 text-slate-700">{projCount}{cfg.project_limit != null ? ` / ${cfg.project_limit}` : ' / ∞'}</td>
                      <td className="px-4 py-3 text-slate-700">{org.storage_limit_gb != null ? `— / ${org.storage_limit_gb} GB` : '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{lastLogin ? new Date(lastLogin).toLocaleDateString() : '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{accepted}/{seats.length}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <IconBtn title="Open workspace" onClick={() => openWorkspace(org)}><ExternalLink className="w-4 h-4" /></IconBtn>
                          <IconBtn title="Edit" onClick={() => { setEditing(org); setModalOpen(true); }}><Pencil className="w-4 h-4" /></IconBtn>
                          {org.subscription_status === 'Suspended' ? (
                            <IconBtn title="Reactivate" onClick={() => toggleSuspend(org)}><Play className="w-4 h-4 text-green-600" /></IconBtn>
                          ) : (
                            <IconBtn title="Suspend" onClick={() => toggleSuspend(org)}><Ban className="w-4 h-4 text-red-600" /></IconBtn>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-slate-50/60">
                        <td colSpan={9} className="px-6 py-4">
                          <div className="grid md:grid-cols-2 gap-6">
                            <div>
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                                <FolderKanban className="w-3.5 h-3.5" /> Projects ({orgProjects.length})
                              </div>
                              {orgProjects.length === 0 ? (
                                <p className="text-xs text-slate-400">No projects for this organization yet.</p>
                              ) : (
                                <div className="space-y-1.5">
                                  {orgProjects.map((p) => (
                                    <button key={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="w-full flex items-center gap-2 text-left bg-white border border-slate-200 rounded-lg px-3 py-2 hover:border-blue-300">
                                      <span className="flex-1 text-sm font-medium text-slate-700 truncate">{p.project_name}</span>
                                      <span className="text-[11px] text-slate-400">{p.target_cmmc_level}</span>
                                      <StatusBadge status={mapStatus(p.project_status)} />
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                                <Building2 className="w-3.5 h-3.5" /> Clients ({orgClients.length})
                              </div>
                              {orgClients.length === 0 ? (
                                <p className="text-xs text-slate-400">No clients linked to this organization. Link clients on the Clients page.</p>
                              ) : (
                                <div className="space-y-1.5">
                                  {orgClients.map((c) => (
                                    <div key={c.id} className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
                                      <span className="flex-1 text-sm font-medium text-slate-700 truncate">{c.legal_name}</span>
                                      <span className="text-[11px] text-slate-400">{c.target_cmmc_level}</span>
                                      <StatusBadge status={c.project_status} />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <OrgFormModal open={modalOpen} org={editing} onClose={() => setModalOpen(false)} onSaved={load} />
    </div>
  );
}

function mapStatus(s) {
  if (s === 'Active') return 'Active';
  if (s === 'Suspended' || s === 'Cancelled') return 'Blocker';
  if (s === 'Past Due') return 'Evidence Needed';
  return 'In Progress';
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 text-slate-500 mb-1"><Icon className="w-4 h-4" /><span className="text-xs font-medium">{label}</span></div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

function IconBtn({ title, onClick, children }) {
  return (
    <button title={title} onClick={onClick} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800">{children}</button>
  );
}