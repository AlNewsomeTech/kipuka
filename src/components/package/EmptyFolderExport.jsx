import { useState } from 'react';
import JSZip from 'jszip';
import { FolderPlus, Loader2, Download } from 'lucide-react';
import { buildFolderTree, rootFolderName } from '@/lib/packageStructure';

// Exports the full, correctly-named folder structure as an empty ZIP the
// client/technician can drag straight into SharePoint. Uses the full Level 2
// tree so every family/policy/workpaper folder is present.
export default function EmptyFolderExport({ client }) {
  const [busy, setBusy] = useState(false);

  const folders = buildFolderTree({
    level: 'Level 2',
    cuiInScope: !!client?.cui_in_scope,
    includeEmptyFolders: true,
    includeArchive: true,
  });

  const dateStr = new Date().toISOString().slice(0, 10);
  const root = rootFolderName(client, 'Level 2', dateStr);

  const exportFolders = async () => {
    setBusy(true);
    try {
      const zip = new JSZip();
      const rootDir = zip.folder(root);
      folders.forEach((path) => {
        // .keep placeholder so empty folders survive zipping/SharePoint upload
        rootDir.folder(path).file('.keep', '');
      });
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${root}_EMPTY_STRUCTURE.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
            <FolderPlus className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Empty Folder Structure</h3>
            <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
              Download the complete, correctly-named CMMC Level 2 folder tree ({folders.length} folders) as an empty ZIP.
              Extract and drag it straight into the client's SharePoint document library to establish the standard structure.
            </p>
          </div>
        </div>
        <button
          onClick={exportFolders}
          disabled={busy}
          className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg bg-[#0F1E3C] text-white hover:bg-[#1E2D4A] disabled:opacity-50 flex-shrink-0"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Export Empty Folders
        </button>
      </div>
    </div>
  );
}