import { X, Loader2, Check } from 'lucide-react';

const STATUSES = ['Not Started', 'In Progress', 'Evidence Needed', 'Ready for Review', 'Reviewed', 'Complete'];

export default function ControlBulkBar({ count, onApply, onClear, saving }) {
  if (count === 0) return null;
  return (
    <div className="sticky top-2 z-30 flex flex-col sm:flex-row sm:items-center gap-3 bg-[#0F1E3C] text-white rounded-xl px-4 py-3 shadow-lg">
      <div className="flex items-center gap-2 text-[14px] font-semibold">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/20 text-[13px]">{count}</span>
        selected
      </div>
      <div className="flex items-center gap-2 sm:ml-auto">
        <span className="text-[13px] text-white/70 hidden sm:inline">Set status to</span>
        <select
          disabled={saving}
          defaultValue=""
          onChange={(e) => { if (e.target.value) { onApply(e.target.value); e.target.value = ''; } }}
          className="px-3 py-1.5 text-[14px] font-medium text-slate-800 rounded-lg border border-white/20 focus:outline-none disabled:opacity-60"
        >
          <option value="" disabled>Choose status…</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        <button onClick={onClear} disabled={saving} className="flex items-center gap-1 text-[13px] text-white/80 hover:text-white px-2 py-1.5 rounded-lg hover:bg-white/10 disabled:opacity-60">
          <X className="w-4 h-4" /> Clear
        </button>
      </div>
    </div>
  );
}

export { Check };