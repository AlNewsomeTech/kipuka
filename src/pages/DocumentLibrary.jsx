import { useState, useEffect } from 'react';
import { FileText, Plus, X, Edit3, Save, Download, Search } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useClient } from '@/lib/clientContext';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';

const statuses = ['Draft', 'In Review', 'Approved', 'Published'];

export default function DocumentLibrary() {
  const { selectedClientId, selectedClient } = useClient();
  const [templates, setTemplates] = useState([]);
  const [docs, setDocs] = useState([]);
  const [search, setSearch] = useState('');
  const [editingDoc, setEditingDoc] = useState(null);
  const [showGenerate, setShowGenerate] = useState(null);

  const load = () => {
    base44.entities.DocumentTemplate.list().then(setTemplates).catch(() => {});
    if (selectedClientId) base44.entities.GeneratedDocument.filter({ client_id: selectedClientId }).then(setDocs).catch(() => {});
  };
  useEffect(load, [selectedClientId]);

  const generateDoc = async (template) => {
    const body = (template.body_content || '').replace(/\[CLIENT_NAME\]/g, selectedClient?.legal_name || '[Client Name]').replace(/\[DBA_NAME\]/g, selectedClient?.dba_name || '[DBA]');
    const doc = await base44.entities.GeneratedDocument.create({
      client_id: selectedClientId, template_id: template.id, title: template.title,
      body_content: body, version: template.version, owner: template.owner,
      control_mappings: template.control_mappings, status: 'Draft', include_in_final_package: false
    });
    setEditingDoc(doc);
    setShowGenerate(null);
    load();
  };

  const saveDoc = (id, data) => {
    base44.entities.GeneratedDocument.update(id, data).then(() => { load(); setEditingDoc(null); });
  };

  const filteredTemplates = templates.filter(t => !search || t.title?.toLowerCase().includes(search.toLowerCase()));
  const filteredDocs = docs.filter(d => !search || d.title?.toLowerCase().includes(search.toLowerCase()));

  if (!selectedClient) return <EmptyState icon={FileText} title="No client selected" description="Select a client to manage documents." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Document Library</h1>
        <p className="text-sm text-slate-500 mt-1">Boilerplate document templates and generated client documents</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
      </div>

      {/* Generated documents */}
      {filteredDocs.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Generated Documents for {selectedClient.legal_name}</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredDocs.map(d => (
              <div key={d.id} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-sm font-medium text-slate-800">{d.title}</h4>
                  <StatusBadge status={d.status} size="xs" />
                </div>
                <div className="text-xs text-slate-500 mb-2">v{d.version} • {d.owner || 'Unassigned'}</div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setEditingDoc(d)} className="text-xs text-blue-600 hover:underline flex items-center gap-1"><Edit3 className="w-3 h-3" /> Edit</button>
                  <label className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer ml-auto">
                    <input type="checkbox" checked={d.include_in_final_package} onChange={e => saveDoc(d.id, { include_in_final_package: e.target.checked })} className="w-3 h-3 rounded" /> Package
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Templates */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Document Templates</h3>
        {filteredTemplates.length === 0 ? (
          <EmptyState icon={FileText} title="No templates yet" description="Document templates will appear here once seeded." />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredTemplates.map(t => (
              <div key={t.id} className="bg-white rounded-xl border border-slate-200 p-4">
                <h4 className="text-sm font-medium text-slate-800 mb-1">{t.title}</h4>
                <p className="text-xs text-slate-500 mb-2 line-clamp-2">{t.purpose}</p>
                {t.control_mappings && <div className="text-[10px] font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded inline-block mb-2">{t.control_mappings}</div>}
                <button onClick={() => generateDoc(t)} className="text-xs text-blue-600 hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Generate for Client</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editingDoc && (
        <DocEditor doc={editingDoc} onClose={() => setEditingDoc(null)} onSave={saveDoc} />
      )}
    </div>
  );
}

function DocEditor({ doc, onClose, onSave }) {
  const [form, setForm] = useState(doc);
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    onSave(doc.id, form);
    setSaving(false);
  };

  const download = () => {
    const content = `${form.title}\n${'='.repeat(form.title.length)}\n\nVersion: ${form.version}\nOwner: ${form.owner || '—'}\nApproval Date: ${form.approval_date || '—'}\nControl Mappings: ${form.control_mappings || '—'}\n\n${form.body_content || ''}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${form.title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-slate-900">{form.title}</h2>
          <div className="flex items-center gap-2">
            <button onClick={download} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"><Download className="w-4 h-4" /> Export</button>
            <button onClick={onClose} className="text-slate-400"><X className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><label className="text-xs font-medium text-slate-600">Version</label><input className="form-input" value={form.version || ''} onChange={e => setForm({...form, version: e.target.value})} /></div>
            <div><label className="text-xs font-medium text-slate-600">Owner</label><input className="form-input" value={form.owner || ''} onChange={e => setForm({...form, owner: e.target.value})} /></div>
            <div><label className="text-xs font-medium text-slate-600">Approval Date</label><input type="date" className="form-input" value={form.approval_date || ''} onChange={e => setForm({...form, approval_date: e.target.value})} /></div>
            <div><label className="text-xs font-medium text-slate-600">Status</label><select className="form-input" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>{statuses.map(s => <option key={s}>{s}</option>)}</select></div>
          </div>
          <div><label className="text-xs font-medium text-slate-600">Control Mappings</label><input className="form-input" value={form.control_mappings || ''} onChange={e => setForm({...form, control_mappings: e.target.value})} /></div>
          <div><label className="text-xs font-medium text-slate-600">Body Content</label><textarea className="form-input min-h-[300px] font-mono text-xs" value={form.body_content || ''} onChange={e => setForm({...form, body_content: e.target.value})} /></div>
        </div>
        <div className="flex justify-end gap-2 p-5 border-t border-slate-200 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-[#0F1E3C] text-white rounded-lg hover:bg-[#1E2D4A] flex items-center gap-1.5"><Save className="w-3.5 h-3.5" /> Save</button>
        </div>
      </div>
    </div>
  );
}