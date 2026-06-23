import { useState, useEffect } from 'react';
import { ArrowLeftRight, Plus, X, CheckCircle2, Circle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useClient } from '@/lib/clientContext';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';

const migrationPhases = [
  'Google Discovery', 'User Inventory', 'Group Inventory', 'Gmail Migration',
  'Google Drive Discovery', 'Shared Drive Discovery', 'Permissions Review',
  'Data Classification', 'M365 Destination Mapping', 'SharePoint Structure Planning',
  'OneDrive Migration Planning', 'Cutover Planning', 'DNS Changes',
  'Post-Migration Validation', 'Evidence Capture'
];

const checklistItems = [
  'Export Google users', 'Export Google groups', 'Export Drive structure',
  'Identify FCI locations', 'Identify shared files', 'Identify externally shared files',
  'Map Google Shared Drives to SharePoint sites', 'Map user Drive to OneDrive',
  'Document migration exceptions', 'Capture screenshots before migration',
  'Capture screenshots after migration'
];

export default function GoogleMigration() {
  const { selectedClientId, selectedClient } = useClient();
  const [migration, setMigration] = useState(null);
  const [checklist, setChecklist] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ source_domain: '', destination_tenant: '', user_count: 0, cutover_date: '', migration_tool: 'Microsoft Migration Manager', notes: '' });

  useEffect(() => {
    if (!selectedClientId) return;
    base44.entities.GoogleMigration.filter({ client_id: selectedClientId })
      .then(items => { if (items.length > 0) setMigration(items[0]); })
      .catch(() => {});
  }, [selectedClientId]);

  const createMigration = () => {
    base44.entities.GoogleMigration.create({ ...form, client_id: selectedClientId })
      .then(m => { setMigration(m); setShowForm(false); });
  };

  const updateField = (field, value) => {
    const updated = { ...migration, [field]: value };
    setMigration(updated);
    base44.entities.GoogleMigration.update(migration.id, { [field]: value });
  };

  if (!selectedClient) return <EmptyState icon={ArrowLeftRight} title="No client selected" description="Select a client to manage Google Migration." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Google Migration</h1>
        <p className="text-sm text-slate-500 mt-1">Google Workspace to Microsoft 365 migration planning and evidence</p>
      </div>

      {!migration ? (
        <EmptyState icon={ArrowLeftRight} title="No migration record" description="Create a migration record to begin planning the Google Workspace to Microsoft 365 transition." action={<button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-[#0F1E3C] text-white text-sm px-4 py-2 rounded-lg"><Plus className="w-4 h-4" /> New Migration</button>} />
      ) : (
        <>
          {/* Migration overview */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div><label className="text-xs font-medium text-slate-500">Source Domain</label><div className="text-sm text-slate-800 mt-0.5">{migration.source_domain || '—'}</div></div>
              <div><label className="text-xs font-medium text-slate-500">Destination Tenant</label><div className="text-sm text-slate-800 mt-0.5">{migration.destination_tenant || '—'}</div></div>
              <div><label className="text-xs font-medium text-slate-500">User Count</label><div className="text-sm text-slate-800 mt-0.5">{migration.user_count || 0}</div></div>
              <div><label className="text-xs font-medium text-slate-500">Cutover Date</label><div className="text-sm text-slate-800 mt-0.5">{migration.cutover_date || '—'}</div></div>
              <div><label className="text-xs font-medium text-slate-500">Migration Tool</label><div className="text-sm text-slate-800 mt-0.5">{migration.migration_tool || '—'}</div></div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {['gmail_status', 'drive_status', 'shared_drive_status', 'calendar_status', 'dns_status'].map(field => (
                <div key={field}>
                  <label className="text-[10px] font-medium text-slate-500 uppercase">{field.replace('_status', '').replace('_', ' ')}</label>
                  <select value={migration[field] || 'Not Started'} onChange={e => updateField(field, e.target.value)} className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 mt-0.5">
                    <option>Not Started</option><option>In Progress</option><option>Complete</option><option>Blocked</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Migration phases */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Migration Phases</h3>
            <div className="space-y-2">
              {migrationPhases.map((phase, i) => (
                <div key={i} className="flex items-center gap-3 py-1.5 border-b border-slate-50 last:border-0">
                  <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                  <span className="text-sm text-slate-700 flex-1">{phase}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Checklist */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Migration Checklist</h3>
            <div className="grid md:grid-cols-2 gap-2">
              {checklistItems.map((item, i) => (
                <label key={i} className="flex items-center gap-2.5 cursor-pointer py-1.5">
                  <input type="checkbox" checked={!!checklist[i]} onChange={e => setChecklist({...checklist, [i]: e.target.checked})} className="w-4 h-4 rounded border-slate-300" />
                  <span className={`text-sm ${checklist[i] ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{item}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-500">Notes</label>
            <textarea className="form-input min-h-[80px] mt-1" value={migration.notes || ''} onChange={e => updateField('notes', e.target.value)} />
          </div>
        </>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200"><h2 className="text-lg font-bold text-slate-900">New Migration Record</h2><button onClick={() => setShowForm(false)} className="text-slate-400"><X className="w-5 h-5" /></button></div>
            <div className="p-5 space-y-3">
              <Field label="Source Domain"><input className="form-input" value={form.source_domain} onChange={e => setForm({...form, source_domain: e.target.value})} /></Field>
              <Field label="Destination Tenant"><input className="form-input" value={form.destination_tenant} onChange={e => setForm({...form, destination_tenant: e.target.value})} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="User Count"><input type="number" className="form-input" value={form.user_count} onChange={e => setForm({...form, user_count: +e.target.value})} /></Field>
                <Field label="Cutover Date"><input type="date" className="form-input" value={form.cutover_date} onChange={e => setForm({...form, cutover_date: e.target.value})} /></Field>
              </div>
              <Field label="Migration Tool"><input className="form-input" value={form.migration_tool} onChange={e => setForm({...form, migration_tool: e.target.value})} /></Field>
              <Field label="Notes"><textarea className="form-input" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></Field>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-slate-200"><button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button><button onClick={createMigration} className="px-4 py-2 text-sm bg-[#0F1E3C] text-white rounded-lg hover:bg-[#1E2D4A]">Create</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) { return <div><label className="text-xs font-medium text-slate-600 mb-1 block">{label}</label>{children}</div>; }