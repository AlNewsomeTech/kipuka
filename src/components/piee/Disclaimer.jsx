import { AlertCircle } from 'lucide-react';

export default function Disclaimer() {
  return (
    <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
      <AlertCircle className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
      <p className="text-xs text-slate-500">This walkthrough is for operational guidance only. It does not replace official DoD, SPRS, PIEE, DFARS, CMMC Program, or legal requirements. Contractors remain responsible for validating all submissions and affirmations.</p>
    </div>
  );
}