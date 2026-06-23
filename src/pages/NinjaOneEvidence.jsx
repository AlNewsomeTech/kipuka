import { useState, useEffect } from 'react';
import { Monitor, Plus, X, Upload, Search } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useClient } from '@/lib/clientContext';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';

const categories = [
  'Tenant Baseline', 'Agent Deployment', 'macOS Device Inventory', 'Windows Device Inventory',
  'Patch Management', 'Vulnerability Scanning', 'Remote Assistance', 'MDM for Non-Windows',
  'FileVault and Disk Encryption', 'Endpoint Protection Status', 'Software Inventory',
  'Alerting and Monitoring', 'Reports'
];
const statuses = ['Not Started', 'In Progress', 'Evidence Needed', 'Ready for Review', 'Reviewed', 'Complete'];
const l1Controls = ['SI.L1-3.14.1', 'SI.L1-3.14.2', 'SI.L1-3.14.4', 'SI.L1-3.14.5', 'AC.L1-3.1.1', 'AC.L1-3.1.2'];
const l2Domains = ['Vulnerability Management', 'Patch Management', 'Device Compliance', 'Remote Access Controls', 'MDM for macOS'];

export default function NinjaOneEvidence() {
  const { selectedClientId, selectedClient } = useClient();
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [form, setForm] = useState({ device: '', user: '', ninjaone_org: '', evidence_category: 'Patch Management', related_control: 'SI.L1-3.14.1', related_l2_domain: '', notes: '', status: 'Not Started' });

  const load = () => {
    if (!selectedClientId) return;
    base44.entities.NinjaOneEvidence.filter({ client_id: selectedClientId }).then(setItems).catch(() => {});
  };
  useEffect(load, [selectedClientId]);

  const handleSave = async () => {
    await base44.entities.NinjaOneEvidence.create({ ...form, client_id: selectedClientId });
    setShowForm(false);
    setForm({ device: '', user: '', ninjaone_org: '', evidence_category: 'Patch Management', related_control: 'SI.L1-3.14.1', related_l2_domain: '', notes: '', status: 'Not Started' });
    load();
  };

  const filtered = items.filter(i => {
    const ms = !search || i.device?.toLowerCase().includes(search.toLowerCase()) || i.evidence_category?.toLowerCase().includes(search.toLowerCase());
    const mc = filterCat === 'all' || i.evidence_category === filterCat;
    return ms && mc;
  });

  if (!selectedClient) return <EmptyState icon={Monitor} title="No client selected" description="Select a client to manage NinjaOne evidence." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">NinjaOne Endpoint Evidence</h1>
          <p className="text-sm text-slate-500 mt-1">Endpoint evidence for patch management, vulnerability scanning, and device monitoring</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-[#0F1E3C] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#1E2D4A]"><Plus className="w-4 h-4" /> Add Evidence</button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <strong>NinjaOne maps heavily to:</strong> SI.L1-3.14.1 (Flaw Remediation), SI.L1-3.14.2 (Malicious Code Protection), SI.L1-3.14.4 (Update Malicious Code Protection), SI.L1-3.14.5 (Periodic Scans). Supplemental Level 2 mappings available for vulnerability management, patch management, device compliance, and remote access controls.
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input placeholder="Search by device or category..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30">
          <option value="all">All Categories</option>
          {categories.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Monitor} title="No NinjaOne evidence" description="Add evidence items for patch management, vulnerability scans, device inventory, and more." />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => (
            <div key={item.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs font-semibold text-slate-800">{item.evidence_category}</span>
                <StatusBadge status={item.status} size="xs" />
              </div>
              <div className="space-y-1 text-xs text-slate-500">
                <div>Device: {item.device || '—'}</div>
                <div>User: {item.user || '—'}</div>
                <div>Org: {item.ninjaone_org || '—'}</div>
                <div className="flex gap-1.5 flex-wrap pt-1">
                  {item.related_control && <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{item.related_control}</span>}
                  {item.related_l2_domain && <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">{item.related_l2_domain}</span>}
                </div>
              </div>
              {item.notes && <p className="text-xs text-slate-400 mt-2 pt-2 border-t border-slate-100">{item.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200"><h2 className="text-lg font-bold text-slate-900">Add NinjaOne Evidence</h2><button onClick={() => setShowForm(false)} className="text-slate-400"><X className="w-5 h-5" /></button></div>
            <div className="p-5 space-y-3">
              <Field label="Evidence Category"><select className="form-input" value={form.evidence_category} onChange={e => setForm({...form, evidence_category: e.target.value})}>{categories.map(c => <option key={c}>{c}</option>)}</select></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Device"><input className="form-input" value={form.device} onChange={e => setForm({...form, device: e.target.value})} /></Field>
                <Field label="User"><input className="form-input" value={form.user} onChange={e => setForm({...form, user: e.target.value})} /></Field>
              </div>
              <Field label="NinjaOne Organization"><input className="form-input" value={form.ninjaone_org} onChange={e => setForm({...form, ninjaone_org: e.target.value})} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Related L1 Control"><select className="form-input" value={form.related_control} onChange={e => setForm({...form, related_control: e.target.value})}><option value="">None</option>{l1Controls.map(c => <option key={c}>{c}</option>)}</select></Field>
                <Field label="Related L2 Domain"><select className="form-input" value={form.related_l2_domain} onChange={e => setForm({...form, related_l2_domain: e.target.value})}><option value="">None</option>{l2Domains.map(d => <option key={d}>{d}</option>)}</select></Field>
              </div>
              <Field label="Status"><select className="form-input" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>{statuses.map(s => <option key={s}>{s}</option>)}</select></Field>
              <Field label="Notes"><textarea className="form-input" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></Field>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-slate-200"><button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button><button onClick={handleSave} className="px-4 py-2 text-sm bg-[#0F1E3C] text-white rounded-lg hover:bg-[#1E2D4A]">Save</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) { return <div><label className="text-xs font-medium text-slate-600 mb-1 block">{label}</label>{children}</div>; }