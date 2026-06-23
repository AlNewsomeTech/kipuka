import { Info } from 'lucide-react';

export default function OverviewCard() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="bg-[#0F1E3C] px-5 py-4">
        <h2 className="text-lg font-bold text-white">PIEE / SPRS CMMC Self-Certification Walkthrough</h2>
        <p className="text-sm text-white/70 mt-1">Step-by-step guide for entering and affirming CMMC Level 1 and Level 2 self-assessments in SPRS.</p>
      </div>
      <div className="px-5 py-3 bg-amber-50 border-b border-amber-200 flex items-start gap-2">
        <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800">This guide is based on public DoD, SPRS, and PIEE resources. Clients must verify current requirements in PIEE/SPRS before submission.</p>
      </div>
    </div>
  );
}