import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import HeroMockup from '@/components/landing/HeroMockup';
import Reveal from '@/components/landing/Reveal';

const CAPABILITY_STRIP = [
  'Guided Implementation',
  'Evidence Management',
  'Policy Workflows',
  'SSP and POA&M',
  'Assessment Readiness',
];

export default function HeroSection({ onRequestDemo }) {
  const { navigateToLogin } = useAuth();

  return (
    <section id="top" className="relative overflow-hidden">
      {/* Subtle contour/grid background */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(71,157,207,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(71,157,207,0.06) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />
        <div className="absolute -top-40 right-0 h-[32rem] w-[32rem] rounded-full bg-[#479dcf]/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-16 sm:px-6 lg:grid-cols-2 lg:gap-10 lg:px-8 lg:pb-24 lg:pt-24">
        <div>
          <Reveal>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#67d1f0]">
              Guided CMMC Implementation
            </p>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
              CMMC implementation, <span className="text-[#67d1f0]">made executable.</span>
            </h1>
            <p className="mt-5 text-lg font-semibold leading-relaxed text-[#cfe4f5]">
              Kipuka turns CMMC Level 2 readiness into a guided, step-by-step workflow
              for the technicians responsible for getting it done.
            </p>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-[#8fa3bd]">
              Move from scope and implementation through policies, evidence, POA&Ms,
              SSP development, and assessment readiness in one connected workspace.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
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
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-bold text-[#67d1f0] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#67d1f0]"
              >
                See How Kipuka Works
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.15}>
          <HeroMockup />
        </Reveal>
      </div>

      {/* Capability strip */}
      <div className="relative border-y border-[#1c2c44] bg-[#0a1424]">
        <ul className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-2 px-4 py-4 sm:px-6 lg:px-8" aria-label="Core capabilities">
          {CAPABILITY_STRIP.map((item) => (
            <li key={item} className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8fa3bd]">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#479dcf]" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}