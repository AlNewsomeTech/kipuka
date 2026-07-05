import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { allPass } from '@/lib/readinessGate';

// Displays a list of readiness pre-check questions before final document generation.
// Advisory only — the parent decides whether to allow "Continue Anyway".
export default function ReadinessPrecheck({ title, checks, warning }) {
  const ready = allPass(checks);
  return (
    <div className={`rounded-xl border p-5 ${ready ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
      <div className="flex items-center gap-2 mb-3">
        {ready ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <AlertTriangle className="w-5 h-5 text-amber-600" />}
        <h3 className={`text-[15px] font-bold ${ready ? 'text-green-800' : 'text-amber-800'}`}>{title}</h3>
      </div>
      <ul className="space-y-1.5 mb-3">
        {checks.map((c) => (
          <li key={c.label} className="flex items-center gap-2 text-[13px]">
            {c.pass
              ? <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
              : <XCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />}
            <span className={c.pass ? 'text-slate-600' : 'text-amber-800 font-medium'}>{c.label}</span>
          </li>
        ))}
      </ul>
      {!ready && warning && (
        <p className="text-[13px] text-amber-800 leading-relaxed border-t border-amber-200 pt-3">{warning}</p>
      )}
    </div>
  );
}