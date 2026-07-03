import { useState, useEffect } from 'react';
import { X, Loader2, Save, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import RichTextField from '@/components/ui/RichTextField';
import TagListField from '@/components/project/scoping/TagListField';

const FRAMEWORKS = ['CMMC', 'NIST SP 800-171', 'FAR 52.204-21'];
const LEVELS = ['Level 1', 'Level 2', 'Level 3', 'Not Applicable'];

export default function ControlLibraryEditor({ existing, onClose, onSaved }) {
  const [form, setForm] = useState({
    framework: 'CMMC', cmmc_level: 'Level 1', domain: '', control_id: '', control_title: '',
    requirement_text: '', plain_english_summary: '', assessment_objectives: [],
    example_implementation: '', example_evidence: '', related_policy_templates: [],
    ssp_statement_starter: '', poam_gap_starter: '', sort_order: 0, active: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (existing) setForm(existing); }, [existing]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    if (existing?.id) await base44.entities.ControlLibrary.update(existing.id, form);
    else await base44.entities.ControlLibrary.create(form);
    setSaving(false);
    onSaved();
  };

  const remove = async () => {
    if (!existing?.id) return;
    setSaving(true);
    await base44.entities.ControlLibrary.delete(existing.id);
    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h3 className="text-sm font-bold text-slate-800">{existing ? 'Edit Control' : 'Add Control'}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Framework</label>
              <select className="form-input" value={form.framework} onChange={(e) => set('framework', e.target.value)}>
                {FRAMEWORKS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">CMMC Level</label>
              <select className="form-input" value={form.cmmc_level} onChange={(e) => set('cmmc_level', e.target.value)}>
                {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Control ID *</label>
              <input className="form-input" value={form.control_id} onChange={(e) => set('control_id', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Domain</label>
              <input className="form-input" value={form.domain} onChange={(e) => set('domain', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Control Title *</label>
              <input className="form-input" value={form.control_title} onChange={(e) => set('control_title', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Sort Order</label>
              <input type="number" className="form-input" value={form.sort_order} onChange={(e) => set('sort_order', parseInt(e.target.value) || 0)} />
            </div>
            <label className="flex items-end gap-2 text-sm text-slate-700 pb-2">
              <input type="checkbox" checked={!!form.active} onChange={(e) => set('active', e.target.checked)} /> Active
            </label>
          </div>

          <RichTextField label="Requirement Text" value={form.requirement_text} onChange={(v) => set('requirement_text', v)} />
          <RichTextField label="Plain-English Summary" value={form.plain_english_summary} onChange={(v) => set('plain_english_summary', v)} />
          <TagListField label="Assessment Objectives" values={form.assessment_objectives} onChange={(v) => set('assessment_objectives', v)} placeholder="Add an objective…" />
          <RichTextField label="Example Implementation" value={form.example_implementation} onChange={(v) => set('example_implementation', v)} />
          <RichTextField label="Example Evidence" value={form.example_evidence} onChange={(v) => set('example_evidence', v)} />
          <TagListField label="Related Policy Templates" values={form.related_policy_templates} onChange={(v) => set('related_policy_templates', v)} placeholder="Add a template…" />
          <RichTextField label="SSP Statement Starter" value={form.ssp_statement_starter} onChange={(v) => set('ssp_statement_starter', v)} />
          <RichTextField label="POA&M Gap Starter" value={form.poam_gap_starter} onChange={(v) => set('poam_gap_starter', v)} />
        </div>
        <div className="flex justify-between gap-2 px-5 py-3 border-t border-slate-200 sticky bottom-0 bg-white">
          <div>
            {existing && (
              <button onClick={remove} disabled={saving} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-red-700 bg-red-50 hover:bg-red-100">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 bg-slate-100">Cancel</button>
            <button onClick={save} disabled={saving || !form.control_id.trim() || !form.control_title.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] disabled:opacity-60">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Control
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}