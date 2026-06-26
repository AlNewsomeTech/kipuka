import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useClient } from '@/lib/clientContext';
import { applicableDocuments, CATEGORY_GROUPS } from '@/lib/documentCatalog';
import { FileText, Loader2, RefreshCw, Wand2, Package, AlertCircle } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import DocumentCard from '@/components/documents/DocumentCard';
import DocumentDetailModal from '@/components/documents/DocumentDetailModal';

export default function DocumentBuilder() {
  const { selectedClient, selectedClientId } = useClient();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generatingKey, setGeneratingKey] = useState(null);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [activeDoc, setActiveDoc] = useState(null);

  const load = () => {
    if (!selectedClientId) return;
    setLoading(true);
    base44.entities.GeneratedDocument.filter({ client_id: selectedClientId })
      .then(setDocs).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, [selectedClientId]);

  if (!selectedClient) return <EmptyState icon={FileText} title="No client selected" description="Select a client to build CMMC documents." />;

  const specs = applicableDocuments(selectedClient);
  const docByType = {};
  docs.forEach(d => { if (d.document_type && d.status !== 'Superseded') docByType[d.document_type] = d; });

  const generate = async (spec, mode = 'Generate New') => {
    setGeneratingKey(spec.key);
    try {
      const existing = docByType[spec.key];
      const res = await base44.functions.invoke('generateDocument', {
        client_id: selectedClientId, document_key: spec.key, mode,
        existing_document_id: existing?.id, force_overwrite: mode === 'overwrite',
      });
      if (res.data?.needs_confirmation) {
        const choice = window.prompt('This document has human edits. Type "version" for a new version, "overwrite" to replace the draft, or anything else to cancel.');
        if (choice === 'version') return generate(spec, 'New Version');
        if (choice === 'overwrite') return generate(spec, 'overwrite');
        return;
      }
      load();
    } catch (e) { alert('Generation failed: ' + e.message); }
    finally { setGeneratingKey(null); }
  };

  const bulkGenerateMissing = async () => {
    setBulkRunning(true);
    for (const spec of specs) {
      if (!docByType[spec.key]) {
        try { await base44.functions.invoke('generateDocument', { client_id: selectedClientId, document_key: spec.key, mode: 'Generate New' }); } catch (e) { /* continue */ }
      }
    }
    setBulkRunning(false);
    load();
  };

  const requiredCount = specs.filter(s => s.package).length;
  const generatedCount = specs.filter(s => docByType[s.key]).length;
  const missingRequired = specs.filter(s => s.package && !docByType[s.key]).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">Document Builder</h2>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full">{selectedClient.target_cmmc_level}</span>
          </div>
          <p className="text-sm text-slate-500 mt-1">{specs.length} documents apply to this client's level & scope • {generatedCount} generated • {missingRequired} required missing</p>
        </div>
        <button onClick={bulkGenerateMissing} disabled={bulkRunning} className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-[#0F1E3C] text-white hover:bg-[#1E2D4A] disabled:opacity-50">
          {bulkRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />} Generate All Missing
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-slate-400" /></div>
      ) : (
        CATEGORY_GROUPS.map(group => {
          const groupSpecs = specs.filter(s => group.categories.includes(s.category));
          if (groupSpecs.length === 0) return null;
          return (
            <div key={group.group}>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">{group.group}</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {groupSpecs.map(spec => (
                  <DocumentCard
                    key={spec.key}
                    spec={spec}
                    doc={docByType[spec.key]}
                    generating={generatingKey === spec.key}
                    onGenerate={() => generate(spec, docByType[spec.key] ? 'Regenerate Full Body' : 'Generate New')}
                    onNewVersion={() => generate(spec, 'New Version')}
                    onOpen={() => setActiveDoc(docByType[spec.key])}
                  />
                ))}
              </div>
            </div>
          );
        })
      )}

      {activeDoc && <DocumentDetailModal doc={activeDoc} onClose={() => setActiveDoc(null)} onSaved={() => { setActiveDoc(null); load(); }} />}
    </div>
  );
}