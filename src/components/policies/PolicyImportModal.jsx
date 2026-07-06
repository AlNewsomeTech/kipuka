import { useState, useEffect, useCallback } from 'react';
import { X, Upload, Loader2, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { parseUploadedPolicyFiles, IMPORT_CATEGORIES, familyCodeForCategory } from '@/lib/policyImport';
import { countUnresolved } from '@/lib/mergeVariables';

// Shared importer. `mode`: 'master' (admin master library) or 'project' (org).
// onImported(count) fires after records are created.
export default function PolicyImportModal({ mode = 'master', project, org, currentUser, onClose, onImported }) {
  const [stage, setStage] = useState('upload'); // upload | review | saving
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState([]);
  const [controls, setControls] = useState([]);

  // Load ControlLibrary once for the mapped-control multi-select.
  useEffect(() => {
    base44.entities.ControlLibrary.filter({ active: true }, 'sort_order', 500)
      .then((rows) => setControls(rows))
      .catch(() => setControls([]));
  }, []);

  const handleFiles = useCallback(async (fileList) => {
    setError('');
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setParsing(true);
    try {
      const parsed = await parseUploadedPolicyFiles(files);
      if (!parsed.length) {
        setError('No .docx files were found in the upload. Upload one or more .docx files, or a .zip containing them.');
        setParsing(false);
        return;
      }
      setDrafts(parsed.map((d) => ({ ...d, category: 'Supplemental', mapped_control_ids: [] })));
      setStage('review');
    } catch (e) {
      setError('Could not read the file(s): ' + (e?.message || 'unknown error'));
    } finally {
      setParsing(false);
    }
  }, []);

  const update = (idx, patch) => setDrafts((prev) => prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)));

  const toggleControl = (idx, cid) => setDrafts((prev) => prev.map((d, i) => {
    if (i !== idx) return d;
    const has = d.mapped_control_ids.includes(cid);
    return { ...d, mapped_control_ids: has ? d.mapped_control_ids.filter((c) => c !== cid) : [...d.mapped_control_ids, cid] };
  }));

  const confirm = async () => {
    setStage('saving');
    const today = new Date().toISOString().slice(0, 10);
    const records = drafts.map((d) => {
      const base = {
        policy_name: d.policy_name,
        policy_category: d.category,
        mapped_control_ids: d.mapped_control_ids,
        policy_body: d.body,
        version: '1.0',
        approval_status: 'Template',
        family_code: familyCodeForCategory(d.category),
        doc_kind: /procedure/i.test(d.policy_name) ? 'Procedure' : 'Policy',
      };
      if (mode === 'master') {
        return { ...base, is_master_template: true, owner: 'Pac-Sec Master Library' };
      }
      return {
        ...base,
        is_master_template: false,
        organization_id: project?.organization_id || '',
        project_id: project?.id || '',
        owner: currentUser?.full_name || currentUser?.email || '',
        effective_date: today,
        approval_status: 'Draft',
      };
    });
    try {
      await base44.entities.PolicyTemplate.bulkCreate(records);
      onImported?.(records.length);
    } catch (e) {
      setError('Import failed: ' + (e?.message || 'unknown error'));
      setStage('review');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="border-b border-slate-200 px-5 py-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Upload className="w-4 h-4 text-brand" />
            Import Policy Templates {mode === 'master' ? '(Master Library)' : '(This Project)'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 overflow-y-auto">
          {error && (
            <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {error}
            </div>
          )}

          {stage === 'upload' && (
            <label className="block border-2 border-dashed border-slate-300 rounded-xl p-10 text-center cursor-pointer hover:border-brand transition-colors">
              <input type="file" multiple accept=".docx,.zip" className="hidden"
                onChange={(e) => handleFiles(e.target.files)} disabled={parsing} />
              {parsing ? (
                <div className="flex flex-col items-center gap-2 text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin" /> Reading documents…
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-8 h-8 text-slate-400" />
                  <div className="text-sm font-semibold text-slate-700">Upload .docx files or a .zip of .docx files</div>
                  <div className="text-xs text-slate-400">Every &lt;Company Name&gt; placeholder becomes {'{{company_name}}'} automatically.</div>
                </div>
              )}
            </label>
          )}

          {stage === 'review' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                Review each policy below. Set its family/category and map the CMMC controls it supports.
                Imported documents are saved as {mode === 'master' ? 'master templates' : 'project drafts marked Needs Review'}.
              </p>
              {drafts.map((d, idx) => {
                const unresolved = countUnresolved(d.body);
                return (
                  <div key={idx} className="border border-slate-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <input value={d.policy_name} onChange={(e) => update(idx, { policy_name: e.target.value })}
                        className="form-input text-sm font-semibold flex-1" />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Category / Family</label>
                        <select value={d.category} onChange={(e) => update(idx, { category: e.target.value })} className="form-input text-sm">
                          {IMPORT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                          Mapped Controls ({d.mapped_control_ids.length})
                        </label>
                        <div className="border border-slate-200 rounded-lg max-h-24 overflow-y-auto p-1.5">
                          {controls.length === 0 ? (
                            <p className="text-xs text-slate-400 px-1">Control library not loaded.</p>
                          ) : controls.map((c) => (
                            <label key={c.id} className="flex items-center gap-1.5 px-1 py-0.5 text-xs text-slate-600 cursor-pointer hover:bg-slate-50 rounded">
                              <input type="checkbox" checked={d.mapped_control_ids.includes(c.control_id)}
                                onChange={() => toggleControl(idx, c.control_id)} className="w-3.5 h-3.5" />
                              <span className="font-mono">{c.control_id}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                    {unresolved.length > 0 && (
                      <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                        {unresolved.length} merge variable(s) will resolve on use: {unresolved.map((u) => `{{${u}}}`).join(', ')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {stage === 'saving' && (
            <div className="flex flex-col items-center gap-2 py-10 text-slate-500">
              <Loader2 className="w-6 h-6 animate-spin" /> Importing {drafts.length} document(s)…
            </div>
          )}
        </div>

        {stage === 'review' && (
          <div className="border-t border-slate-200 px-5 py-3 flex justify-between items-center">
            <button onClick={() => { setStage('upload'); setDrafts([]); }} className="text-sm text-slate-500 hover:text-slate-700">← Upload different files</button>
            <button onClick={confirm}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-brand">
              <CheckCircle2 className="w-4 h-4" /> Import {drafts.length} Policy Template(s)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}