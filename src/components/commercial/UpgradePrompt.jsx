import { Lock, Sparkles, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

// Shown in place of a locked premium feature. Read-only, no payment processing.
export default function UpgradePrompt({ feature, description, tierNeeded = 'Premium L2 Readiness' }) {
  return (
    <div className="bg-white rounded-xl border-2 border-dashed border-purple-200 p-8 text-center">
      <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center mx-auto mb-3">
        <Lock className="w-6 h-6 text-purple-500" />
      </div>
      <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-purple-700 bg-purple-100 rounded-full px-2.5 py-0.5 mb-2">
        <Sparkles className="w-3 h-3" /> Available in {tierNeeded}
      </div>
      <h3 className="text-base font-bold text-slate-800">{feature}</h3>
      {description && <p className="text-sm text-slate-500 mt-1.5 max-w-md mx-auto">{description}</p>}
      <div className="flex items-center justify-center gap-2 mt-5">
        <Link to="/help/contact" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52]">
          <Mail className="w-4 h-4" /> Contact Pac-Sec to Upgrade
        </Link>
        <Link to="/org-settings" className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200">
          View Plan
        </Link>
      </div>
    </div>
  );
}