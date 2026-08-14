import { ShieldCheck } from 'lucide-react';
import Reveal from '@/components/landing/Reveal';

const ITEMS = [
  'Organization and client data separation',
  'Role-based access',
  'Reviewer separation on evidence decisions',
  'Private evidence storage',
  'Signed, time-limited evidence downloads',
  'Audit history of key actions',
  'File-integrity verification on managed evidence records',
  'Non-destructive archival workflows',
  'Controlled administrative actions',
];

export default function SecuritySection() {
  return (
    <section id="security" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28" aria-labelledby="security-heading">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 id="security-heading" className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Designed for sensitive readiness work.
        </h2>
        <p className="mt-4 text-base leading-relaxed text-[#8fa3bd]">
          Readiness records, evidence, and client data are handled with separation,
          review, and accountability built into the platform.
        </p>
      </Reveal>

      <ul className="mx-auto mt-12 grid max-w-4xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ITEMS.map((item, i) => (
          <Reveal key={item} delay={(i % 3) * 0.05}>
            <li className="flex h-full items-start gap-3 rounded-2xl border border-[#1e3050] bg-[#0b1626] p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#479dcf]" aria-hidden="true" />
              <span className="text-sm font-semibold leading-snug text-[#cfe4f5]">{item}</span>
            </li>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}