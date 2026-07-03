import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, ExternalLink, Plus, X, ShieldAlert } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import WarningBanner from '@/components/WarningBanner';
import TermsSettingsPanel from '@/components/legal/TermsSettingsPanel';
import { useAuth } from '@/lib/AuthContext';

export default function Settings() {
  const { user } = useAuth();
  const [links, setLinks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', url: '', description: '', category: '', is_default: false });

  const load = () => { base44.entities.AdminCenterLink.list().then(setLinks).catch(() => {}); };
  useEffect(load, []);

  const addLink = () => {
    base44.entities.AdminCenterLink.create(form).then(() => { setShowForm(false); setForm({ name: '', url: '', description: '', category: '', is_default: false }); load(); });
  };
  const deleteLink = (id) => base44.entities.AdminCenterLink.delete(id).then(load);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Admin center links and application settings</p>
      </div>

      <WarningBanner compact />

      {/* Admin center links */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-800">Admin Center Links</h3>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-200"><Plus className="w-3.5 h-3.5" /> Add Link</button>
        </div>
        <div className="space-y-2">
          {links.map(l => (
            <div key={l.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
              <ExternalLink className="w-4 h-4 text-slate-400" />
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-700">{l.name} {l.is_default && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded ml-1">Default</span>}</div>
                <a href={l.url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">{l.url}</a>
              </div>
              {l.category && <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{l.category}</span>}
              <button onClick={() => deleteLink(l.id)} className="text-slate-300 hover:text-red-500"><X className="w-4 h-4" /></button>
            </div>
          ))}
          {links.length === 0 && <p className="text-xs text-slate-400 py-4">No admin center links configured.</p>}
        </div>
      </div>

      {/* Terms & Conditions management (admin only) */}
      {user?.role === 'admin' && <TermsSettingsPanel />}

      {/* About */}
      <div className="bg-[#0F1E3C] rounded-xl p-5 text-white">
        <div className="flex items-center gap-2 mb-3"><ShieldAlert className="w-5 h-5" /><h3 className="text-sm font-semibold">About CMMC Deployment Command Center</h3></div>
        <p className="text-xs text-white/70 leading-relaxed">This app supports readiness and evidence management for CMMC 2.0 deployments. It does not replace legal, contractual, or official assessment requirements. It is a planning, implementation, evidence, and readiness tool for MSP consultants.</p>
        <div className="mt-3 text-xs text-white/50">Version 1.0</div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200"><h2 className="text-lg font-bold text-slate-900">Add Admin Center Link</h2><button onClick={() => setShowForm(false)} className="text-slate-400"><X className="w-5 h-5" /></button></div>
            <div className="p-5 space-y-3">
              <div><label className="text-xs font-medium text-slate-600 mb-1 block">Name</label><input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
              <div><label className="text-xs font-medium text-slate-600 mb-1 block">URL</label><input className="form-input" value={form.url} onChange={e => setForm({...form, url: e.target.value})} /></div>
              <div><label className="text-xs font-medium text-slate-600 mb-1 block">Description</label><input className="form-input" value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
              <div><label className="text-xs font-medium text-slate-600 mb-1 block">Category</label><input className="form-input" value={form.category} onChange={e => setForm({...form, category: e.target.value})} /></div>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-600"><input type="checkbox" checked={form.is_default} onChange={e => setForm({...form, is_default: e.target.checked})} className="w-4 h-4 rounded" /> Default link</label>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-slate-200"><button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button><button onClick={addLink} className="px-4 py-2 text-sm bg-[#0F1E3C] text-white rounded-lg hover:bg-[#1E2D4A]">Add</button></div>
          </div>
        </div>
      )}
    </div>
  );
}