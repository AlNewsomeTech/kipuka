import { Lock, FileText, FileCheck2, ScrollText, ShieldCheck, ListChecks, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

// Shown at the L1 Essentials "Generate my documents" moment. Previews the
// document package that L1 Complete unlocks. Copy is about PLATFORM capability
// (the platform generates these documents) — it references the typical cost of
// buying equivalent prepared documents, not any Pac-Sec managed service.
const PACKAGE_ITEMS = [
  { icon: FileText, label: 'System Security Plan (SSP)', note: 'Auto-assembled from your control responses' },
  { icon: ScrollText, label: 'Policies & Procedures set', note: 'Per NIST 800-171 family' },
  { icon: ListChecks, label: 'POA&M workbook', note: 'Gaps with milestones' },
  { icon: ShieldCheck, label: 'Evidence index', note: 'Mapped to controls' },
  { icon: FileCheck2, label: 'Readiness / gap report', note: 'Executive summary' },
];

export default function DocPackagePreviewLock() {
  return (
    <div className="bg-white rounded-xl border-2 border-dashed border-purple-200 overflow-hidden">
      <div className="bg-gradient-to-br from-[#0F1E3C] to-[#1E3A5F] px-6 py-5 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Lock className="w-5 h-5 text-purple-200" />
          <h3 className="text-lg font-bold">Your document package is ready to generate</h3>
        </div>
        <p className="text-sm text-blue-100 max-w-2xl">
          Document generation is included in <b>L1 Complete</b>. Upgrade your plan and the platform
          generates and exports this full package for you — no manual drafting.
        </p>
      </div>

      <div className="p-6">
        <div className="grid sm:grid-cols-2 gap-3">
          {PACKAGE_ITEMS.map((it) => {
            const Icon = it.icon;
            return (
              <div key={it.label} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 opacity-90">
                <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-[#0F1E3C]" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-800">{it.label}</div>
                  <div className="text-xs text-slate-500">{it.note}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 rounded-lg bg-purple-50 border border-purple-200 px-4 py-3">
          <p className="text-sm text-purple-900">
            Buying equivalent prepared compliance documents typically runs
            <b> $8,000–$15,000</b>. Upgrading to <b>L1 Complete</b> includes generating and exporting
            them from the data you have already entered.
          </p>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Link to="/help/contact" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52]">
            <Mail className="w-4 h-4" /> Upgrade to L1 Complete
          </Link>
          <Link to="/org-settings" className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200">
            View current plan
          </Link>
        </div>
      </div>
    </div>
  );
}