import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { FileText, Plus, X, Edit3, Save, Download, Search, Copy, FileWarning, Trash2, GitBranch, Check } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';

const statuses = ['Draft', 'In Review', 'Approved', 'Published'];
const categories = ['SSP', 'Policy', 'Evidence Index', 'Screenshot Log', 'Control Matrix', 'Scope Statement', 'Self-Assessment', 'Attestation', 'Assessment Summary', 'Asset Inventory', 'User Inventory', 'Device Inventory', 'POAM', 'Risk Register', 'Training Summary', 'Incident Response', 'Service Provider Matrix', 'Other'];

const PLACEHOLDER_REGEX = /\[([A-Z][A-Z_0-9]{2,})\]/g;

function findPlaceholders(text) {
  if (!text) return [];
  const m = text.match(PLACEHOLDER_REGEX);
  return m ? [...new Set(m.map(x => x.replace(/[\[\]]/g, '')))] : [];
}

export default function DocLibraryTab({ clientId, client, synthesis, onRegenerate }) {
  const [templates, setTemplates] = useState([]);
  const [docs, setDocs] = useState([]);
  const [search, setSearch] = useState('');
  const [editingDoc, setEditingDoc] = useState(null);
  const [showGenerate, setShowGenerate] = useState(null);

  const load = () => {
    base44.entities.DocumentTemplate.list().then(setTemplates).catch(() => {});
    if (clientId) base44.entities.GeneratedDocument.filter({ client_id: clientId }).then(setDocs).catch(() => {});
  };
  useEffect(load, [clientId]);

  const generateDoc = async (template) => {
    const body = (template.body_content || '')
      .replace(/\[CLIENT_NAME\]/g, client?.legal_name || '[CLIENT_NAME]')
      .replace(/\[DBA_NAME\]/g, client?.dba_name || '[DBA]')
      .replace(/\[POC_NAME\]/g, client?.poc_name || '[POC_NAME]')
      .replace(/\[EXECUTIVE_SPONSOR\]/g, client?.executive_sponsor || '[EXECUTIVE_SPONSOR]')
      .replace(/\[PRIMARY_DOMAIN\]/g, client?.primary_domain || '[PRIMARY_DOMAIN]');

    // Check for duplicates
    const existing = docs.find(d => d.title === template.title && d.template_id === template.id && d.version === template.version);
    if (existing) {
      if (!confirm(`A document "${template.title}" (v${template.version}) already exists. Create a new version?`)) return;
      const newVersion = String((parseFloat(existing.version) || 1) + 0.1).toFixed(1);
      const doc = await base44.entities.GeneratedDocument.create({
        client_id: clientId, template_id: template.id, title: template.title,
        body_content: body, version: newVersion, owner: template.owner,
        control_mappings: template.control_mappings, status: 'Draft',
        document_category: template.category || 'Other',
        include_in_final_package: false, supersedes_document_id: existing.id,
        generated_by: 'System', generated_date: new Date().toISOString().split('T')[0],
        generated_from_source_snapshot: `Generated from template: ${template.title}`,
      });
      setEditingDoc(doc);
    } else {
      const doc = await base44.entities.GeneratedDocument.create({
        client_id: clientId, template_id: template.id, title: template.title,
        body_content: body, version: template.version, owner: template.owner,
        control_mappings: template.control_mappings, status: 'Draft',
        document_category: template.category || 'Other',
        include_in_final_package: false, generated_by: 'System',
        generated_date: new Date().toISOString().split('T')[0],
        generated_from_source_snapshot: `Generated from template: ${template.title}`,
      });
      setEditingDoc(doc);
    }
    setShowGenerate(null);
    load();
  };

  const saveDoc = (id, data) => {
    base44.entities.GeneratedDocument.update(id, data).then(() => { load(); setEditingDoc(null); onRegenerate(); });
  };

  const deleteDoc = async (id) => {
    if (!confirm('Delete this document? This cannot be undone.')) return;
    await base44.entities.GeneratedDocument.delete(id);
    load();
    onRegenerate();
  };

  const resolveDuplicate = async (dup, action) => {
    if (action === 'delete') {
      await base44.entities.GeneratedDocument.delete(dup.document_id);
    } else if (action === 'keep') {
      await base44.entities.GeneratedDocument.update(dup.document_id, { is_duplicate: false, duplicate_of_document_id: '' });
    } else if (action === 'newversion') {
      const newVersion = String((parseFloat(dup.version) || 1) + 0.1).toFixed(1);
      await base44.entities.GeneratedDocument.update(dup.document_id, { is_duplicate: false, duplicate_of_document_id: '', version: newVersion, changelog: `Version bumped to resolve duplicate of ${dup.duplicate_of_title}` });
    }
    load();
    onRegenerate();
  };

  const filteredDocs = docs.filter(d => !search || d.title?.toLowerCase().includes(search.toLowerCase()));
  const filteredTemplates = templates.filter(t => !search || t.title?.toLowerCase().includes(search.toLowerCase()));
  const duplicates = synthesis?.duplicates || [];

  return (
    <div className="space-y-6">
      {duplicates.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-purple-800 mb-2 flex items-center gap-2"><Copy className="w-4 h-4" /> Duplicate Documents Detected ({duplicates.length})</h3>
          <div className="space-y-2">
            {duplicates.map((d, i) => (
              <div key={i} className="flex items-center justify-between bg-white rounded-lg p-2.5 border border-purple-200">
                <div className="text-xs">
                  <span className="font-medium text-slate-700">{d.title}</span> <span className="text-slate-400">(v{d.version})</span>
                  <span className="text-purple-600 ml-2">duplicate of {d.duplicate_of_title}</span>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => resolveDuplicate(d, 'newversion')} className="text-[10px] px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 flex items-center gap-1"><GitBranch className="w-3 h-3" /> New Version</button>
                  <button onClick={() => resolveDuplicate(d, 'keep')} className="text-[10px] px-2 py-1 rounded bg-slate-50 text-slate-600 hover:bg-slate-100 flex items-center gap-1"><Check className="w-3 h-3" /> Keep Both</button>
                  <button onClick={() => resolveDuplicate(d, 'delete')} className="text-[10px] px-2 py-1 rounded bg-red-50 text-red-700 hover:bg-red-100 flex items-center gap-1"><Trash2 className="w-3 h-3" /> Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
      </div>

      {filteredDocs.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Generated Documents for {client?.legal_name}</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredDocs.map(d => {
              const phs = findPlaceholders(d.body_content);
              const hasPHs = phs.length > 0 && !d.placeholder_waived;
              return (
                <div key={d.id} className={`bg-white rounded-xl border p-4 ${d.is_duplicate ? 'border-purple-300' : hasPHs ? 'border-orange-300' : 'border-slate-200'}`}>
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-sm font-medium text-slate-800">{d.title}</h4>
                    <StatusBadge status={d.status} size="xs" />
                  </div>
                  <div className="text-xs text-slate-500 mb-1">v{d.version} • {d.owner || 'Unassigned'}</div>
                  {d.document_category && d.document_category !== 'Other' && <div className="text-[10px] font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded inline-block mb-1">{d.document_category}</div>}
                  {d.is_duplicate && <div className="text-[10px] text-purple-600 mb-1">⚠ Duplicate detected</div>}
                  {hasPHs && (
                    <div className="text-[10px] text-orange-600 mb-1 flex items-center gap-1"><FileWarning className="w-3 h-3" /> {phs.length} unresolved placeholder(s) — cannot approve</div>
                  )}
                  {d.placeholder_waived && <div className="text-[10px] text-slate-400 mb-1">Placeholders waived: {d.placeholder_waiver_note || 'No note'}</div>}
                  <div className="flex items-center gap-2 mt-2">
                    <button onClick={() => setEditingDoc(d)} className="text-xs text-blue-600 hover:underline flex items-center gap-1"><Edit3 className="w-3 h-3" /> Edit</button>
                    <button onClick={() => deleteDoc(d.id)} className="text-xs text-red-500 hover:underline flex items-center gap-1"><Trash2 className="w-3 h-3" /> Delete</button>
                    <label className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer ml-auto">
                      <input type="checkbox" checked={d.include_in_final_package} onChange={e => saveDoc(d.id, { include_in_final_package: e.target.checked })} className="w-3 h-3 rounded" /> Package
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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

      {editingDoc && <DocEditor doc={editingDoc} onClose={() => setEditingDoc(null)} onSave={saveDoc} />}
    </div>
  );
}

function DocEditor({ doc, onClose, onSave }) {
  const [form, setForm] = useState(doc);
  const [saving, setSaving] = useState(false);
  const phs = findPlaceholders(form.body_content);
  const hasPHs = phs.length > 0;

  const handleSave = () => {
    setSaving(true);
    onSave(doc.id, form);
    setSaving(false);
  };

  const download = () => {
    const content = `${form.title}\n${'='.repeat(form.title.length)}\n\nVersion: ${form.version}\nOwner: ${form.owner || '—'}\nCategory: ${form.document_category || 'Other'}\nApproval Date: ${form.approval_date || '—'}\nControl Mappings: ${form.control_mappings || '—'}\n\n${form.body_content || ''}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${form.title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const tryApprove = (newStatus) => {
    if ((newStatus === 'In Review' || newStatus === 'Approved' || newStatus === 'Published') && hasPHs && !form.placeholder_waived) {
      alert('Cannot change status: this document has unresolved placeholders. Resolve them or waive with a note before approving.');
      return;
    }
    setForm({ ...form, status: newStatus });
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
          {hasPHs && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <div className="text-xs font-semibold text-orange-800 mb-1 flex items-center gap-1"><FileWarning className="w-3.5 h-3.5" /> Unresolved Placeholders ({phs.length})</div>
              <div className="flex flex-wrap gap-1 mb-2">{phs.map((p, i) => <span key={i} className="text-[10px] font-mono bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded">[{p}]</span>)}</div>
              <div className="text-[10px] text-orange-700">Replace these in the body, or waive with a note below. Documents with unresolved placeholders cannot be approved or included in the final package.</div>
              <div className="mt-2 flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                  <input type="checkbox" checked={form.placeholder_waived || false} onChange={e => setForm({ ...form, placeholder_waived: e.target.checked })} className="w-3.5 h-3.5 rounded" />
                  Waive placeholders
                </label>
                {form.placeholder_waived && (
                  <input className="form-input flex-1 text-xs" placeholder="Waiver note (required)" value={form.placeholder_waiver_note || ''} onChange={e => setForm({ ...form, placeholder_waiver_note: e.target.value })} />
                )}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><label className="text-xs font-medium text-slate-600">Version</label><input className="form-input" value={form.version || ''} onChange={e => setForm({...form, version: e.target.value})} /></div>
            <div><label className="text-xs font-medium text-slate-600">Owner</label><input className="form-input" value={form.owner || ''} onChange={e => setForm({...form, owner: e.target.value})} /></div>
            <div><label className="text-xs font-medium text-slate-600">Category</label><select className="form-input" value={form.document_category || 'Other'} onChange={e => setForm({...form, document_category: e.target.value})}>{categories.map(c => <option key={c}>{c}</option>)}</select></div>
            <div><label className="text-xs font-medium text-slate-600">Status</label><select className="form-input" value={form.status} onChange={e => tryApprove(e.target.value)}>{statuses.map(s => <option key={s}>{s}</option>)}</select></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-slate-600">Approval Date</label><input type="date" className="form-input" value={form.approval_date || ''} onChange={e => setForm({...form, approval_date: e.target.value})} /></div>
            <div><label className="text-xs font-medium text-slate-600">Control Mappings</label><input className="form-input" value={form.control_mappings || ''} onChange={e => setForm({...form, control_mappings: e.target.value})} /></div>
          </div>
          {form.supersedes_document_id && <div className="text-[10px] text-slate-400">Supersedes document: {form.supersedes_document_id}</div>}
          {form.changelog && <div><label className="text-xs font-medium text-slate-600">Changelog</label><input className="form-input" value={form.changelog} onChange={e => setForm({...form, changelog: e.target.value})} /></div>}
          <div><label className="text-xs font-medium text-slate-600">Body Content</label><textarea className="form-input min-h-[300px] font-mono text-xs" value={form.body_content || ''} onChange={e => setForm({...form, body_content: e.target.value})} /></div>
        </div>
        <div className="flex justify-between items-center gap-2 p-5 border-t border-slate-200 sticky bottom-0 bg-white">
          <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
            <input type="checkbox" checked={form.include_in_final_package || false} onChange={e => setForm({...form, include_in_final_package: e.target.checked})} className="w-3.5 h-3.5 rounded" />
            Include in Final Package
          </label>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-[#0F1E3C] text-white rounded-lg hover:bg-[#1E2D4A] flex items-center gap-1.5"><Save className="w-3.5 h-3.5" /> Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}