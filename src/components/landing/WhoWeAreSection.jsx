import { Compass, ListChecks, ShieldCheck } from 'lucide-react';
import Reveal from '@/components/landing/Reveal';

const AIMS = [
  {
    icon: Compass,
    title: 'Make requirements executable',
    body: 'Turn published security requirements into specific, ordered steps a technician can actually complete and record.',
  },
  {
    icon: ListChecks,
    title: 'Keep the record connected',
    body: 'Attach scope, policies, evidence, findings, and documentation to the requirement each one supports.',
  },
  {
    icon: ShieldCheck,
    title: 'Make readiness honest',
    body: 'Separate what is implemented from what is proven, and show plainly which gaps still remain.',
  },
];

export default function WhoWeAreSection() {
  return (
    <section id="about" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24" aria-labelledby="about-heading">
      <div className="grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
        <Reveal>
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#67d1f0]">Who we are</p>
          <h2 id="about-heading" className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
            We build the working layer between a CMMC requirement and a finished control.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-[#cfe4f5]">
            Acolyte is the CMMC readiness platform from Pacific Global Security Group. Our work sits
            where our customers already are: translating published security requirements into
            configurations, decisions, documentation, and evidence that hold up when an assessor
            asks for them.
          </p>
          <p className="mt-3 text-base leading-relaxed text-[#8fa3bd]">
            Organizations rarely struggle because they disagree with the requirements. They struggle
            because the work is spread across tickets, shared drives, screenshots, and individual
            memory. Acolyte brings that work into one project record, so implementation, proof, and
            readiness stay aligned as the environment changes.
          </p>
        </Reveal>

        <div className="space-y-3">
          {AIMS.map((aim, i) => (
            <Reveal key={aim.title} delay={i * 0.08}>
              <div className="flex h-full items-start gap-4 rounded-2xl border border-[#1e3050] bg-[#0b1626] p-5">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#479dcf]/12 text-[#67d1f0]">
                  <aim.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">{aim.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#8fa3bd]">{aim.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}