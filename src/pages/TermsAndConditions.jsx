import { ShieldCheck } from 'lucide-react';
import { useTermsSettings } from '@/lib/useTermsSettings';
import {
  DEFAULT_TERMS_TITLE,
  TERMS_SUBTITLE,
  TERMS_SECTIONS,
  TERMS_LEGAL_DISCLAIMER,
} from '@/lib/termsContent';

export default function TermsAndConditions() {
  const { settings } = useTermsSettings();
  const title = settings?.terms_title || DEFAULT_TERMS_TITLE;
  const version = settings?.terms_version;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-[#0F1E3C] rounded-xl p-6 text-white">
        <div className="flex items-center gap-2.5 mb-2">
          <ShieldCheck className="w-6 h-6 text-amber-400" />
          <h1 className="text-2xl font-bold">{title}</h1>
        </div>
        <p className="text-sm text-white/70">{TERMS_SUBTITLE}</p>
        {version && <p className="text-xs text-white/50 mt-2">Version: {version}</p>}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 space-y-6">
        {TERMS_SECTIONS.map((s) => (
          <section key={s.heading}>
            <h2 className="text-base font-bold text-slate-900 mb-1.5">{s.heading}</h2>
            <p className="text-[15px] leading-relaxed text-slate-700">{s.body}</p>
          </section>
        ))}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-[13px] italic leading-relaxed text-amber-800">{TERMS_LEGAL_DISCLAIMER}</p>
      </div>
    </div>
  );
}