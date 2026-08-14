import { Languages, Wrench, FileCheck2 } from 'lucide-react';
import Reveal from '@/components/landing/Reveal';

const PROBLEMS = [
  {
    icon: Languages,
    title: 'Interpretation',
    body: 'Teams lose time translating security requirements into technical tasks.',
  },
  {
    icon: Wrench,
    title: 'Execution',
    body: 'Generic instructions rarely explain exactly where to go, what to configure, or what decision to record.',
  },
  {
    icon: FileCheck2,
    title: 'Proof',
    body: 'Implementation is not complete until the organization can produce clear, current, and properly mapped evidence.',
  },
];

export default function ProblemSection() {
  return (
    <section id="platform" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28" aria-labelledby="problem-heading">
      <Reveal className="mx-auto max-w-3xl text-center">
        <h2 id="problem-heading" className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          CMMC tells you what must be protected. Kipuka helps your team execute the work.
        </h2>
        <p className="mt-5 text-base leading-relaxed text-[#8fa3bd]">
          CMMC readiness requires much more than checking boxes. Teams must define scope,
          configure systems, document decisions, collect defensible evidence, resolve gaps,
          and maintain a consistent record of implementation.
        </p>
      </Reveal>

      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {PROBLEMS.map((problem, i) => (
          <Reveal key={problem.title} delay={i * 0.08}>
            <div className="h-full rounded-2xl border border-[#1e3050] bg-[#0b1626] p-6 transition-transform duration-200 motion-safe:hover:-translate-y-1">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#479dcf]/12 text-[#67d1f0]">
                <problem.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-lg font-bold text-white">{problem.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#8fa3bd]">{problem.body}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal className="mt-10 text-center">
        <p className="text-base font-bold text-[#cfe4f5]">
          Kipuka connects the requirement, the work, the documentation, and the proof.
        </p>
      </Reveal>
    </section>
  );
}