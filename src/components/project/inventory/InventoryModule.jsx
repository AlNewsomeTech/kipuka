import { useState, useEffect, useCallback, useMemo } from 'react';
import { Boxes, Plus, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { INVENTORY_PAGES } from '@/lib/assetInventory';
import AssetRow from './AssetRow';
import AssetFormModal from './AssetFormModal';

const INVENTORY_STATUSES = ['Not Started', 'Preliminary', 'In Progress', 'Needs Validation', 'Finalized', 'Needs Update'];

export default function InventoryModule({ project, readOnly, currentUser, refreshProject }) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('users');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [invStatus, setInvStatus] = useState(project.inventory_status || 'Not Started');

  const saveInvStatus = async (v) => {
    setInvStatus(v);
    await base44.entities.Project.update(project.id, { inventory_status: v });
    refreshProject && refreshProject();
  };

  const load = useCallback(async () => {
    setLoading(true);
    const list = await base44.entities.Asset.filter({ project_id: project.id }).catch(() => []);
    setAssets(list);
    setLoading(false);
  }, [project.id]);

  useEffect(() => { load(); }, [load]);

  const page = INVENTORY_PAGES.find((p) => p.key === tab) || INVENTORY_PAGES[0];
  const rows = useMemo(() => assets.filter((a) => page.types.includes(a.asset_type)), [assets, page]);

  const countFor = useCallback((p) => assets.filter((a) => p.types.includes(a.asset_type)).length, [assets]);

  const remove = async (id) => { await base44.entities.Asset.delete(id); load(); };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <Boxes className="w-5 h-5 text-[#0F1E3C]" />
            <h1 className="text-lg font-bold text-slate-900">Asset Inventory</h1>
          </div>
          {!readOnly && (
            <button onClick={() => { setEditing(null); setModal(true); }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52]">
              <Plus className="w-4 h-4" /> Add {page.label.replace(/s$/, '')}
            </button>
          )}
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