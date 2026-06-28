import { useState, useEffect } from 'react';
import { Building2, Plus, X, Users, Monitor, Shield, Calendar, Pencil, Trash2, AlertTriangle, Copy, Cloud, MapPin, UserCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useClient } from '@/lib/clientContext';
import { useAuth } from '@/lib/AuthContext';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import AssignTechniciansModal from '@/components/clients/AssignTechniciansModal';

const envTypes = ['Greenfield', 'Existing M365', 'Google Migration', 'Hybrid'];
const cmmcLevels = ['Level 1', 'Level 2 Ready', 'Level 2'];

export default function Clients() {
  const { clients, setSelectedClientId, selectedClientId, refreshClients } = useClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [assignClient, setAssignClient] = useState(null);
  const [form, setForm] = useState({
    legal_name: '', dba_name: '', primary_domain: '', ms_tenant_domain: '',
    poc_name: '', poc_email: '', executive_sponsor: '',
    initial_user_count: 13, expected_user_count: 13,
    environment_type: 'Greenfield', target_cmmc_level: 'Level 1',
    cloud_only: false, has_physical_location: true, physical_location_description: '',
    fci_in_scope: true, cui_in_scope: false,
    ms_license_level: 'Microsoft 365 E5', ninjaone_in_scope: true, cortex_xdr_in_scope: false, mac_heavy: true,
    windows_devices_count: 0, macos_devices_count: 10, mobile_devices_count: 3,
    project_status: 'Not Started', start_date: '', target_completion_date: '', notes: ''
  });
  const [saving, setSaving] = useState(false);

  const openNew = () => {
    setEditingClient(null);
    setForm({
      legal_name: '', dba_name: '', primary_domain: '', ms_tenant_domain: '',
      poc_name: '', poc_email: '', executive_sponsor: '',
      initial_user_count: 13, expected_user_count: 13,
      environment_type: 'Greenfield', target_cmmc_level: 'Level 1',
      cloud_only: false, has_physical_location: true, physical_location_description: '',
      fci_in_scope: true, cui_in_scope: false,
      ms_license_level: 'Microsoft 365 E5', ninjaone_in_scope: true, cortex_xdr_in_scope: false, mac_heavy: true,
      windows_devices_count: 0, macos_devices_count: 10, mobile_devices_count: 3,
      project_status: 'Not Started', start_date: '', target_completion_date: '', notes: ''
    });
    setShowForm(true);
  };

  const openEdit = (client) => {
    setEditingClient(client);
    setForm({ ...client });
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let savedClient = editingClient;
      if (editingClient) {
        savedClient = await base44.entities.Client.update(editingClient.id, form);
      } else {
        savedClient = await base44.entities.Client.create(form);
        // Auto-generate the standard CMMC deployment task set for the new client
        if (savedClient?.id) {
          await base44.functions.invoke('generateDeploymentTasks', { client_id: savedClient.id }).catch(() => {});
        }
      }
      await refreshClients();
      if (savedClient?.id) setSelectedClientId(savedClient.id);
      setShowForm(false);
    } catch (e) {
      alert('Error saving client: ' + e.message);
    }
    setSaving(false);
  };

  const handleClone = async (client) => {
    try {
      const { id, created_date, updated_date, created_by_id, ...rest } = client;
      const clonedClient = await base44.entities.Client.create({ ...rest, legal_name: `${client.legal_name} (Clone)`, project_status: 'Not Started' });
      if (clonedClient?.id) {
        await base44.functions.invoke('generateDeploymentTasks', { client_id: clonedClient.id }).catch(() => {});
      }
      await refreshClients();
      if (clonedClient?.id) setSelectedClientId(clonedClient.id);
    } catch (e) {
      alert('Error cloning client: ' + e.message);
    }
  };

  const handleDelete = async (client) => {
    setDeleting(true);
    try {
      await Promise.all([
        base44.entities.DeploymentTask.deleteMany({ client_id: client.id }).catch(() => {}),
        base44.entities.Screenshot.deleteMany({ client_id: client.id }).catch(() => {}),
        base44.entities.EvidenceItem.deleteMany({ client_id: client.id }).catch(() => {}),
        base44.entities.GeneratedDocument.deleteMany({ client_id: client.id }).catch(() => {}),
      ]);
      await base44.entities.Client.delete(client.id);
      setConfirmDelete(null);
      await refreshClients();
      if (selectedClientId === client.id) setSelectedClientId(null);
    } catch (e) {
      alert('Error deleting client: ' + e.message);
    }
    setDeleting(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
          <p className="text-sm text-slate-500 mt-1">Manage client deployments and scope</p>
        </div>
        {isAdmin && (
          <button onClick={openNew} className="flex items-center gap-2 bg-[#0F1E3C] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#1E2D4A] transition-colors">
            <Plus className="w-4 h-4" /> New Client
          </button>
        )}
      </div>

      {clients.length === 0 && !showForm ? (
        <EmptyState icon={Building2} title="No clients yet" description="Create your first client to begin a CMMC deployment project." action={<button onClick={openNew} className="bg-[#0F1E3C] text-white text-sm px-4 py-2 rounded-lg">Create Client</button>} />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((c) => (
            <div key={c.id} onClick={() => setSelectedClientId(c.id)} className={`bg-white rounded-xl border p-5 cursor-pointer transition-all hover:shadow-md ${selectedClientId === c.id ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200'}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-slate-900">{c.legal_name}</h3>
                  {c.dba_name && <p className="text-xs text-slate-500">DBA: {c.dba_name}</p>}
                </div>
                <StatusBadge status={c.project_status} size="xs" />
              </div>
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center gap-2"><span className="text-slate-400 w-20">Domain</span> {c.primary_domain || '—'}</div>
                <div className="flex items-center gap-2"><span className="text-slate-400 w-20">Tenant</span> {c.ms_tenant_domain || '—'}</div>
                <div className="flex items-center gap-2"><span className="text-slate-400 w-20">Environment</span> {c.environment_type}</div>
                <div className="flex items-center gap-2"><span className="text-slate-400 w-20">CMMC Target</span> {c.target_cmmc_level}</div>
                <div className="flex items-center gap-2"><span className="text-slate-400 w-20">License</span> {c.ms_license_level}</div>
              </div>
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100 text-xs">
                <span className="flex items-center gap-1 text-slate-500"><Users className="w-3 h-3" /> {c.initial_user_count} users</span>
                <span className="flex items-center gap-1 text-slate-500"><Monitor className="w-3 h-3" /> {c.macos_devices_count} Mac / {c.windows_devices_count} Win</span>
                {c.ninjaone_in_scope && <span className="flex items-center gap-1 text-green-600"><Shield className="w-3 h-3" /> NinjaOne</span>}
                {c.cortex_xdr_in_scope && <span className="flex items-center gap-1 text-orange-600"><Shield className="w-3 h-3" /> Cortex XDR</span>}
              </div>
              <div className="flex gap-2 mt-2">
                {c.cloud_only && <span className="inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full"><Cloud className="w-2.5 h-2.5" /> Cloud Only</span>}
                {c.has_physical_location && <span className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full"><MapPin className="w-2.5 h-2.5" /> Physical Location</span>}
                {c.fci_in_scope && <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">FCI In Scope</span>}
                {c.cui_in_scope && <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">CUI In Scope</span>}
                {c.mac_heavy && <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Mac-Heavy</span>}
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={(e) => { e.stopPropagation(); openEdit(c); }}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#0F1E3C] hover:bg-slate-50 px-2.5 py-1.5 rounded-lg transition-colors border border-slate-200"
                >
                  <Pencil className="w-3 h-3" /> Edit
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleClone(c); }}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg transition-colors border border-slate-200"
                >
                  <Copy className="w-3 h-3" /> Clone
                </button>
                {isAdmin && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setAssignClient(c); }}
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-green-600 hover:bg-green-50 px-2.5 py-1.5 rounded-lg transition-colors border border-slate-200"
                  >
                    <UserCheck className="w-3 h-3" /> Assign
                  </button>
                )}
                {isAdmin && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(c); }}
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors border border-slate-200"
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => !saving && setShowForm(false)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-slate-900">{editingClient ? 'Edit Client' : 'New Client'}</h2>
              <button onClick={() => !saving && setShowForm(false)} disabled={saving} className="text-slate-400 hover:text-slate-600 disabled:opacity-50"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid md:grid-cols-2 gap-3">
                <Field label="Legal Name *"><input className="form-input" value={form.legal_name} onChange={e => setForm({...form, legal_name: e.target.value})} /></Field>
                <Field label="DBA Name"><input className="form-input" value={form.dba_name} onChange={e => setForm({...form, dba_name: e.target.value})} /></Field>
                <Field label="Primary Domain"><input className="form-input" value={form.primary_domain} onChange={e => setForm({...form, primary_domain: e.target.value})} /></Field>
                <Field label="M365 Tenant Domain"><input className="form-input" value={form.ms_tenant_domain} onChange={e => setForm({...form, ms_tenant_domain: e.target.value})} /></Field>
                <Field label="POC Name"><input className="form-input" value={form.poc_name} onChange={e => setForm({...form, poc_name: e.target.value})} /></Field>
                <Field label="POC Email"><input className="form-input" value={form.poc_email} onChange={e => setForm({...form, poc_email: e.target.value})} /></Field>
                <Field label="Executive Sponsor"><input className="form-input" value={form.executive_sponsor} onChange={e => setForm({...form, executive_sponsor: e.target.value})} /></Field>
                <Field label="Initial User Count"><input type="number" className="form-input" value={form.initial_user_count} onChange={e => setForm({...form, initial_user_count: +e.target.value})} /></Field>
                <Field label="Expected User Count"><input type="number" className="form-input" value={form.expected_user_count} onChange={e => setForm({...form, expected_user_count: +e.target.value})} /></Field>
                <Field label="Environment Type"><select className="form-input" value={form.environment_type} onChange={e => setForm({...form, environment_type: e.target.value})}>{envTypes.map(t => <option key={t}>{t}</option>)}</select></Field>
                <Field label="Target CMMC Level"><select className="form-input" value={form.target_cmmc_level} onChange={e => setForm({...form, target_cmmc_level: e.target.value})}>{cmmcLevels.map(t => <option key={t}>{t}</option>)}</select></Field>
                <Field label="M365 License Level"><input className="form-input" value={form.ms_license_level} onChange={e => setForm({...form, ms_license_level: e.target.value})} /></Field>
                <Field label="Windows Devices"><input type="number" className="form-input" value={form.windows_devices_count} onChange={e => setForm({...form, windows_devices_count: +e.target.value})} /></Field>
                <Field label="macOS Devices"><input type="number" className="form-input" value={form.macos_devices_count} onChange={e => setForm({...form, macos_devices_count: +e.target.value})} /></Field>
                <Field label="Mobile Devices"><input type="number" className="form-input" value={form.mobile_devices_count} onChange={e => setForm({...form, mobile_devices_count: +e.target.value})} /></Field>
                <Field label="Start Date"><input type="date" className="form-input" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} /></Field>
                <Field label="Target Completion"><input type="date" className="form-input" value={form.target_completion_date} onChange={e => setForm({...form, target_completion_date: e.target.value})} /></Field>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-semibold text-slate-700">Environment Scope</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Toggle
                    label="Cloud Only (no in-scope physical location)"
                    checked={form.cloud_only}
                    onChange={v => setForm({ ...form, cloud_only: v, has_physical_location: v ? false : form.has_physical_location })}
                  />
                  <Toggle
                    label="Has Physical Location"
                    checked={form.has_physical_location}
                    onChange={v => setForm({ ...form, has_physical_location: v, cloud_only: v ? false : form.cloud_only })}
                  />
                </div>
                {form.has_physical_location && (
                  <Field label="Physical Location Description"><textarea className="form-input min-h-[60px]" placeholder="e.g. Single office at 123 Main St — server closet, badge access, locked file cabinets" value={form.physical_location_description || ''} onChange={e => setForm({...form, physical_location_description: e.target.value})} /></Field>
                )}
                {form.cloud_only && (
                  <p className="text-xs text-blue-700 bg-blue-50 rounded-lg px-3 py-2">Cloud-only: physical-security tasks, controls, and SSP sections will be marked as not applicable / inherited from the cloud provider.</p>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Toggle label="FCI In Scope" checked={form.fci_in_scope} onChange={v => setForm({...form, fci_in_scope: v})} />
                <Toggle label="CUI In Scope" checked={form.cui_in_scope} onChange={v => setForm({...form, cui_in_scope: v})} />
                <Toggle label="NinjaOne" checked={form.ninjaone_in_scope} onChange={v => setForm({...form, ninjaone_in_scope: v})} />
                <Toggle label="Cortex XDR" checked={form.cortex_xdr_in_scope} onChange={v => setForm({...form, cortex_xdr_in_scope: v})} />
                <Toggle label="Mac-Heavy" checked={form.mac_heavy} onChange={v => setForm({...form, mac_heavy: v})} />
              </div>
              <Field label="Notes"><textarea className="form-input min-h-[80px]" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></Field>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-slate-200 sticky bottom-0 bg-white">
              {isAdmin && editingClient && (
                <button onClick={() => setAssignClient(editingClient)} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 text-sm text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-lg disabled:opacity-50 mr-auto">
                  <UserCheck className="w-4 h-4" /> Assign Team
                </button>
              )}
              <button onClick={() => setShowForm(false)} disabled={saving} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.legal_name} className="px-4 py-2 text-sm bg-[#0F1E3C] text-white rounded-lg hover:bg-[#1E2D4A] disabled:opacity-50">{saving ? 'Saving...' : editingClient ? 'Save Changes' : 'Create Client'}</button>
            </div>
          </div>
        </div>
      )}

      {assignClient && (
        <AssignTechniciansModal
          client={assignClient}
          onClose={() => setAssignClient(null)}
          onAssigned={refreshClients}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => !deleting && setConfirmDelete(null)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Delete Client?</h3>
                <p className="text-sm text-slate-500">This permanently deletes {confirmDelete.legal_name} and all related tasks, screenshots, and evidence.</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} disabled={deleting} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50">Cancel</button>
              <button onClick={() => handleDelete(confirmDelete)} disabled={deleting} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">{deleting ? 'Deleting...' : 'Delete Permanently'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return <div><label className="text-xs font-medium text-slate-600 mb-1 block">{label}</label>{children}</div>;
}
function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-600">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="w-4 h-4 rounded border-slate-300" />
      {label}
    </label>
  );
}