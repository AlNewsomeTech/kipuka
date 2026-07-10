import { useState } from 'react';
import { ShieldAlert, Server, CheckCircle2, Info } from 'lucide-react';
import { CUI_HOSTING, CUI_HOSTING_BANNER, CUI_HOSTING_OPTIONS } from '@/lib/cuiHosting';

// Reusable "Where will your CUI live?" decision UI.
// Controlled: parent owns `hosting` (enum) + `notes` (string) and gets updates via
// onChange(hosting, notes). Used by the onboarding wizard step and the dashboard banner modal.
export default function CuiHostingDecision({ hosting, notes, onChange, compact = false }) {
  const [local, setLocal] = useState(notes || '');

  const pick = (key) => onChange(key, key === CUI_HOSTING.OTHER ? local : (notes || ''));
  const setNotes = (v) => { setLocal(v); onChange(hosting || CUI_HOSTING.OTHER, v); };

  return (
    <div className="space-y-4">
      {/* Factual banner */}
      <div className="flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
        <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-[13px] leading-relaxed text-amber-800 font-medium">{CUI_HOSTING_BANNER}</p>
      </div>

      {!compact && (
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-[#0F1E3C] flex items-center justify-center flex-shrink-0">
            <Server className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Where will your CUI live?</h2>
            <p className="text-sm text-slate-500">Choose the compliant environment that will store, process, and transmit your CUI.</p>
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {CUI_HOSTING_OPTIONS.map((opt) => {
          const active = hosting === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => pick(opt.key)}
              className={`text-left rounded-xl border p-4 transition-colors ${active ? 'border-[#479dcf] bg-blue-50 ring-1 ring-[#479dcf]' : 'border-slate-200 bg-white hover:border-slate-300'}`}
            >
              <div className="flex items-start gap-2.5">
                <span className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${active ? 'border-[#479dcf] bg-[#479dcf]' : 'border-slate-300'}`}>
                  {active && <CheckCircle2 className="w-4 h-4 text-white" />}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-900">{opt.label}</span>
                    {opt.recommended && (
                      <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-green-100 text-green-700">Recommended</span>
                    )}
                    <span className="text-[11px] text-slate-400">{opt.tagline}</span>
                  </div>
                  <p className="text-[13px] text-slate-600 mt-1">{opt.summary}</p>
                  <ul className="mt-2 space-y-1">
                    {opt.bullets.map((b, i) => (
                      <li key={i} className="text-[12px] text-slate-500 flex gap-1.5"><span className="text-slate-300">•</span>{b}</li>
                    ))}
                  </ul>
                  {opt.partnerNote && (
                    <p className="mt-2 text-[12px] font-semibold text-[#3a86b3] bg-blue-50 border border-blue-100 rounded-md px-2.5 py-1.5">{opt.partnerNote}</p>
                  )}
                  {opt.needsNotes && active && (
                    <input
                      className="form-input mt-2.5"
                      placeholder="Name the FedRAMP Moderate+ environment (e.g. AWS GovCloud enclave, Google Assured Workloads…)"
                      value={local}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-slate-400 flex items-start gap-1.5">
        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        This choice defines the CUI authorization boundary in your SSP and scope statement. You can change it later in the project's Preliminary Scope module.
      </p>
    </div>
  );
}