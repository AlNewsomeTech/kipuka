import { useState, useEffect, useCallback, useMemo } from 'react';
import { Library, Upload, Loader2, ShieldAlert, Trash2, FileText, Layers } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useOrg } from '@/lib/orgContext';
import EmptyState from '@/components/EmptyState';
import PolicyImportModal from '@/components/policies/PolicyImportModal';
import PolicyLibraryGroups from '@/components/policies/PolicyLibraryGroups';

export default function PolicyLibraryAdmin() {
  const { isPlatformAdmin } = useOrg();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const rows = await base44.entities.PolicyTemplate.filter({ is_master_template: true }, 'policy_category', 500).catch(() => []);
    setTemplates(rows);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const remove = async (id) => {
    await base44.entities.PolicyTemplate.delete(id);
    load();
  };

  if (!isPlatformAdmin) {
    return (
      <div className="max-w-2xl mx-auto py-16">
        <EmptyState icon={ShieldAlert} title="Restricted area" description="The master Policy Library is available to Pac-Sec platform administrators only." />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <Library className="w-6 h-6 text-brand" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Master Policy Library</h1>
            <p className="text-sm text-slate-500">Reusable master templates organizations clone into their projects.</p>
          </div>
        </div>
        <button onClick={() => setImporting(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-brand">
          <Upload className="w-4 h-4" /> Import Templates
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
      ) : templates.length === 0 ? (
        <EmptyState icon={FileText} title="No master templates yet"
          description="Import .docx policy documents to build the reusable master library."
          action={<button onClick={() => setImporting(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-brand"><Upload className="w-4 h-4" /> Import Templates</button>} />
      ) : (
        <PolicyLibraryGroups
          policies={templates}
          renderActions={(p) => (
            <button onClick={() => remove(p.id)} className="text-slate-400 hover:text-red-600" title="Delete template"><Trash2 className="w-4 h-4" /></button>
          )}
        />
      )}

      {importing && (
        <PolicyImportModal mode="master" onClose={() => setImporting(false)}
          onImported={() => { setImporting(false); load(); }} />
      )}
    </div>
  );
}