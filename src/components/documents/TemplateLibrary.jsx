import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { FileText, Plus, Search } from 'lucide-react';
import EmptyState from '@/components/EmptyState';

export default function TemplateLibrary({ clientId, client, onChanged }) {
  const [templates, setTemplates] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => { base44.entities.DocumentTemplate.list().then(setTemplates).catch(() => {}); }, []);

  const generateFromTemplate = async (t) => {
    const body = (t.body_content || '')
      .replace(/\[CLIENT_NAME\]/g, client?.legal_name || '[CLIENT_NAME]')
      .replace(/\[DBA_NAME\]/g, client?.dba_name || '[DBA]')
      .replace(/\[POC_NAME\]/g, client?.poc_name || '[POC_NAME]')
      .replace(/\[EXECUTIVE_SPONSOR\]/g, client?.executive_sponsor || '[EXECUTIVE_SPONSOR]')
      .replace(/\[PRIMARY_DOMAIN\]/g, client?.primary_domain || '[PRIMARY_DOMAIN]');
    await base44.entities.GeneratedDocument.create({
      client_id: clientId, template_id: t.id, title: t.title, body_content: body,
      version: t.version || '1.0', version_number: 1, owner: t.owner, control_mappings: t.control_mappings,
      status: 'Draft', document_category: t.category || 'Other', cmmc_level: client?.target_cmmc_level || 'Level 1',
      include_in_final_package: false, generated_by: 'Template', generated_date: new Date().toISOString().split('T')[0],
      generated_from_source_snapshot: `Generated from template: ${t.title}`,
    });
    if (onChanged) onChanged();
    alert(`Generated "${t.title}" from template. Find it in the Document Index.`);
  };

  const filtered = templates.filter(t => !search || t.title?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800">
        Templates are static boilerplate. For live, source-traceable, level-aware documents use the <strong>Document Builder</strong> tab — these are kept for custom one-off documents.
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input placeholder="Search templates..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
      </div>
      {filtered.length === 0 ? (
        <EmptyState icon={FileText} title="No templates" description="Document templates will appear here once seeded." />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(t => (
            <div key={t.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <h4 className="text-sm font-medium text-slate-800 mb-1">{t.title}</h4>
              <p className="text-xs text-slate-500 mb-2 line-clamp-2">{t.purpose}</p>
              {t.control_mappings && <div className="text-[10px] font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded inline-block mb-2">{t.control_mappings}</div>}
              <button onClick={() => generateFromTemplate(t)} className="text-xs text-blue-600 hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Generate for Client</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}