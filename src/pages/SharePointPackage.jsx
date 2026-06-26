import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useClient } from '@/lib/clientContext';
import { EXPORT_MODES } from '@/lib/packageStructure';
import EmptyState from '@/components/EmptyState';
import FolderTree from '@/components/package/FolderTree';
import PackageFileList from '@/components/package/PackageFileList';
import PackageHistory from '@/components/package/PackageHistory';
import {
  FolderArchive, Loader2, Download, AlertCircle, AlertTriangle, CheckCircle2,
  RefreshCw, Package, ShieldAlert, Eye,
} from 'lucide-react';

const LEVELS = ['Level 1', 'Level 2 Ready', 'Level 2'];

export default function SharePointPackage() {
  const { selectedClient, selectedClientId } = useClient();
  const [level, setLevel] = useState('Level 1');
  const [exportMode, setExportMode] = useState('Ready-only');
  const [includeEmptyFolders, setIncludeEmptyFolders] = useState(false);
  const [includeArchive, setIncludeArchive] = useState(false);
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [exports, setExports] = useState([]);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (selectedClient?.target_cmmc_level) {
      setLevel(selectedClient.target_cmmc_level === 'Level 2' ? 'Level 2' : selectedClient.target_cmmc_level === 'Level 2 Ready' ? 'Level 2 Ready' : 'Level 1');
    }
  }, [selectedClient?.id]);

  const loadHistory = () => {
    if (!selectedClientId) return;
    base44.entities.PackageExport.filter({ client_id: selectedClientId }, '-generated_date').then(setExports).catch(() => setExports([]));
  };
  useEffect(loadHistory, [selectedClientId]);

  const runPreview = async () => {
    if (!selectedClientId) return;
    setLoadingPreview(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke('generatePackage', {
        client_id: selectedClientId, level, export_mode: exportMode,
        include_empty_folders: includeEmptyFolders, include_archive: includeArchive, preview_only: true,
      });
      setPreview(res.data);
    } catch (e) {
      setPreview(null);
    }
    setLoadingPreview(false);
  };

  useEffect(() => {
    if (selectedClientId) runPreview();
  }, [selectedClientId, level, exportMode, includeEmptyFolders, includeArchive]);

  const generate = async () => {
    if (!selectedClientId) return;
    setGenerating(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke('generatePackage', {
        client_id: selectedClientId, level, export_mode: exportMode,
        include_empty_folders: includeEmptyFolders, include_archive: includeArchive,
      });
      setResult(res.data);
      if (res.data?.zip_file_url) {
        window.open(res.data.zip_file_url, '_blank');
      }
      loadHistory();
    } catch (e) {
      setResult({ error: e.message });
    }
    setGenerating(false);
  };

  if (!selectedClient) return <EmptyState icon={FolderArchive} title="No client selected" description="Select a client to build a SharePoint-ready package export." />;

  const blockers = preview?.hard_blockers || [];
  const warnings = preview?.warnings || [];
  const readyOnlyBlocked = exportMode === 'Ready-only' && blockers.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">SharePoint Package Builder</h1>
          <p className="text-sm text-slate-500 mt-1">Generate a SharePoint-ready, assessor-friendly CMMC package — folders, indexes, README, and ZIP.</p>
        </div>
        <button onClick={runPreview} disabled={loadingPreview} className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-50">
          {loadingPreview ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Refresh Preview
        </button>
      </div>

      {/* Options */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-slate-600">Package Level</label>
            <div className="flex bg-slate-100 rounded-lg p-1 mt-1.5">
              {LEVELS.map(l => (
                <button key={l} onClick={() => setLevel(l)} className={`flex-1 text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${level === l ? 'bg-[#0F1E3C] text-white' : 'text-slate-600 hover:text-slate-800'}`}>{l}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Export Mode</label>
            <select value={exportMode} onChange={e => setExportMode(e.target.value)} className="form-input mt-1.5">
              {EXPORT_MODES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">{EXPORT_MODES.find(m => m.id === exportMode)?.desc}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-5 pt-1">
          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
            <input type="checkbox" checked={includeEmptyFolders} onChange={e => setIncludeEmptyFolders(e.target.checked)} className="rounded" /> Include empty folders
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
            <input type="checkbox" checked={includeArchive} onChange={e => setIncludeArchive(e.target.checked)} className="rounded" /> Include superseded / archived documents
          </label>
        </div>
      </div>

      {loadingPreview && !preview ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
      ) : preview ? (
        <>
          {/* Readiness summary */}
          <div className="grid md:grid-cols-4 gap-3">
            <SummaryCard label="Est. Files" value={preview.estimated_file_count} icon={Package} />
            <SummaryCard label="Folders" value={preview.folder_count} icon={FolderArchive} />
            <SummaryCard label="Readiness" value={`${preview.readiness_score}%`} icon={CheckCircle2} color={preview.readiness_score >= 70 ? 'green' : 'amber'} />
            <SummaryCard label="Blockers" value={blockers.length} icon={ShieldAlert} color={blockers.length ? 'red' : 'green'} />
          </div>

          {preview.draft_label && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span className="text-xs font-bold text-amber-800 font-mono">{preview.draft_label}</span>
            </div>
          )}

          {/* Blockers */}
          {blockers.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2"><AlertCircle className="w-4 h-4 text-red-600" /><p className="text-xs font-semibold text-red-800">Hard Blockers ({blockers.length})</p></div>
              <ul className="text-xs text-red-700 space-y-0.5 list-disc pl-5">{blockers.map((b, i) => <li key={i}>{b}</li>)}</ul>
              {exportMode === 'Ready-only' && <p className="text-[11px] text-red-600 mt-2">Ready-only export is blocked. Resolve these, or switch to Draft mode to export a working package.</p>}
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4 text-amber-600" /><p className="text-xs font-semibold text-amber-800">Warnings ({warnings.length})</p></div>
              <ul className="text-xs text-amber-700 space-y-0.5 list-disc pl-5">{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
            </div>
          )}

          {/* Delta */}
          {preview.delta?.last_export_date && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
              Last export: {preview.delta.last_export_date} ({preview.delta.prev_file_count} files). This package: {preview.delta.new_file_count} files
              ({preview.delta.difference >= 0 ? '+' : ''}{preview.delta.difference} difference).
            </div>
          )}

          {/* Preview: tree + files */}
          <div className="grid lg:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-1.5 mb-2"><Eye className="w-4 h-4 text-slate-500" /><h2 className="text-sm font-semibold text-slate-700">Folder Structure</h2></div>
              <FolderTree folders={preview.folder_tree} files={preview.files} rootName={preview.root_folder_name} />
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-2"><Eye className="w-4 h-4 text-slate-500" /><h2 className="text-sm font-semibold text-slate-700">Files</h2></div>
              <PackageFileList files={preview.files} />
            </div>
          </div>

          {/* Generate */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center justify-between flex-wrap gap-3">
            <div className="text-xs text-slate-500">
              {readyOnlyBlocked
                ? 'Resolve blockers or switch to Draft mode to generate.'
                : `Ready to generate a ${level} ${exportMode} package with ${preview.estimated_file_count} file(s).`}
            </div>
            <button onClick={generate} disabled={generating || readyOnlyBlocked} className="flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded-lg bg-[#0F1E3C] text-white hover:bg-[#1E2D4A] disabled:opacity-50">
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} {generating ? 'Generating ZIP...' : 'Generate & Download ZIP'}
            </button>
          </div>

          {result?.error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">Error: {result.error}</div>}
          {result?.zip_file_url && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2"><CheckCircle2 className="w-4 h-4 text-green-600" /><p className="text-xs font-semibold text-green-800">Package generated — {result.placed_file_count} file(s) placed</p></div>
              <div className="flex flex-wrap gap-2">
                <a href={result.zip_file_url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[#0F1E3C] text-white hover:bg-[#1E2D4A]">Download ZIP</a>
                <a href={result.readme_url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700">README</a>
                <a href={result.package_index_url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700">Package Index</a>
                <a href={result.changelog_url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700">Change Log</a>
              </div>
            </div>
          )}
        </>
      ) : (
        <EmptyState icon={FolderArchive} title="Could not build preview" description="Refresh the preview to try again." action={<button onClick={runPreview} className="text-sm text-blue-600 font-medium hover:underline">Refresh Preview →</button>} />
      )}

      <PackageHistory exports={exports} />
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, color = 'slate' }) {
  const colorMap = { slate: 'text-slate-600 bg-slate-100', green: 'text-green-600 bg-green-50', amber: 'text-amber-600 bg-amber-50', red: 'text-red-600 bg-red-50' };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-1.5"><div className={`w-7 h-7 rounded-lg ${colorMap[color]} flex items-center justify-center`}><Icon className="w-4 h-4" /></div><span className="text-xs font-medium text-slate-600">{label}</span></div>
      <div className="text-2xl font-bold text-slate-800">{value}</div>
    </div>
  );
}