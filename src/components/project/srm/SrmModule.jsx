import { useState, useEffect, useCallback } from 'react';
import { Share2, Loader2, Plus, FileDown, Layers } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { createReportPdf, safeFileName, BRAND, stripHtml } from '@/lib/reportBranding';
import ProviderFormModal from './ProviderFormModal';
import ProviderCard from './ProviderCard';

// Shared Responsibility Matrix module: lists ESP/CSP providers, maps per-control
// responsibility, applies prefill templates, and exports SRM documents.
export default function SrmModule({ project, org, readOnly, currentUser }) {
  const [providers, setProviders] = useState([]);
  const [assets, setAssets] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [prov, ast, asmt] = await Promise.all([
      base44.entities.ServiceProvider.filter({ project_id: project.id }).catch(() => []),
      base44.entities.Asset.filter({ project_id: project.id }).catch(() => []),
      base44.entities.ControlAssessment.filter({ project_id: project.id }).catch(() => []),
    ]);
    setProviders(prov);
    setAssets(ast);
    setAssessments(asmt);
    setLoading(false);
  }, [project.id]);

  useEffect(() => { load(); }, [load]);

  // Suggest providers from assets typed ESP / cloud / SaaS not already added.
  const suggestions = assets.filter((a) =>
    ['External Provider', 'Cloud Service', 'SaaS Application'].includes(a.asset_type) &&
    !providers.some((p) => p.asset_id === a.id || p.provider_name === a.asset_name));

  const remove = async (id) => { await base44.entities.ServiceProvider.delete(id); load(); };

  // Per-provider SRM document.
  const exportProvider = (p) => {
    const r = createReportPdf({ title: `Shared Responsibility Matrix — ${p.provider_name}`, project, org, generatedBy: currentUser?.full_name || currentUser?.email });
    r.label('Provider', p.provider_name);
    r.label('Type', p.provider_type);
    r.label('FedRAMP / Authorization', p.fedramp_status);
    if (p.service_description) r.text(p.service_description);
    r.space();
    r.heading('Responsibility by Control');
    (p.responsibilities || []).forEach((row) => {
      r.ensure(40);
      r.text(`${row.control_id} — ${row.control_title || ''}`, { bold: true });
      r.label('Responsibility', row.responsibility);
      if (row.inheritance_notes) r.text(`Inheritance: ${row.inheritance_notes}`);
      r.space(4);
    });
    if (!(p.responsibilities || []).length) r.text('No responsibilities mapped yet.');
    r.disclaimerNote(BRAND.disclaimer);
    r.save(`${safeFileName(project.project_name)}_SRM_${safeFileName(p.provider_name)}.pdf`);
  };

  // Combined SRM across all providers.
  const exportCombined = () => {
    const r = createReportPdf({ title: 'Combined Shared Responsibility Matrix', project, org, generatedBy: currentUser?.full_name || currentUser?.email });
    r.text(`${providers.length} external/cloud service provider(s) documented for ${org?.organization_name || 'the organization'}.`);
    providers.forEach((p) => {
      r.heading(`${p.provider_name} (${p.provider_type})`);
      r.label('Authorization', p.fedramp_status);
      const inherited = (p.responsibilities || []).filter((x) => x.responsibility === 'Provider' || x.responsibility === 'Shared');
      r.label('Inherited / Shared Controls', inherited.length);
      inherited.slice(0, 60).forEach((row) => r.text(`• ${row.control_id} — ${row.responsibility}${row.inheritance_notes ? `: ${stripHtml(row.inheritance_notes)}` : ''}`));
    });
    r.disclaimerNote(BRAND.disclaimer);
    r.save(`${safeFileName(project.project_name)}_Combined_SRM.pdf`);
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <Share2 className="w-5 h-5 text-[#0F1E3C]" />
            <h1 className="text-lg font-bold text-slate-900">Shared Responsibility Matrix</h1>
          </div>
          <div className="flex gap-2">
            {providers.length > 0 && (
              <button onClick={exportCombined}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200">
                <Layers className="w-4 h-4" /> Combined SRM
              </button>
            )}
            {!readOnly && (
              <button onClick={() => { setEditing(null); setModal(true); }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52]">
                <Plus className="w-4 h-4" /> Add Provider
              </button>
            )}
          </div>
        </div>
        <p className="text-[13px] text-slate-500 mt-2 leading-relaxed">
          Document each External Service Provider (ESP) and Cloud Service Provider (CSP), map responsibility per control
          (Customer / Provider / Shared), and record what is inherited. Inherited controls are summarized into the SSP.
        </p>

        {suggestions.length > 0 && !readOnly && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <div className="text-xs font-semibold text-blue-700 mb-2">Suggested from your asset inventory:</div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((a) => (
                <button key={a.id} onClick={() => { setEditing({ _fromAsset: a }); setModal(true); }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-white border border-blue-200 text-blue-700 hover:bg-blue-100">
                  <Plus className="w-3 h-3" /> {a.asset_name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {providers.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-500">
          No service providers documented yet. {!readOnly && 'Add a provider or pick one from the suggestions above.'}
        </div>
      ) : (
        <div className="grid gap-3">
          {providers.map((p) => (
            <ProviderCard key={p.id} provider={p} readOnly={readOnly}
              onEdit={() => { setEditing(p); setModal(true); }} onDelete={() => remove(p.id)} onExport={() => exportProvider(p)} />
          ))}
        </div>
      )}

      {modal && (
        <ProviderFormModal
          project={project}
          existing={editing && !editing._fromAsset ? editing : null}
          fromAsset={editing?._fromAsset || null}
          assessments={assessments}
          onClose={() => setModal(false)}
          onSaved={() => { setModal(false); load(); }}
        />
      )}
    </div>
  );
}