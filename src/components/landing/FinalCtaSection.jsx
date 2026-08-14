import { Info } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import Reveal from '@/components/landing/Reveal';

export default function FinalCtaSection({ onRequestDemo }) {
  const { navigateToLogin } = useAuth();

  return (
    <>
      {/* Professional disclaimer */}
      <section aria-label="Disclaimer" className="mx-auto max-w-4xl px-4 pb-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="flex items-start gap-3 rounded-2xl border border-[#1e3050] bg-[#0b1626] p-5">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-[#67d1f0]" aria-hidden="true" />
            <p className="text-sm leading-relaxed text-[#8fa3bd]">
              Kipuka supports CMMC implementation, documentation, evidence management, and
              assessment preparation. Use of the platform does not by itself establish
              compliance, guarantee a passing assessment, or replace an authorized C3PAO
              or other required assessor.
            </p>
          </div>
        </Reveal>
      </section>

      {/* Final CTA */}
      <section aria-labelledby="final-cta-heading" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-[#24385a] bg-gradient-to-br from-[#0d1a2e] to-[#0a1424] px-6 py-14 text-center sm:px-12">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-40"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 50% 0%, rgba(71,157,207,0.16), transparent 55%)',
              }}
            />
            <div className="relative">
              <h2 id="final-cta-heading" className="mx-auto max-w-2xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Give your technicians a clear path through CMMC.
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[#8fa3bd]">
                See how Kipuka can turn requirements into assigned work, documented
                implementation, reviewable evidence, and measurable readiness.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onRequestDemo}
                  className="rounded-xl bg-[#479dcf] px-6 py-3 text-sm font-bold text-[#04101f] transition-colors hover:bg-[#67d1f0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                >
                  Request a Demo
                </button>
                <button
                  type="button"
                  onClick={() => navigateToLogin()}
                  className="rounded-xl border border-[#2a3d5c] px-6 py-3 text-sm font-bold text-white transition-colors hover:border-[#479dcf] hover:bg-[#0d1a2e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#67d1f0]"
                >
                  Log In
                </button>
              </div>
              <p className="mt-5 text-xs font-semibold text-[#64789a]">
                Built for internal teams, MSPs, and CMMC implementation partners.
              </p>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}