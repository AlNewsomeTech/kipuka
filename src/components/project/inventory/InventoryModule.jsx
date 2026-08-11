import { useState, useEffect, useCallback, useMemo } from 'react';
import { Boxes, Plus, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { INVENTORY_PAGES } from '@/lib/assetInventory';
import AssetRow from './AssetRow';
import AssetFormModal from './AssetFormModal';

const INVENTORY_STATUSES = ['Not Started', 'Preliminary', 'In Progress', 'Needs Validation', 'Finalized', 'Needs Update'];

export default function InventoryModule({ project, readOnly, currentUser, refreshProject }) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError] = useState(null);
  const [tab, setTab] = useState('users');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [invStatus, setInvStatus] = useState(project.inventory_status || 'Not Started');

  const finalizationChecks = useMemo(() => [
    { label: 'At least one asset is recorded', pass: assets.length > 0 },
    { label: 'Every asset has an owner', pass: assets.length > 0 && assets.every((a) => String(a.owner || '').trim()) },
    { label: 'Every asset has a final scope category', pass: assets.length > 0 && assets.every((a) => a.scope_category && a.scope_category !== 'Unknown') },
    { label: 'Every asset has an active lifecycle status', pass: assets.length > 0 && assets.every((a) => a.status && a.status !== 'Unknown') },
    { label: 'CUI assets identify how CUI is handled', pass: assets.filter((a) => a.scope_category === 'CUI Asset').every((a) => a.stores_cui || a.processes_cui || a.transmits_cui || a.handles_cui) },
  ], [assets]);
  const inventoryCanFinalize = finalizationChecks.every((c) => c.pass);

  const saveInvStatus = async (v) => {
    setStatusError(null);
    if (v === 'Finalized' && !inventoryCanFinalize) {
      setStatusError('Inventory cannot be finalized until every validation item below passes.');
      return;
    }
    setStatusSaving(true);
    try {
      const savedProject = await base44.entities.Project.update(project.id, { inventory_status: v });
      setInvStatus(savedProject.inventory_status || v);
      if (refreshProject) await refreshProject();
    } catch (error) {
      setStatusError(error?.response?.data?.error || error?.message || 'Inventory status was not saved.');
    } finally {
      setStatusSaving(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const list = await base44.entities.Asset.filter({ project_id: project.id });
      setAssets(list);
    } catch (error) {
      setLoadError(error?.response?.data?.error || error?.message || 'Kipuka could not verify the complete asset inventory.');
    } finally {
      setLoading(false);
    }
  }, [project.id]);

  useEffect(() => { load(); }, [load]);

  const page = INVENTORY_PAGES.find((p) => p.key === tab) || INVENTORY_PAGES[0];
  const rows = useMemo(() => assets.filter((a) => page.types.includes(a.asset_type)), [assets, page]);

  const countFor = useCallback((p) => assets.filter((a) => p.types.includes(a.asset_type)).length, [assets]);

  const remove = async (id) => { await base44.entities.Asset.delete(id); load(); };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  }
  if (loadError) return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-5">
      <div className="flex items-center gap-2 text-sm font-bold text-red-800"><AlertTriangle className="w-4 h-4" /> Asset inventory could not be verified</div>
      <p className="text-[13px] text-red-700 mt-2">{loadError}</p>
      <p className="text-xs text-red-600 mt-1">Kipuka will not display an empty inventory or allow finalization from a partial load.</p>
      <button onClick={load} className="mt-3 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-700 hover:bg-red-800">Retry complete load</button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <Boxes className="w-5 h-5 text-[#0F1E3C]" />
            <h1 className="text-lg font-bold text-slate-900">Final Inventory &amp; Scope Validation</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-xs font-semibold text-slate-500">Inventory status:</label>
            <select className="form-input w-auto text-xs" value={invStatus} disabled={readOnly || statusSaving}
              onChange={(e) => saveInvStatus(e.target.value)}>
              {INVENTORY_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {!readOnly && (
              <button onClick={() => { setEditing(null); setModal(true); }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52]">
                <Plus className="w-4 h-4" /> Add {page.label.replace(/s$/, '')}
              </button>
            )}
          </div>
        </div>

        <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3 text-[13px] text-blue-800 leading-relaxed">
          Complete preliminary scope early, then perform final inventory <span className="font-semibold">after</span> major
          tenant and endpoint controls are implemented so documentation reflects the actual configured environment.
          Late-stage inventory includes Intune inventory, hardware/endpoint inventory, device compliance, ownership
          validation, in/out-of-scope validation, and CUI / Security Protection asset confirmation.
        </div>

        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="text-xs font-bold text-slate-700">Before selecting Finalized</div>
          <ul className="mt-2 space-y-1">
            {finalizationChecks.map((check) => (
              <li key={check.label} className={`flex items-center gap-2 text-xs ${check.pass ? 'text-green-700' : 'text-amber-700'}`}>
                {check.pass ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />} {check.label}
              </li>
            ))}
          </ul>
          {statusError && <p className="mt-2 text-xs font-semibold text-red-700">{statusError}</p>}
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {INVENTORY_PAGES.map((p) => {
            const Icon = p.icon;
            const c = countFor(p);
            return (
              <button key={p.key} onClick={() => setTab(p.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${tab === p.key ? 'bg-[#0F1E3C] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                <Icon className="w-3.5 h-3.5" /> {p.label}
                {c > 0 && <span className={tab === p.key ? 'opacity-80' : 'text-slate-400'}>({c})</span>}
              </button>
            );
          })}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-500">
          No {page.label.toLowerCase()} recorded yet.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {rows.map((a) => (
            <AssetRow key={a.id} asset={a} readOnly={readOnly}
              onEdit={() => { setEditing(a); setModal(true); }} onDelete={() => remove(a.id)} />
          ))}
        </div>
      )}

      {modal && (
        <AssetFormModal
          project={project}
          defaultType={page.types[0]}
          existing={editing}
          onClose={() => setModal(false)}
          onSaved={() => { setModal(false); load(); }}
        />
      )}
    </div>
  );
}