import { useState, useEffect } from 'react';
import { Download, ClipboardList, Loader2, Info } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useClient } from '@/lib/clientContext';
import { loadProgressMap, mergeControl } from '@/lib/controlProgress';
import { buildJiraCsv, downloadCsv } from '@/lib/jiraCsv';
import EmptyState from '@/components/EmptyState';

const ISSUE_TYPES = ['Task', 'Story', 'Epic', 'Sub-task', 'Bug'];
const PRIORITIES = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];

export default function JiraExport() {
  const { selectedClientId, selectedClient } = useClient();
  const [controls, setControls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [form, setForm] = useState({
    projectKey: '',
    issueType: 'Task',
    priority: 'Medium',
    assignee: '',
    levelFilter: 'all',
    includeGuidance: true,
    includeEvidence: true,
  });

  useEffect(() => {
    setLoading(true);
    Promise.all([
      base44.entities.CMMCControl.list('-control_id', 200),
      loadProgressMap(selectedClientId),
    ])
      .then(([defs, progress]) => setControls(defs.map(c => mergeControl(c, progress[c.control_id]))))
      .catch(() => setControls([]))
      .finally(() => setLoading(false));
  }, [selectedClientId]);

  const update = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const selectedControls = controls.filter(c => form.levelFilter === 'all' || c.level === form.levelFilter);

  const handleExport = () => {
    setExporting(true);
    try {
      const csv = buildJiraCsv(selectedControls, form);
      const clientName = (selectedClient?.legal_name || 'CMMC').replace(/[^a-zA-Z0-9]+/g, '_');
      downloadCsv(csv, `${clientName}_Jira_Controls_${new Date().toISOString().slice(0, 10)}.csv`);
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-slate-200 border-t-[#0F1E3C] rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Export Controls to Jira</h1>
        <p className="text-[15px] text-slate-600 mt-1.5">Generate a Jira-import-ready CSV of your CMMC controls. Import it into any Jira board via <span className="font-medium">Project → Import issues → CSV</span>.</p>
      </div>

      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          No Jira connection required. This produces a standard CSV — Jira's built-in importer maps each column (Summary, Issue Type, Status, etc.) during import.
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-800">Export Configuration</h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Project Key" hint="e.g. CMMC">
            <input className="form-input" placeholder="CMMC" value={form.projectKey} onChange={e => update('projectKey', e.target.value.toUpperCase())} />
          </Field>
          <Field label="Assignee" hint="Jira username or email (optional)">
            <input className="form-input" placeholder="jane@company.com" value={form.assignee} onChange={e => update('assignee', e.target.value)} />
          </Field>
          <Field label="Issue Type">
            <select className="form-input" value={form.issueType} onChange={e => update('issueType', e.target.value)}>
              {ISSUE_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Priority">
            <select className="form-input" value={form.priority} onChange={e => update('priority', e.target.value)}>
              {PRIORITIES.map(p => <option key={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Controls to Include">
            <select className="form-input" value={form.levelFilter} onChange={e => update('levelFilter', e.target.value)}>
              <option value="all">All Levels</option>
              <option value="Level 1">Level 1 only</option>
              <option value="Level 2">Level 2 only</option>
            </select>
          </Field>
        </div>

        <div className="space-y-2 pt-1">
          <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
            <input type="checkbox" checked={form.includeGuidance} onChange={e => update('includeGuidance', e.target.checked)} className="w-4 h-4 rounded border-slate-300 accent-[#0F1E3C]" />
            Include implementation guidance in description
          </label>
          <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
            <input type="checkbox" checked={form.includeEvidence} onChange={e => update('includeEvidence', e.target.checked)} className="w-4 h-4 rounded border-slate-300 accent-[#0F1E3C]" />
            Include required evidence (screenshots, exports, policies) in description
          </label>
        </div>
      </div>

      <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-800">{selectedControls.length} controls ready to export</div>
            <div className="text-xs text-slate-500">Each becomes one Jira issue.</div>
          </div>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || selectedControls.length === 0}
          className="flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-lg bg-[#0F1E3C] text-white hover:bg-[#1E2D4A] disabled:opacity-50"
        >
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Download Jira CSV
        </button>
      </div>

      {selectedControls.length === 0 && (
        <EmptyState icon={ClipboardList} title="No controls to export" description="No controls match the selected level filter." />
      )}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-600 mb-1 block">{label}{hint && <span className="text-slate-400 font-normal ml-1">— {hint}</span>}</label>
      {children}
    </div>
  );
}