import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { DEFAULT_TERMS_TITLE, TERMS_SUBTITLE, TERMS_SECTIONS, TERMS_LEGAL_DISCLAIMER } from '@/lib/termsContent';

// Public, read-only Terms and Conditions page for landing-page visitors.
// Reuses the app's central legal content source — no invented legal terms.
export default function PublicTerms() {
  return (
    <div className="min-h-screen bg-[#060c18] font-body text-white">
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 rounded-lg text-sm font-bold text-[#67d1f0] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#67d1f0]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Kipuka
        </Link>
        <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-white">{DEFAULT_TERMS_TITLE}</h1>
        <p className="mt-1 text-sm text-[#8fa3bd]">{TERMS_SUBTITLE}</p>

        <div className="mt-8 space-y-6">
          {TERMS_SECTIONS.map((section) => (
            <section key={section.heading}>
              <h2 className="text-base font-bold text-white">{section.heading}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-[#8fa3bd]">{section.body}</p>
            </section>
          ))}
        </div>

        <p className="mt-10 border-t border-[#1c2c44] pt-6 text-xs text-[#64789a]">{TERMS_LEGAL_DISCLAIMER}</p>
      </div>
    </div>
  );
}