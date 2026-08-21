// Human-readable CURRENT MICROSOFT CONFIGURATION vs PROPOSED KIPUKA
// CONFIGURATION comparison. No deployment happens without this screen.
export default function DeploymentDiff({ diff }) {
  const rows = (diff || []).filter((r) => r.kind !== 'same');
  const unchanged = (diff || []).length - rows.length;

  const fmt = (v) => {
    if (v === null || v === undefined) return '—';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  };

  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden">
      <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 bg-slate-100 px-3 py-2 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
        <span>Setting</span>
        <span>Current Microsoft configuration</span>
        <span>Proposed Kipuka configuration</span>
        <span>Change</span>
      </div>
      {rows.length === 0 ? (
        <div className="px-3 py-4 text-center text-xs text-slate-400">The tenant already matches the proposed configuration.</div>
      ) : rows.map((row) => (
        <div key={row.path} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 px-3 py-2 border-t border-slate-100 text-[12px]">
          <span className="font-mono font-semibold text-slate-700 break-all">{row.path}</span>
          <span className="text-slate-500 break-all">{fmt(row.current)}</span>
          <span className="text-slate-900 font-medium break-all">{fmt(row.proposed)}</span>
          <span className={`text-[10px] font-bold uppercase self-start px-1.5 py-0.5 rounded ${
            row.kind === 'add' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
          }`}>
            {row.kind === 'add' ? 'Added' : 'Changed'}
          </span>
        </div>
      ))}
      {unchanged > 0 && (
        <div className="px-3 py-1.5 border-t border-slate-100 text-[11px] text-slate-400">{unchanged} settings already match and will not change.</div>
      )}
    </div>
  );
}