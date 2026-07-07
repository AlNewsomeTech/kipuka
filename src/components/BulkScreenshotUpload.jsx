import { useState, useRef, useCallback } from 'react';
import { UploadCloud, Loader2, CheckCircle2, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function BulkScreenshotUpload({ clientId, controlId, relatedTask, onUploaded }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [results, setResults] = useState([]);
  const [note, setNote] = useState('');
  const inputRef = useRef(null);

  const handleFiles = useCallback(async (fileList) => {
    const files = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    if (files.length === 0 || !clientId || !controlId) return;

    setUploading(true);
    setProgress({ done: 0, total: files.length });
    setResults([]);

    const uploaded = [];
    for (const file of files) {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        await base44.entities.Screenshot.create({
          client_id: clientId,
          related_control: controlId,
          ...(relatedTask ? { related_task: relatedTask } : {}),
          ...(note.trim() ? { notes: note.trim() } : {}),
          file_url,
          file_name: file.name,
          actual_file_name: file.name,
          screenshot_date: new Date().toISOString().split('T')[0],
          evidence_type: 'Screenshot',
          level: 'Level 1',
        });
        uploaded.push({ name: file.name, ok: true });
      } catch (e) {
        uploaded.push({ name: file.name, ok: false, error: e.message });
      }
      setProgress(p => ({ ...p, done: p.done + 1 }));
    }

    setResults(uploaded);
    setUploading(false);
    setNote('');
    if (onUploaded) onUploaded();
  }, [clientId, controlId, relatedTask, note, onUploaded]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }, []);

  const onDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }, []);

  const clearResults = () => setResults([]);

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-slate-600 mb-1 block">Note (optional — applied to each screenshot in this upload)</label>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={uploading}
          placeholder="e.g. MFA enforcement policy shown enabled for all users"
          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white text-slate-800 disabled:opacity-60"
        />
      </div>
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          dragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50 hover:border-slate-400'
        } ${uploading ? 'opacity-60 pointer-events-none' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="text-sm font-medium text-slate-700">Uploading {progress.done} of {progress.total}…</p>
            <div className="w-full max-w-xs h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <UploadCloud className="w-8 h-8 text-slate-400" />
            <p className="text-sm font-medium text-slate-700">Drag & drop screenshots here</p>
            <p className="text-xs text-slate-400">or click to browse — multiple files supported</p>
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">Upload Results</span>
            <button onClick={clearResults} className="text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
          </div>
          {results.map((r, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              {r.ok ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <X className="w-3.5 h-3.5 text-red-500" />}
              <span className="flex-1 truncate text-slate-600">{r.name}</span>
              {!r.ok && <span className="text-red-500">{r.error}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}