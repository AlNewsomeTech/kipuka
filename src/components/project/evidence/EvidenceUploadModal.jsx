import { useState, useEffect } from 'react';
import { X, Upload, Loader2, Save, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { EVIDENCE_TYPES } from '@/lib/evidenceQuality';
import { isToolActive } from '@/lib/securityTools';
import RichTextField from '@/components/ui/RichTextField';

// Tools that carry a naming standard.
const TOOL_NAMING = {
  'NinjaOne': { toolName: 'NinjaOne', example: 'SI.L2-3.14.1_NinjaOne_OS_Patch_Policy_2026-07-05.png' },
  'Palo Alto Cortex XDR': { toolName: 'CortexXDR', example: 'SI.L2-3.14.2_CortexXDR_Malware_Prevention_Policy_2026-07-05.png' },
};

// A filename "looks like" it starts with a control ID: e.g. AC.L2-3.1.2_...
const CONTROL_ID_PREFIX = /^[A-Z]{2}\.L\d-\d/;

// Create/edit a ProjectEvidence item. `existing` edits; otherwise creates.
export default function EvidenceUploadModal({ project, currentUser, controls = [], presetControlIds = [], presetSourceTool = null, existing = null, onClose, onSaved }) {
  const [form, setForm] = useState({
    evidence_title: '', evidence_type: 'Screenshot', control_ids: presetControlIds,
    description: '', evidence_date: new Date().toISOString().slice(0, 10),
    expiration_date: '', owner: '', source_system: '', source_tool: presetSourceTool || 'None',
    review_status: presetSourceTool ? 'Needs Review' : 'Draft',
    file_url: '', file_name: '',
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTools, setActiveTools] = useState([]); // enabled/planned tool names

  useEffect(() => {
    if (existing) setForm({ ...existing, control_ids: existing.control_ids || [], source_tool: existing.source_tool || 'None' });
  }, [existing]);

  // Load which tools are enabled/planned so only those appear as source options.
  useEffect(() => {
    base44.entities.ProjectSecurityTool.filter({ project_id: project.id })
      .then((tools) => setActiveTools(tools.filter((t) => isToolActive(t.tool_status)).map((t) => t.tool_name)))
      .catch(() => setActiveTools([]));
  }, [project.id]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const toggleControl = (id) => set('control_ids', form.control_ids.includes(id)
    ? form.control_ids.filter((c) => c !== id)
    : [...form.control_ids, id]);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm((f) => ({ ...f, file_url, file_name: file.name, evidence_title: f.evidence_title || file.name }));
    setUploading(false);
  };

  const save = async () => {
    setSaving(true);
    const payload = {
      ...form,
      organization_id: project.organization_id,
      project_id: project.id,
      uploaded_by: currentUser?.full_name || currentUser?.email || '',
      expiration_date: form.expiration_date || undefined,
    };
    if (existing?.id) await base44.entities.ProjectEvidence.update(existing.id, payload);
    else await base44.entities.ProjectEvidence.create(payload);
    setSaving(false);
    onSaved();
  };

  // Source tool options: None + active tools + Other.
  const sourceToolOptions = ['None', ...activeTools.filter((t) => t !== 'Other'), 'Other'];
  // Ensure the current/preset value is always selectable even if not active.
  if (form.source_tool && !sourceToolOptions.includes(form.source_tool)) sourceToolOptions.splice(1, 0, form.source_tool);

  const naming = TOOL_NAMING[form.source_tool];
  const filenameWarn = naming && form.file_name && !CONTROL_ID_PREFIX.test(form.file_name);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h3 className="text-sm font-bold text-slate-800">{existing ? 'Edit Evidence' : 'Add Evidence'}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">File</label>
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-slate-300 cursor-pointer hover:bg-slate-50 text-sm text-slate-600">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {form.file_name || 'Upload a file (optional)'}
              <input type="file" className="hidden" onChange={handleFile} />
            </label>
          </div>

          {/* Source tool + naming guidance */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Source Tool</label>
            <select className="form-input" value={form.source_tool} onChange={(e) => set('source_tool', e.target.value)}>
              {sourceToolOptions.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {naming && (
            <div className="bg-slate-900 rounded-lg p-3 space-y-1">
              <div className="text-[10px] text-slate-400 uppercase tracking-wide">Required naming format</div>
              <div className="text-green-400 font-mono text-[12px] break-all">CONTROLID_{naming.toolName}_EvidenceDescription_YYYY-MM-DD.png</div>
              <div className="text-green-400 font-mono text-[11px] break-all opacity-80">e.g. {naming.example}</div>
            </div>
          )}
          {filenameWarn && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-[13px] text-amber-800 leading-[1.5]">
                Evidence file name should start with the primary CMMC control ID. Example: <span className="font-mono">{naming.example}</span>
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Evidence Title *</label>
            <input className="form-input" value={form.evidence_title} onChange={(e) => set('evidence_title', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Type</label>
              <select className="form-input" value={form.evidence_type} onChange={(e) => set('evidence_type', e.target.value)}>
                {EVIDENCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Owner</label>
              <input className="form-input" value={form.owner} onChange={(e) => set('owner', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Evidence Date</label>
              <input type="date" className="form-input" value={form.evidence_date} onChange={(e) => set('evidence_date', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Expiration Date</label>
              <input type="date" className="form-input" value={form.expiration_date || ''} onChange={(e) => set('expiration_date', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Source System</label>
              <input className="form-input" value={form.source_system} onChange={(e) => set('source_system', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Review Status</label>
              <select className="form-input" value={form.review_status} onChange={(e) => set('review_status', e.target.value)}>
                {['Draft', 'Needs Review', 'Accepted', 'Rejected', 'Expired'].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <RichTextField label="Description" value={form.description} onChange={(v) => set('description', v)} />

          {controls.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Map to Controls</label>
              <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1">
                {controls.map((c) => (
                  <label key={c.control_id} className="flex items-center gap-2 text-xs text-slate-700">
                    <input type="checkbox" checked={form.control_ids.includes(c.control_id)} onChange={() => toggleControl(c.control_id)} />
                    <span className="font-mono text-slate-500">{c.control_id}</span> {c.control_title}
                  </label>
                ))}
              </div>
            </div>
          )}
          {controls.length === 0 && presetControlIds.length > 0 && (
            <p className="text-xs text-slate-500">Mapped to control: <span className="font-mono">{presetControlIds.join(', ')}</span></p>
          )}
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-200 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 bg-slate-100">Cancel</button>
          <button onClick={save} disabled={saving || !form.evidence_title.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Evidence
          </button>
        </div>
      </div>
    </div>
  );
}