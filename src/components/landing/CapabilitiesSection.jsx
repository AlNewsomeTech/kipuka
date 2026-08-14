import { CheckCircle2 } from 'lucide-react';
import Reveal from '@/components/landing/Reveal';

const CAPABILITIES = [
  {
    title: 'Technician-Ready Control Guidance',
    copy: 'Replace vague compliance language with specific instructions that explain what to configure, where to find it, what decision to make, and what proof to retain.',
    bullets: [
      'Plain-language requirement explanations',
      'Ordered implementation instructions',
      'Tool-specific guidance',
      'Required settings and decisions',
      'Clear capture instructions',
    ],
    preview: { kicker: 'Guided Implementation', rows: ['Open the identity admin center', 'Enable the required sign-in policy', 'Record the enforcement decision'] },
  },
  {
    title: 'Evidence Vault and Review',
    copy: 'Keep evidence connected to the requirement it supports, with reviewer separation and a complete lifecycle history.',
    bullets: [
      'Control-mapped evidence',
      'Batch quality-check approval',
      'Rejection and revision workflows',
      'Expired and stale evidence tracking',
      'Exportable evidence index',
      'Immutable activity history',
    ],
    preview: { kicker: 'Evidence Review', rows: ['Access listing export — Needs Review', 'Sign-in policy record — Accepted', 'Endpoint configuration — Superseded'] },
  },
  {
    title: 'Policies and Documentation',
    copy: 'Build the documentation required to describe how the organization protects CUI and operates its security program.',
    bullets: [
      'Guided policy creation',
      'Approval and version workflows',
      'SSP development',
      'Inventories and scope records',
      'Network and data-flow documentation',
      'Shared-responsibility records',
    ],
    preview: { kicker: 'Document Library', rows: ['Access Control Policy — Draft v0.2', 'System Security Plan — In progress', 'Shared responsibility record — Review'] },
  },
  {
    title: 'Readiness and Gap Management',
    copy: 'See the difference between implementation progress and assessment readiness. Identify what is configured, what is proven, and what still needs work.',
    bullets: [
      'Implementation status',
      'Evidence readiness',
      'Requirement findings',
      'POA&M tracking',
      'Mock assessment',
      'SPRS and status-report support',
    ],
    preview: { kicker: 'Readiness View', rows: ['Implemented and proven', 'Implemented, evidence pending', 'Gap identified — POA&M open'] },
  },
  {
    title: 'ACOLYTE Security Operations',
    copy: 'Bring supporting security operations into the client readiness workspace.',
    bullets: [
      'Website vulnerability scanning',
      'Client-assigned findings',
      'Microsoft Secure Score exports',
      'Historical posture tracking',
      'Audit logging',
      'Remediation workflow',
    ],
    preview: { kicker: 'ACOLYTE Operations', rows: ['Website scan — Findings assigned', 'Secure Score import — Reviewed', 'Remediation item — In progress'] },
    footnote: 'Secure Score data and vulnerability scanning support the readiness picture — they do not by themselves demonstrate CMMC compliance.',
  },
];

function PreviewPanel({ preview }) {
  return (
    <div aria-hidden="true" className="rounded-2xl border border-[#24385a] bg-[#0b1626] p-4 shadow-[0_18px_44px_rgba(2,8,20,0.5)]">
      <div className="flex items-center justify-between">
        <span className="rounded-md bg-[#479dcf]/15 px-2 py-1 text-[11px] font-bold text-[#67d1f0]">{preview.kicker}</span>
        <span className="text-[10px] text-[#64789a]">Demonstration data</span>
      </div>
      <div className="mt-3 space-y-2">
        {preview.rows.map((row) => (
          <div key={row} className="flex items-center gap-2.5 rounded-xl border border-[#22344f] bg-[#0d1a2e] px-3 py-2.5">
            <span className="h-2 w-2 shrink-0 rounded-full bg-[#479dcf]" />
            <span className="text-xs font-semibold text-[#b9c8dc]">{row}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#1a2942]">
        <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-[#479dcf] to-[#67d1f0]" />
      </div>
    </div>
  );
}

export default function CapabilitiesSection() {
  return (
    <section id="capabilities" className="border-y border-[#1c2c44] bg-[#0a1424]" aria-labelledby="capabilities-heading">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 id="capabilities-heading" className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Platform capabilities
          </h2>
        </Reveal>

        <div className="mt-14 space-y-16 lg:space-y-20">
          {CAPABILITIES.map((cap, i) => (
            <Reveal key={cap.title}>
              <div className={`grid items-center gap-8 lg:grid-cols-2 lg:gap-14 ${i % 2 === 1 ? 'lg:[&>*:first-child]:order-2' : ''}`}>
                <div>
                  <h3 className="text-2xl font-extrabold tracking-tight text-white">{cap.title}</h3>
                  <p className="mt-3 text-base leading-relaxed text-[#8fa3bd]">{cap.copy}</p>
                  <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
                    {cap.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-2 text-sm font-semibold text-[#cfe4f5]">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#479dcf]" aria-hidden="true" />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                  {cap.footnote && (
                    <p className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/5 px-3.5 py-2.5 text-xs leading-relaxed text-amber-200/90">
                      {cap.footnote}
                    </p>
                  )}
                </div>
                <PreviewPanel preview={cap.preview} />
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}