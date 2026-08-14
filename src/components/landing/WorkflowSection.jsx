import { BookOpen, Wrench, Camera, Upload, CheckCircle2 } from 'lucide-react';
import Reveal from '@/components/landing/Reveal';

const STAGES = [
  {
    icon: BookOpen,
    title: 'Understand',
    body: 'Explain the requirement in plain technical language and establish why it matters.',
  },
  {
    icon: Wrench,
    title: 'Do',
    body: 'Provide specific, ordered implementation steps and identify the setting or decision that must be recorded.',
  },
  {
    icon: Camera,
    title: 'Capture',
    body: 'Show technicians exactly what screen, export, configuration, or record must be captured, including what must remain visible.',
  },
  {
    icon: Upload,
    title: 'Upload',
    body: 'Upload and map the evidence without leaving the guided workflow.',
  },
  {
    icon: CheckCircle2,
    title: 'Verify',
    body: 'Review evidence quality, record findings, and determine whether the requirement is ready, needs work, or requires an applicability review.',
  },
];

export default function WorkflowSection() {
  return (
    <section id="how-it-works" className="border-y border-[#1c2c44] bg-[#0a1424]" aria-labelledby="workflow-heading">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 id="workflow-heading" className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            One guided path for every requirement.
          </h2>
        </Reveal>

        <ol className="mt-14 grid gap-6 md:grid-cols-5">
          {STAGES.map((stage, i) => (
            <Reveal key={stage.title} delay={i * 0.08}>
              <li className="relative flex h-full flex-col gap-3 rounded-2xl border border-[#1e3050] bg-[#0b1626] p-5 md:items-center md:text-center">
                <div className="flex items-center gap-3 md:flex-col">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#479dcf]/50 bg-[#479dcf]/12 text-[#67d1f0]">
                    <stage.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="flex items-center gap-2 md:flex-col md:gap-1">
                    <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#64789a]">Step {i + 1}</span>
                    <h3 className="text-base font-bold text-white">{stage.title}</h3>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-[#8fa3bd]">{stage.body}</p>
                {i < STAGES.length - 1 && (
                  <span aria-hidden="true" className="absolute -right-4 top-1/2 hidden h-px w-8 -translate-y-1/2 bg-[#2a3d5c] md:block" />
                )}
              </li>
            </Reveal>
          ))}
        </ol>

        <Reveal className="mx-auto mt-12 max-w-3xl rounded-2xl border border-[#1e3050] bg-[#0b1626] p-5">
          <div aria-hidden="true" className="flex items-center gap-3">
            <span className="rounded-md bg-[#479dcf]/15 px-2 py-1 text-[11px] font-bold text-[#67d1f0]">Guided control preview</span>
            <span className="text-[11px] text-[#64789a]">Kipuka guided walkthrough</span>
          </div>
          <div aria-hidden="true" className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-[#22344f] bg-[#0d1a2e] p-3">
              <p className="text-[11px] font-bold text-[#cfe4f5]">Why this matters</p>
              <p className="mt-1 text-[11px] leading-relaxed text-[#8296b0]">
                Only approved accounts should reach systems that store or handle sensitive information.
              </p>
            </div>
            <div className="rounded-xl border border-[#22344f] bg-[#0d1a2e] p-3">
              <p className="text-[11px] font-bold text-[#cfe4f5]">What to capture</p>
              <p className="mt-1 text-[11px] leading-relaxed text-[#8296b0]">
                The user access listing with account names, status, and capture date visible.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}