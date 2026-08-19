// One numbered runbook step, rendered as single-action lines (ASD-STE100).
// The stored step number never changes — extra sentences become indented
// lines under the same number so cross-references stay correct.
export default function StepInstruction({ number, instructions, children }) {
  const [first, ...rest] = instructions;

  return (
    <li className="flex gap-3 text-sm text-slate-700">
      <span className="w-5 h-5 rounded-full bg-[#0F1E3C] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
        {number}
      </span>
      <div className="min-w-0 flex-1">
        <div className="leading-relaxed">{first}</div>
        {rest.length > 0 && (
          <ul className="mt-1.5 space-y-1.5 border-l-2 border-slate-200 pl-3">
            {rest.map((line, i) => (
              <li key={i} className="leading-relaxed text-slate-600">{line}</li>
            ))}
          </ul>
        )}
        {children}
      </div>
    </li>
  );
}