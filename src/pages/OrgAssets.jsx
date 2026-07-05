import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { HardDrive, Plus, Loader2, Pencil, Trash2, ShieldCheck, Layers } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useOrg } from '@/lib/orgContext';
import { scopeCategoryMeta } from '@/lib/assetCategories';
import EmptyState from '@/components/EmptyState';
import AssetCategorySummary from '@/components/org/assets/AssetCategorySummary';
import OrgAssetFormModal from '@/components/org/assets/OrgAssetFormModal';

export default function OrgAssets() {
  const { selectedOrgId, selectedOrg, readOnly } = useOrg();
  const [project, setProject] = useState(null);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async () => {
    if (!selectedOrgId) { setLoading(false); return; }
    setLoading(true);
    // Resolve active project (CompanyProfile.active_project_id, else newest project).
    const profiles = await base44.entities.CompanyProfile.filter({ organization_id: selectedOrgId }).catch(() => []);
    let proj = null;
    if (profiles[0]?.active_project_id) {
      const found = await base44.entities.Project.filter({ id: profiles[0].active_project_id }).catch(() => []);
      proj = found[0] || null;
    }
    if (!proj) {
      const projects = await base44.entities.Project.filter({ organization_id: selectedOrgId }, '-created_date', 1).catch(() => []);
      proj = projects[0] || null;
    }
    setProject(proj);
    if (proj) {
      const rows = await base44.entities.Asset.filter({ project_id: proj.id }, '-created_date', 1000).catch(() => []);
      setAssets(rows);
    } else {
      setAssets([]);
    }
    setLoading(false);
  }, [selectedOrgId]);

  useEffect(() => { load(); }, [load]);

  // All writes route through the server-side org-role guard (orgAssetWrite).
  const saveAsset = async (data) => {
    const res = await base44.functions.invoke('orgAssetWrite', {
      action: editing ? 'update' : 'create',
      organizationId: selectedOrgId,
      projectId: project?.id,
      assetId: editing?.id,
      data,
    });
    if (res?.data?.error) throw new Error(res.data.error);
    await load();
  };

  const removeAsset = async (asset) => {
    setDeleting(asset.id);
    try {
      const res = await base44.functions.invoke('orgAssetWrite', {
        action: 'delete', organizationId: selectedOrgId, assetId: asset.id,
      });
      if (res?.data?.error) throw new Error(res.data.error);
      await load();
    } catch (e) {
      alert(e.message);
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  }

  if (!selectedOrgId) {
    return <EmptyState icon={HardDrive} title="No organization selected" description="Select an organization to view its asset inventory." />;
  }

  if (!project) {
    return (
      <EmptyState
        icon={Layers}
        title="No active project yet"
        description="Your organization needs an implementation project before you can build an asset inventory."
        action={<Link to="/projects/new" className="text-sm text-blue-600 font-medium hover:underline">Create a project →</Link>}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <HardDrive className="w-6 h-6 text-[#0F1E3C]" /> Asset Inventory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {selectedOrg?.organization_name ? `${selectedOrg.organization_name} · ` : ''}{project.project_name}
          </p>
        </div>
        {!readOnly && (
          <button onClick={() => { setEditing(null); setModal(true); }} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#0F1E3C] rounded-lg hover:bg-[#1E2D4A] flex-shrink-0">
            <Plus className="w-4 h-4" /> Add Asset
          </button>
        )}
      </div>

      <AssetCategorySummary assets={assets} />

      {assets.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200">
          <EmptyState
            icon={ShieldCheck}
            title="No assets inventoried yet"
            description="Your asset inventory defines your CMMC assessment scope. Every laptop, server, cloud service, and provider that touches CUI or FCI must be listed and categorized — the categories determine which controls apply to each asset and what your assessor will review. Start by adding the systems that store, process, or transmit CUI."
            action={!readOnly ? (
              <button onClick={() => { setEditing(null); setModal(true); }} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#0F1E3C] rounded-lg hover:bg-[#1E2D4A]">
                <Plus className="w-4 h-4" /> Add your first asset
              </button>
            ) : null}
          />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-slate-500 border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3">Asset</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Scope Category</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assets.map((a) => {
                  const cat = scopeCategoryMeta(a.scope_category);
                  const dataTags = [
                    a.handles_fci && 'FCI',
                    a.stores_cui && 'Stores CUI',
                    a.processes_cui && 'Processes CUI',
                    a.transmits_cui && 'Transmits CUI',
                    (!a.stores_cui && !a.processes_cui && !a.transmits_cui && a.handles_cui) && 'CUI',
                  ].filter(Boolean);
                  return (
                    <tr key={a.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{a.asset_name}</div>
                        {a.location && <div className="text-xs text-slate-400">{a.location}</div>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{a.asset_type}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ backgroundColor: `${cat.color}1a`, color: cat.color }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color }} />
                          {cat.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{a.owner || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {dataTags.length === 0 ? <span className="text-xs text-slate-400">—</span> :
                            dataTags.map((t) => <span key={t} className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">{t}</span>)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {readOnly ? (
                            <span className="text-xs text-slate-400">Read-only</span>
                          ) : (
                            <>
                              <button title="Edit" onClick={() => { setEditing(a); setModal(true); }} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"><Pencil className="w-4 h-4" /></button>
                              <button title="Delete" onClick={() => removeAsset(a)} disabled={deleting === a.id} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-50">
                                {deleting === a.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && !readOnly && (
        <OrgAssetFormModal existing={editing} onClose={() => setModal(false)} onSave={saveAsset} />
      )}
    </div>
  );
}