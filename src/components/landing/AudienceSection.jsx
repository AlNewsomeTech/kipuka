import { UserCog, Building2, Users } from 'lucide-react';
import Reveal from '@/components/landing/Reveal';

const AUDIENCES = [
  {
    icon: UserCog,
    title: 'IT and Security Technicians',
    body: 'Follow concrete steps, capture the correct proof, and know what comes next.',
  },
  {
    icon: Building2,
    title: 'MSPs and Service Providers',
    body: 'Manage multiple clients, maintain separation, standardize delivery, and preserve client-specific evidence.',
  },
  {
    icon: Users,
    title: 'CMMC Readiness Teams',
    body: 'Coordinate scope, implementation, documentation, gap remediation, and assessment preparation in one workspace.',
  },
];

export default function AudienceSection() {
  return (
    <section id="who-its-for" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28" aria-labelledby="audience-heading">
      <Reveal className="mx-auto max-w-3xl text-center">
        <h2 id="audience-heading" className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Built for implementation teams, not just compliance specialists.
        </h2>
      </Reveal>

      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {AUDIENCES.map((audience, i) => (
          <Reveal key={audience.title} delay={i * 0.08}>
            <div className="h-full rounded-2xl border border-[#1e3050] bg-[#0b1626] p-6 transition-transform duration-200 motion-safe:hover:-translate-y-1">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#479dcf]/12 text-[#67d1f0]">
                <audience.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-lg font-bold text-white">{audience.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#8fa3bd]">{audience.body}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal className="mx-auto mt-10 max-w-3xl text-center">
        <p className="text-sm leading-relaxed text-[#8296b0]">
          Kipuka can work alongside consultants, assessors, security providers, and broader
          governance platforms. It organizes and documents implementation work without
          claiming to replace independent assessment or certification.
        </p>
      </Reveal>
    </section>
  );
}