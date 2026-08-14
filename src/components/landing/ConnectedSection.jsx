import Reveal from '@/components/landing/Reveal';

const NODES = [
  'Controls',
  'Policies',
  'Evidence',
  'Assets',
  'Scope',
  'POA&M',
  'SSP',
  'Security findings',
  'Assessment results',
];

export default function ConnectedSection() {
  return (
    <section className="border-y border-[#1c2c44] bg-[#0a1424]" aria-labelledby="connected-heading">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <Reveal className="mx-auto max-w-3xl text-center">
          <h2 id="connected-heading" className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            No more disconnected spreadsheets, folders, and implementation notes.
          </h2>
        </Reveal>

        <Reveal className="mt-14">
          <div
            role="img"
            aria-label="Diagram of a central Kipuka project connected to controls, policies, evidence, assets, scope, POA&M, SSP, security findings, and assessment results"
            className="mx-auto max-w-3xl"
          >
            <div aria-hidden="true" className="relative rounded-3xl border border-[#1e3050] bg-[#0b1626] p-6 sm:p-10">
              <div
                className="pointer-events-none absolute inset-0 rounded-3xl opacity-40"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 50% 50%, rgba(71,157,207,0.14), transparent 60%)',
                }}
              />
              <div className="relative flex flex-col items-center gap-6">
                <div className="rounded-2xl border border-[#479dcf]/60 bg-[#479dcf]/12 px-8 py-4 text-center shadow-[0_0_0_6px_rgba(71,157,207,0.06)]">
                  <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#67d1f0]">Kipuka</p>
                  <p className="text-lg font-extrabold text-white">Project Record</p>
                </div>
                <span className="h-6 w-px bg-[#2a3d5c]" />
                <ul className="flex flex-wrap justify-center gap-2.5">
                  {NODES.map((node) => (
                    <li
                      key={node}
                      className="rounded-full border border-[#22344f] bg-[#0d1a2e] px-4 py-2 text-xs font-bold text-[#b9c8dc]"
                    >
                      {node}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal className="mx-auto mt-10 max-w-3xl text-center">
          <p className="text-sm leading-relaxed text-[#8fa3bd]">
            A change in implementation should be reflected in the evidence, documentation,
            risk record, and readiness status. Kipuka keeps those records connected to the
            project and requirement they support.
          </p>
        </Reveal>
      </div>
    </section>
  );
}