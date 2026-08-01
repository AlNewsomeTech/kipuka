import { useState, useEffect, useMemo } from 'react';
import { X, Upload, Loader2, Save, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { EVIDENCE_TYPES } from '@/lib/evidenceQuality';
import { isToolActive } from '@/lib/securityTools';
import RichTextField from '@/components/ui/RichTextField';

const TOOL_NAMING = {
  'NinjaOne': { toolName: 'NinjaOne', example: 'SI.L2-3.14.1_NinjaOne_OS_Patch_Policy_2026-07-05.png' },
  'Palo Alto Cortex XDR': { toolName: 'CortexXDR', example: 'SI.L2-3.14.2_CortexXDR_Malware_Prevention_Policy_2026-07-05.png' },
};
const CONTROL_ID_PREFIX = /^[A-Z]{2}\.L\d-\d/;
const PROVENANCE_TYPES = ['Manual Upload', 'System Export', 'Screenshot', 'Policy Record', 'Procedure Record', 'Third-Party Attestation'];

export default function EvidenceUploadModal({ project, controls = [], objectives = [], presetControlIds = [], presetSourceTool = null, existing = null, onClose, onSaved }) {
  const [form, setForm] = useState({
    evidence_title: '', evidence_type: 'Screenshot', control_ids: presetControlIds,
    objective_ids: [], description: '', evidence_date: new Date().toISOString().slice(0, 10),
    expiration_date: '', retention_until: '', owner: '', source_system: '',
    source_tool: presetSourceTool || 'None', provenance_type: 'Manual Upload',
    provenance_details: '', file_url: '', original_file_name: '',
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTools, setActiveTools] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (existing) setForm((current) => ({
      ...current, ...existing, control_ids: existing.control_ids || [],
      objective_ids: existing.objective_ids || [], source_tool: existing.source_tool || 'None',
      file_url: '', original_file_name: existing.original_file_name || existing.file_name || '',
    }));
  }, [existing]);

  useEffect(() => {
    base44.entities.ProjectSecurityTool.filter({ project_id: project.id })
      .then((tools) => setActiveTools(tools.filter((t) => isToolActive(t.tool_status)).map((t) => t.tool_name)))
      .catch(() => setActiveTools([]));
  }, [project.id]);

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const toggleControl = (id) => setForm((current) => {
    const selected = current.control_ids.includes(id)
      ? current.control_ids.filter((controlId) => controlId !== id)
      : [...current.control_ids, id];
    return {
      ...current, control_ids: selected,
      objective_ids: current.objective_ids.filter((objectiveId) => {
        const objective = objectives.find((item) => item.objective_id === objectiveId);
        return objective && selected.includes(objective.control_id);
      }),
    };
  });
  const toggleObjective = (id) => setForm((current) => ({
    ...current,
    objective_ids: current.objective_ids.includes(id)
      ? current.objective_ids.filter((objectiveId) => objectiveId !== id)
      : [...current.objective_ids, id],
  }));

  const availableObjectives = useMemo(
    () => objectives.filter((objective) => form.control_ids.includes(objective.control_id)),
    [objectives, form.control_ids],
  );

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm((current) => ({
        ...current, file_url, original_file_name: file.name,
        evidence_title: current.evidence_title || file.name.replace(/\.[^.]+$/, ''),
      }));
    } catch (uploadError) {
      setError(uploadError.message || 'The file could not be staged for secure ingestion.');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setError('');
    if (!form.evidence_title.trim()) return setError('Evidence title is required.');
    if (!form.control_ids.length) return setError('Map the evidence to at least one project control.');
    if (!form.retention_until) return setError('Retain Until is required for canonical evidence.');
    if (!existing && !form.file_url) return setError('A file is required for canonical evidence.');
    setSaving(true);
    try {
      await base44.functions.invoke('manageProjectEvidence', {
        action: existing ? 'new_version' : 'create',
        transition_id: crypto.randomUUID(),
        project_id: project.id,
        prior_evidence_id: existing?.id || undefined,
        file_url: form.file_url || undefined,
        original_file_name: form.original_file_name,
        evidence_title: form.evidence_title,
        evidence_type: form.evidence_type,
        control_ids: form.control_ids,
        objective_ids: form.objective_ids,
        description: form.description,
        evidence_date: form.evidence_date,
        expiration_date: form.expiration_date || undefined,
        retention_until: form.retention_until || undefined,
        owner: form.owner,
        source_system: form.source_system,
        source_tool: form.source_tool,
        provenance_type: form.provenance_type,
        provenance_details: form.provenance_details,
        quality_checklist: existing?.quality_checklist || {},
        quality_notes: existing?.quality_notes || '',
      });
      onSaved();
    } catch (saveError) {
      setError(saveError?.response?.data?.error || saveError.message || 'Evidence could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const sourceToolOptions = ['None', ...activeTools.filter((tool) => tool !== 'Other'), 'Other'];
  if (form.source_tool && !sourceToolOptions.includes(form.source_tool)) sourceToolOptions.splice(1, 0, form.source_tool);
  const naming = TOOL_NAMING[form.source_tool];
  const filenameWarn = naming && form.original_file_name && !CONTROL_ID_PREFIX.test(form.original_file_name);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 sticky top-0 bg-white z-10">
          <div>
            <h3 className="text-sm font-bold text-slate-800">{existing ? 'Create New Evidence Version' : 'Add Evidence'}</h3>
            {existing && <p className="text-xs text-slate-500 mt-0.5">The current version remains immutable and will be superseded.</p>}
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          {error && <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />{error}</div>}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">File {existing ? '(optional for a metadata-only new version)' : '*'}</label>
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-slate-300 cursor-pointer hover:bg-slate-50 text-sm text-slate-600">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {form.original_file_name || 'Choose evidence file'}
              <input type="file" className="hidden" onChange={handleFile} />
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Evidence Title *</label>
            <input className="form-input" value={form.evidence_title} onChange={(event) => set('evidence_title', event.target.value)} />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Type"><select className="form-input" value={form.evidence_type} onChange={(event) => set('evidence_type', event.target.value)}>{EVIDENCE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></Field>
            <Field label="Owner"><input className="form-input" value={form.owner} onChange={(event) => set('owner', event.target.value)} /></Field>
            <Field label="Evidence Date"><input type="date" className="form-input" value={form.evidence_date} onChange={(event) => set('evidence_date', event.target.value)} /></Field>
            <Field label="Expiration Date"><input type="date" className="form-input" value={form.expiration_date || ''} onChange={(event) => set('expiration_date', event.target.value)} /></Field>
            <Field label="Retain Until"><input type="date" className="form-input" value={form.retention_until || ''} onChange={(event) => set('retention_until', event.target.value)} /></Field>
            <Field label="Source System"><input className="form-input" value={form.source_system} onChange={(event) => set('source_system', event.target.value)} /></Field>
            <Field label="Source Tool"><select className="form-input" value={form.source_tool} onChange={(event) => set('source_tool', event.target.value)}>{sourceToolOptions.map((tool) => <option key={tool} value={tool}>{tool}</option>)}</select></Field>
            <Field label="Provenance"><select className="form-input" value={form.provenance_type} onChange={(event) => set('provenance_type', event.target.value)}>{PROVENANCE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></Field>
          </div>

          {naming && <div className="bg-slate-900 rounded-lg p-3"><div className="text-[10px] text-slate-400 uppercase tracking-wide">Suggested source filename</div><div className="text-green-400 font-mono text-[11px] break-all">{naming.example}</div></div>}
          {filenameWarn && <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-[13px] text-amber-800"><AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />Kipuka will normalize this filename and preserve the original name in provenance.</div>}

          <RichTextField label="Description" value={form.description} onChange={(value) => set('description', value)} placeholder="" disabled={false} onBlur={() => {}} />
          <Field label="Provenance Details"><textarea className="form-input min-h-20" value={form.provenance_details} onChange={(event) => set('provenance_details', event.target.value)} placeholder="How, where, and by whom this record was produced." /></Field>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Map to Controls *</label>
            <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1">
              {controls.map((control) => <label key={control.control_id} className="flex items-start gap-2 text-xs text-slate-700"><input type="checkbox" className="mt-0.5" checked={form.control_ids.includes(control.control_id)} onChange={() => toggleControl(control.control_id)} /><span><span className="font-mono text-slate-500">{control.control_id}</span> {control.control_title}</span></label>)}
            </div>
          </div>

          {availableObjectives.length > 0 && <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Link Assessment Objectives</label>
            <p className="text-[11px] text-slate-500 mb-1.5">Linking evidence does not mark an objective MET; the assessor finding remains separate.</p>
            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1">
              {availableObjectives.map((objective) => <label key={objective.objective_id} className="flex items-start gap-2 text-xs text-slate-700"><input type="checkbox" className="mt-0.5" checked={form.objective_ids.includes(objective.objective_id)} onChange={() => toggleObjective(objective.objective_id)} /><span><span className="font-mono text-slate-500">{objective.objective_id}</span> {objective.objective_text || objective.description}</span></label>)}
            </div>
          </div>}
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-200 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 bg-slate-100">Cancel</button>
          <button onClick={save} disabled={saving || uploading} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {existing ? 'Create New Version' : 'Save Draft'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return <div><label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>{children}</div>;
}
