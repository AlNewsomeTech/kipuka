import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, PlayCircle, Rocket, DollarSign, LifeBuoy, ArrowLeft } from 'lucide-react';
import { DEMO_TOUR_STEPS, DEMO_CTA } from '@/lib/demoData';

export default function ProductTourModal({ open, onClose, onExit }) {
  const [step, setStep] = useState(0);
  if (!open) return null;

  const total = DEMO_TOUR_STEPS.length;
  const atEnd = step >= total; // final CTA screen
  const pct = Math.round((Math.min(step + 1, total) / total) * 100);

  const cta = [
    { label: 'Create Real Customer Workspace', icon: Rocket, action: () => onExit('/saas-admin') },
    { label: 'View Pricing Tiers', icon: DollarSign, action: () => onExit('/org-settings') },
    { label: 'Contact Pac-Sec Support', icon: LifeBuoy, action: () => onExit('/help') },
    { label: 'Return to SaaS Admin', icon: ArrowLeft, action: () => onExit('/saas-admin') },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-[#0F1E3C]">
          <div className="flex items-center gap-2 text-white">
            <PlayCircle className="w-5 h-5" />
            <span className="font-bold text-sm">CMMC Command Center — Product Tour</span>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {!atEnd ? (
          <div className="p-6">
            <div className="h-1.5 bg-slate-100 rounded-full mb-5 overflow-hidden">
              <div className="h-full bg-blue-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              Step {step + 1} of {total}
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 font-bold flex items-center justify-center flex-shrink-0">
                {step + 1}
              </div>
              <p className="text-lg font-semibold text-slate-800 leading-snug pt-1">{DEMO_TOUR_STEPS[step]}</p>
            </div>

            <div className="flex items-center justify-between mt-8">
              <button
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 rounded-lg hover:bg-slate-100 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={() => setStep((s) => s + 1)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-[#0F1E3C] text-white rounded-lg hover:bg-[#1E2D4A]"
              >
                {step === total - 1 ? 'Finish' : 'Next'} <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <p className="text-base font-semibold text-slate-800 leading-relaxed mb-5">{DEMO_CTA}</p>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {cta.map((c) => {
                const Icon = c.icon;
                return (
                  <button
                    key={c.label}
                    onClick={c.action}
                    className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-white text-left"
                  >
                    <Icon className="w-4 h-4 text-[#0F1E3C] flex-shrink-0" /> {c.label}
                  </button>
                );
              })}
            </div>
            <button onClick={() => setStep(0)} className="mt-4 text-xs font-medium text-slate-400 hover:text-slate-600">
              Restart tour
            </button>
          </div>
        )}
      </div>
    </div>
  );
}