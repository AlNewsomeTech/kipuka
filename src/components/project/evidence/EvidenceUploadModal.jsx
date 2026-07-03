import { useState, useEffect } from 'react';
import { X, Upload, Loader2, Save } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { EVIDENCE_TYPES } from '@/lib/evidenceQuality';
import RichTextField from '@/components/ui/RichTextField';

// Create/edit a ProjectEvidence item. `existing` edits; otherwise creates.
export default function EvidenceUploadModal({ project, currentUser, controls = [], presetControlIds = [], existing = null, onClose, onSaved }) {
  const [form, setForm] = useState({
    evidence_title: '', evidence_type: 'Screenshot', control_ids: presetControlIds,
    description: '', evidence_date: new Date().toISOString().slice(0, 10),
    expiration_date: '', owner: '', source_system: '', review_status: 'Draft',
    file_url: '', file_name: '',
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existing) setForm({ ...existing, control_ids: existing.control_ids || [] });
  }, [existing]);

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

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 sticky top-0 bg-white">
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