import { Map, ListChecks, FileText, FolderOpen, AlertTriangle, ClipboardCheck } from 'lucide-react';
import Reveal from '@/components/landing/Reveal';

const STAGES = [
  {
    icon: Map,
    title: 'Scope the Environment',
    body: 'Identify CUI boundaries, systems, users, providers, locations, and shared responsibilities.',
  },
  {
    icon: ListChecks,
    title: 'Implement the Requirements',
    body: 'Work through prioritized, technician-ready implementation guides.',
  },
  {
    icon: FileText,
    title: 'Create the Documentation',
    body: 'Develop policies, procedures, inventories, diagrams, responsibility records, and system documentation.',
  },
  {
    icon: FolderOpen,
    title: 'Capture and Review Evidence',
    body: 'Collect evidence using control-specific instructions and review multiple quality criteria in one save action.',
  },
  {
    icon: AlertTriangle,
    title: 'Resolve Gaps',
    body: 'Create and manage POA&M items with ownership, risk, deadlines, and remediation evidence.',
  },
  {
    icon: ClipboardCheck,
    title: 'Prepare for Assessment',
    body: 'Build the SSP, evidence package, status report, SPRS records, and mock-assessment results.',
  },
];

export default function ReadinessSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28" aria-labelledby="readiness-heading">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 id="readiness-heading" className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          From initial scope to assessment readiness.
        </h2>
      </Reveal>

      <ol className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {STAGES.map((stage, i) => (
          <Reveal key={stage.title} delay={(i % 3) * 0.08}>
            <li className="flex h-full gap-4 rounded-2xl border border-[#1e3050] bg-[#0b1626] p-5">
              <div className="flex flex-col items-center">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#479dcf]/12 text-[#67d1f0]">
                  <stage.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span aria-hidden="true" className="mt-2 w-px flex-1 bg-[#22344f]" />
              </div>
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#64789a]">Stage {i + 1}</span>
                <h3 className="mt-0.5 text-base font-bold text-white">{stage.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[#8fa3bd]">{stage.body}</p>
              </div>
            </li>
          </Reveal>
        ))}
      </ol>

      <Reveal className="mt-10 text-center">
        <p className="text-sm font-bold text-[#cfe4f5]">
          Every stage reads from the same project, control, evidence, and documentation record.
        </p>
      </Reveal>
    </section>
  );
}