import { useState, useEffect, useRef } from 'react';
import { Image, Upload, Search, X, AlertCircle, Copy, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useClient } from '@/lib/clientContext';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';

const systems = ['Microsoft 365', 'Entra ID', 'SharePoint', 'Exchange', 'Defender', 'Purview', 'Intune', 'NinjaOne', 'Physical Security', 'Other'];
const l1Controls = ['AC.L1-3.1.1', 'AC.L1-3.1.2', 'AC.L1-3.1.20', 'AC.L1-3.1.22', 'IA.L1-3.5.1', 'IA.L1-3.5.2', 'MP.L1-3.8.3', 'PE.L1-3.10.1', 'PE.L1-3.10.3', 'PE.L1-3.10.4', 'PE.L1-3.10.5', 'SC.L1-3.13.1', 'SC.L1-3.13.5', 'SI.L1-3.14.1', 'SI.L1-3.14.2', 'SI.L1-3.14.4', 'SI.L1-3.14.5'];
const l2Domains = ['RA', 'CM', 'AU', 'IR', 'AC', 'SC', 'SI'];

function clientPrefix(name) {
  if (!name) return 'CLIENT';
  return name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 10) || 'CLIENT';
}

function suggestFileName(level, control, system, description, date, clientName) {
  const d = date ? date.replace(/-/g, '') : new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const desc = (description || 'Evidence').replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-');
  const prefix = clientPrefix(clientName);
  if (level === 'Level 2 Ready') {
    const domain = control || 'RA';
    return `${prefix}-CMMC-L2READY-${domain}-${system}-${desc}-${d}-v01.png`;
  }
  return `${prefix}-CMMC-L1-${control || 'CTRL'}-${system}-${desc}-${d}-v01.png`;
}

