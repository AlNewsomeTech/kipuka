import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const statuses = ['Not Started', 'In Progress', 'Evidence Needed', 'Ready for Review', 'Reviewed', 'Complete', 'Blocker'];

export default function BulkUpdateBar({ selectedIds, onClear, onApplied }) {
  const [status, setStatus] = useState('');
  const [owner, setOwner] = useState('');
  const [applying, setApplying] = useState(false);

  const handleApply = async () => {
    if (selectedIds.length === 0) return;
    const updates = {};
    if (status) updates.status = status;
    if (owner.trim()) updates.owner = owner.trim();
    if (Object.keys(updates).length === 0) return;

    setApplying(true);
    try {
      await base44.entities.DeploymentTask.bulkUpdate(
        selectedIds.map(id => ({ id, ...updates }))
      );
      setStatus('');
      setOwner('');
      onApplied();
    } catch (e) {
      alert('Bulk update failed: ' + e.message);
    }
    setApplying(false);
  };

  if (selectedIds.length === 0) return null;

  return (
    <div className="sticky bottom-4 z-40 bg-white border border-slate-200 rounded-xl shadow-lg p-3 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <span className="bg-[#0F1E3C] text-white text-xs font-bold px-2.5 py-1 rounded-full">{selectedIds.length} selected</span>
        <button onClick={onClear} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
      </div>
      <div className="flex items-center gap-2 flex-1 min-w-[200px]">
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          className="form-input flex-1"
        >
          <option value="">Change status…</option>
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input
          type="text"
          placeholder="Assign owner…"
          value={owner}
          onChange={e => setOwner(e.target.value)}
          className="form-input flex-1"
        />
        <button
          onClick={handleApply}
          disabled={applying || (!status && !owner.trim())}
          className="flex items-center gap-1.5 bg-[#0F1E3C] text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#1E2D4A] disabled:opacity-50 whitespace-nowrap"
        >
          {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {applying ? 'Applying…' : 'Apply to Selected'}
        </button>
      </div>
    </div>
  );
}