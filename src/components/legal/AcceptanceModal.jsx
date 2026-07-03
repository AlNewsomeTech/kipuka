import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { ACCEPTANCE_CHECKBOX_TEXT } from '@/lib/termsContent';

// Required, non-dismissible authorized-use notice. Rendered as a full-screen
// overlay that blocks all app content until the user accepts or declines.
export default function AcceptanceModal({ title, body, onAccept, onDecline, submitting }) {
  const [checked, setChecked] = useState(false);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl my-8 shadow-2xl overflow-hidden">
        <div className="bg-[#0F1E3C] px-6 py-4 flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <h2 className="text-base font-bold text-white">{title}</h2>
        </div>

        <div className="px-6 py-5 max-h-[50vh] overflow-y-auto">
          {body.split('\n\n').map((para, i) => (
            <p key={i} className="text-sm leading-relaxed text-slate-700 mb-3 last:mb-0">
              {para}
            </p>
          ))}
          <Link
            to="/terms-and-conditions"
            target="_blank"
            className="inline-block mt-2 text-sm font-medium text-blue-600 hover:underline"
          >
            View Terms and Conditions
          </Link>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="w-4 h-4 rounded mt-0.5 flex-shrink-0"
            />
            <span className="text-[13px] leading-relaxed text-slate-700">{ACCEPTANCE_CHECKBOX_TEXT}</span>
          </label>

          <div className="flex flex-col sm:flex-row justify-end gap-2 mt-4">
            <button
              onClick={onDecline}
              disabled={submitting}
              className="px-5 py-2 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50"
            >
              Decline
            </button>
            <button
              onClick={onAccept}
              disabled={!checked || submitting}
              className="px-5 py-2 text-sm font-semibold text-white bg-[#0F1E3C] rounded-lg hover:bg-[#1E2D4A] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? 'Recording…' : 'I Accept'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}