export default function ScreenshotLibrary() {
  const { selectedClientId, selectedClient } = useClient();
  const [screenshots, setScreenshots] = useState([]);
  const [showUpload, setShowUpload] = useState(false);
  const [search, setSearch] = useState('');
  const [filterControl, setFilterControl] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [form, setForm] = useState({ related_control: '', related_system: 'Entra ID', description: '', screenshot_date: new Date().toISOString().slice(0, 10), captured_by: '', admin_center_url: '', level: 'Level 1', l2_domain: '' });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(null);
  const fileRef = useRef(null);

  const load = () => {
    if (!selectedClientId) return;
    base44.entities.Screenshot.filter({ client_id: selectedClientId }).then(setScreenshots).catch(() => {});
  };
  useEffect(load, [selectedClientId]);

  const suggested = suggestFileName(form.level, form.level === 'Level 2 Ready' ? form.l2_domain : form.related_control, form.related_system, form.description, form.screenshot_date, selectedClient?.legal_name);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.Screenshot.create({
        client_id: selectedClientId, file_url,
        related_control: form.level === 'Level 2 Ready' ? '' : form.related_control,
        related_system: form.related_system, description: form.description,
        screenshot_date: form.screenshot_date, captured_by: form.captured_by,
        suggested_file_name: suggested, actual_file_name: suggested,
        admin_center_url: form.admin_center_url, level: form.level,
        validation_status: 'Not Started', reviewer_status: 'Not Reviewed',
        include_in_final_package: false
      });
      setShowUpload(false);
      setFile(null);
      setForm({ related_control: '', related_system: 'Entra ID', description: '', screenshot_date: new Date().toISOString().slice(0, 10), captured_by: '', admin_center_url: '', level: 'Level 1', l2_domain: '' });
      load();
    } catch (e) { alert('Upload failed: ' + e.message); }
    setUploading(false);
  };

  const updateScreenshot = (id, field, value) => {
    base44.entities.Screenshot.update(id, { [field]: value }).then(load);
  };

  const filtered = screenshots.filter(s => {
    const ms = !search || s.actual_file_name?.toLowerCase().includes(search.toLowerCase()) || s.description?.toLowerCase().includes(search.toLowerCase());
    const mc = filterControl === 'all' || s.related_control === filterControl;
    const mst = filterStatus === 'all' || s.validation_status === filterStatus;
    return ms && mc && mst;
  });

  const duplicates = {};
  screenshots.forEach(s => { const name = s.actual_file_name; if (name) duplicates[name] = (duplicates[name] || 0) + 1; });
  const dupNames = Object.keys(duplicates).filter(k => duplicates[k] > 1);

  if (!selectedClient) return <EmptyState icon={Image} title="No client selected" description="Select a client to manage screenshots." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Screenshot Library</h1>
          <p className="text-sm text-slate-500 mt-1">Upload, label, and map screenshots to CMMC controls</p>
        </div>
        <button onClick={() => setShowUpload(true)} className="flex items-center gap-2 bg-[#0F1E3C] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#1E2D4A]"><Upload className="w-4 h-4" /> Upload Screenshot</button>
      </div>

      {dupNames.length > 0 && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
          <AlertCircle className="w-4 h-4" /> Duplicate file names detected: {dupNames.join(', ')}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input placeholder="Search screenshots..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
        </div>
        <select value={filterControl} onChange={e => setFilterControl(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30">
          <option value="all">All Controls</option>
          {l1Controls.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30">
          <option value="all">All Statuses</option>
          <option>Not Started</option><option>In Progress</option><option>Validated</option><option>Rejected</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Image} title="No screenshots yet" description="Upload screenshots from Snipping Tool or Snagit. The app will suggest a file name following the CMMC naming convention." action={<button onClick={() => setShowUpload(true)} className="bg-[#0F1E3C] text-white text-sm px-4 py-2 rounded-lg">Upload Screenshot</button>} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(s => (
            <div key={s.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {s.file_url ? <img src={s.file_url} alt="" className="w-full h-32 object-cover" /> : <div className="w-full h-32 bg-slate-100 flex items-center justify-center"><Image className="w-8 h-8 text-slate-300" /></div>}
              <div className="p-3">
                <div className="text-[10px] font-mono text-slate-600 truncate mb-1" title={s.actual_file_name}>{s.actual_file_name || 'Untitled'}</div>
                <div className="flex items-center gap-1.5 flex-wrap mb-2">
                  {s.related_control && <span className="text-[9px] font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{s.related_control}</span>}
                  {s.related_system && <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{s.related_system}</span>}
                </div>
                <div className="flex items-center justify-between">
                  <StatusBadge status={s.validation_status} size="xs" />
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" checked={s.include_in_final_package} onChange={e => updateScreenshot(s.id, 'include_in_final_package', e.target.checked)} className="w-3 h-3 rounded" />
                    <span className="text-[9px] text-slate-500">Package</span>
                  </label>
                </div>
                {!s.actual_file_name && <div className="text-[9px] text-amber-600 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Missing file name</div>}
                {!s.related_control && s.level === 'Level 1' && <div className="text-[9px] text-amber-600 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> No control mapped</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showUpload && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowUpload(false)}>
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-200"><h2 className="text-lg font-bold text-slate-900">Upload Screenshot</h2><button onClick={() => setShowUpload(false)} className="text-slate-400"><X className="w-5 h-5" /></button></div>
            <div className="p-5 space-y-3">
              <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 transition-colors" onClick={() => fileRef.current?.click()}>
                {file ? <p className="text-sm text-slate-700">{file.name}</p> : <><Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" /><p className="text-sm text-slate-500">Click to select screenshot</p><p className="text-xs text-slate-400 mt-1">PNG, JPG from Snipping Tool or Snagit</p></>}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => setFile(e.target.files[0])} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Level"><select className="form-input" value={form.level} onChange={e => setForm({...form, level: e.target.value})}><option>Level 1</option><option>Level 2 Ready</option></select></Field>
                <Field label="Screenshot Date"><input type="date" className="form-input" value={form.screenshot_date} onChange={e => setForm({...form, screenshot_date: e.target.value})} /></Field>
              </div>
              {form.level === 'Level 1' ? (
                <Field label="Related Control"><select className="form-input" value={form.related_control} onChange={e => setForm({...form, related_control: e.target.value})}><option value="">Select control</option>{l1Controls.map(c => <option key={c}>{c}</option>)}</select></Field>
              ) : (
                <Field label="L2 Domain"><select className="form-input" value={form.l2_domain} onChange={e => setForm({...form, l2_domain: e.target.value})}><option value="">Select domain</option>{l2Domains.map(d => <option key={d}>{d}</option>)}</select></Field>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Related System"><select className="form-input" value={form.related_system} onChange={e => setForm({...form, related_system: e.target.value})}>{systems.map(s => <option key={s}>{s}</option>)}</select></Field>
                <Field label="Captured By"><input className="form-input" value={form.captured_by} onChange={e => setForm({...form, captured_by: e.target.value})} /></Field>
              </div>
              <Field label="Description (used in file name)"><input className="form-input" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="e.g. MFA-Policy" /></Field>
              <Field label="Admin Center URL"><input className="form-input" value={form.admin_center_url} onChange={e => setForm({...form, admin_center_url: e.target.value})} /></Field>
              <div className="bg-slate-50 rounded-lg p-3">
                <label className="text-xs font-medium text-slate-600 mb-1 block">Suggested File Name</label>
                <div className="flex items-center gap-2">
                  <code className="text-[11px] text-slate-700 flex-1 break-all">{suggested}</code>
                  <button onClick={() => { navigator.clipboard.writeText(suggested); setCopied(suggested); setTimeout(() => setCopied(null), 2000); }} className="text-slate-400 hover:text-blue-600 flex-shrink-0">{copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}</button>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t border-slate-200"><button onClick={() => setShowUpload(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button><button onClick={handleUpload} disabled={!file || uploading} className="px-4 py-2 text-sm bg-[#0F1E3C] text-white rounded-lg hover:bg-[#1E2D4A] disabled:opacity-50">{uploading ? 'Uploading...' : 'Upload'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) { return <div><label className="text-xs font-medium text-slate-600 mb-1 block">{label}</label>{children}</div>; }