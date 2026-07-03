import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { FOOTER_WARNING_TEXT } from '@/lib/termsContent';

// Confidentiality / proprietary-system notice shown at the bottom of every page.
export default function ConfidentialityFooter({ text }) {
  return (
    <footer className="mt-10 border-t border-slate-200 bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed text-slate-600">
            {text || FOOTER_WARNING_TEXT}
          </p>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
          <span>© {new Date().getFullYear()} Pacific Global Security Group</span>
          <span className="text-slate-300">•</span>
          <Link to="/terms-and-conditions" className="font-medium text-slate-600 hover:text-slate-900 hover:underline">
            Terms and Conditions
          </Link>
        </div>
      </div>
    </footer>
  );
}