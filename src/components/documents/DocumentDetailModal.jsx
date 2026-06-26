import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import ReactMarkdown from 'react-markdown';
import { X, Save, Download, FileWarning, AlertCircle, FileSearch, Eye, Settings } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';

const STATUSES = ['Draft', 'In Review', 'Changes Requested', 'Approved', 'Published', 'Archived'];
const PLACEHOLDER_REGEX = /\[([A-Z][A-Z_0-9]{2,})\]/g;

function findPlaceholders(text) {
  if (!text) return [];
  const m = text.match(PLACEHOLDER_REGEX);
  return m ? [...new Set(m.map(x => x.replace(/[\[\]]/g, '')))] : [];
}

export default function DocumentDetailModal({ doc, onClose, onSaved }) {
  const [form, setForm] = useState(doc);
  const [tab, setTab] = useState('preview');
  const [saving, setSaving] = useState(false);

  const phs = findPlaceholders(form.body_content);
  const hasPHs = phs.length > 0 && !form.placeholder_waived;
  const missing = (form.missing_source_data || '').split(' | ').filter(Boolean);
  const blockers = (form.readiness_blockers || '').split(' | ').filter(Boolean);

  const trySetStatus = (status) => {
    if (['In Review', 'Approved', 'Published'].includes(status) && hasPHs) {
      alert('Cannot move to ' + status + ': unresolved placeholders. Resolve or waive them first.');
      return;
    }
    if (['Approved', 'Published'].includes(status) && form.is_duplicate) {
      alert('Cannot approve: this document is flagged as a duplicate. Resolve the duplicate first.');
      return;
    }
    if (['Approved', 'Published'].includes(status) && form.client_mismatch_warning) {
      alert('Cannot approve: a possible client mismatch was detected. Review before approving.');
      return;
    }
    const patch = { status };
    if (status === 'Approved') { patch.approved_by = 'Reviewer'; patch.approval_date = new Date().toISOString().split('T')[0]; }
    setForm({ ...form, ...patch });
  };

  const save = async () => {
    setSaving(true);
    const edited = form.body_content !== doc.body_content;
    await base44.entities.GeneratedDocument.update(doc.id, {
      ...form,
      human_edited: doc.human_edited || edited,
      unresolved_placeholders: findPlaceholders(form.body_content).join(', '),
      unresolved_placeholders_count: findPlaceholders(form.body_content).length,
    });
    setSaving(false);
    onSaved();
  };

  const download = () => {
    const blob = new Blob([form.body_content || ''], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${form.title.replace(/[^a-zA-Z0-9]/g, '_')}.md`; a.click();
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: 'preview', label: 'Preview', icon: Eye },
    { id: 'traceability', label: 'Traceability', icon: FileSearch },
    { id: 'meta', label: 'Metadata & Status', icon: Settings },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-200 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{form.title}</h2>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={form.status} size="xs" />
              <span className="text-xs text-slate-400">v{form.version} • {form.cmmc_level} • {form.completeness_score}% complete</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={download} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"><Download className="w-4 h-4" /> Export</button>
            <button onClick={onClose} className="text-slate-400"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {(hasPHs || missing.length > 0 || form.is_duplicate || form.client_mismatch_warning) && (
          <div className="px-5 pt-4 space-y-2">
            {hasPHs && <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs text-orange-800 flex items-start gap-2"><FileWarning className="w-4 h-4 flex-shrink-0 mt-0.5" /><div><strong>{phs.length} unresolved placeholder(s):</strong> {phs.map(p => `[${p}]`).join(', ')} — resolve or waive before approval.</div></div>}
            {form.is_duplicate && <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs text-purple-800">⚠ Flagged as duplicate of an existing document.</div>}
            {form.client_mismatch_warning && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {form.client_mismatch_warning}</div>}
          </div>
        )}

        <div className="px-5 pt-4 border-b border-slate-200 flex gap-1">
          {tabs.map(t => { const Icon = t.icon; return (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 ${tab === t.id ? 'border-[#0F1E3C] text-[#0F1E3C]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><Icon className="w-4 h-4" /> {t.label}</button>
          ); })}
        </div>

        <div className="p-5">
          {tab === 'preview' && (
            <div className="space-y-3">
              <textarea className="form-input min-h-[300px] font-mono text-xs" value={form.body_content || ''} onChange={e => setForm({ ...form, body_content: e.target.value })} />
              <div className="bg-slate-50 rounded-lg p-4 prose prose-sm max-w-none border border-slate-200">
                <ReactMarkdown>{form.body_content || '_Empty_'}</ReactMarkdown>
              </div>
            </div>
          )}

          {tab === 'traceability' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <Info label="Source Entities" value={form.source_entities_used || '—'} />
                <Info label="Source Records Used" value={form.source_records_used ?? 0} />
                <Info label="Related Controls" value={form.related_controls || '—'} />
                <Info label="Related Evidence" value={form.related_evidence_count ?? 0} />
                <Info label="Related Screenshots" value={form.related_screenshot_count ?? 0} />
                <Info label="Related POA&M" value={form.related_poam_count ?? 0} />
                <Info label="Related Risks" value={form.related_risk_count ?? 0} />
                <Info label="Source Snapshot" value={form.generated_from_source_snapshot || '—'} />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-600 mb-1.5">Missing Source Data ({missing.length})</h4>
                {missing.length === 0 ? <p className="text-xs text-green-600">No missing source data.</p> : (
                  <ul className="space-y-1">{missing.map((m, i) => <li key={i} className="text-xs text-amber-700 flex items-start gap-1.5"><AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" /> {m}</li>)}</ul>
                )}
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-600 mb-1.5">Readiness Blockers ({blockers.length})</h4>
                {blockers.length === 0 ? <p className="text-xs text-green-600">No readiness blockers.</p> : (
                  <ul className="space-y-1">{blockers.map((b, i) => <li key={i} className="text-xs text-red-700">• {b}</li>)}</ul>
                )}
              </div>
            </div>
          )}

          {tab === 'meta' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div><label className="text-xs font-medium text-slate-600">Version</label><input className="form-input" value={form.version || ''} onChange={e => setForm({ ...form, version: e.target.value })} /></div>
                <div><label className="text-xs font-medium text-slate-600">Owner</label><input className="form-input" value={form.owner || ''} onChange={e => setForm({ ...form, owner: e.target.value })} /></div>
                <div><label className="text-xs font-medium text-slate-600">Status</label><select className="form-input" value={form.status} onChange={e => trySetStatus(e.target.value)}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
                <div><label className="text-xs font-medium text-slate-600">Reviewed By</label><input className="form-input" value={form.reviewed_by || ''} onChange={e => setForm({ ...form, reviewed_by: e.target.value })} /></div>
                <div><label className="text-xs font-medium text-slate-600">Approval Date</label><input type="date" className="form-input" value={form.approval_date || ''} onChange={e => setForm({ ...form, approval_date: e.target.value })} /></div>
                <div><label className="text-xs font-medium text-slate-600">Category</label><input className="form-input" value={form.document_category || ''} disabled /></div>
              </div>
              {phs.length > 0 && (
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer"><input type="checkbox" checked={form.placeholder_waived || false} onChange={e => setForm({ ...form, placeholder_waived: e.target.checked })} className="w-3.5 h-3.5 rounded" /> Waive placeholders</label>
                  {form.placeholder_waived && <input className="form-input flex-1 text-xs" placeholder="Waiver note (required)" value={form.placeholder_waiver_note || ''} onChange={e => setForm({ ...form, placeholder_waiver_note: e.target.value })} />}
                </div>
              )}
              {form.changelog && <div><label className="text-xs font-medium text-slate-600">Changelog</label><input className="form-input" value={form.changelog} disabled /></div>}
              <label className="flex items-center gap-1.5 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" checked={form.include_in_final_package || false} onChange={e => setForm({ ...form, include_in_final_package: e.target.checked })} className="w-4 h-4 rounded" /> Include in Final Package
                {form.final_package_required && <span className="text-[10px] text-blue-600 ml-1">(required for this level)</span>}
              </label>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 p-5 border-t border-slate-200 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 text-sm bg-[#0F1E3C] text-white rounded-lg hover:bg-[#1E2D4A] flex items-center gap-1.5"><Save className="w-3.5 h-3.5" /> Save</button>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100"><div className="text-[10px] text-slate-400 mb-0.5">{label}</div><div className="text-xs text-slate-700 break-words">{String(value)}</div></div>;
}