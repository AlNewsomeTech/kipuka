import { BookOpen, Wrench, Camera, Upload, CheckCircle2, FileText, ShieldCheck, FolderOpen } from 'lucide-react';

const STEPS = [
  { label: 'Understand', icon: BookOpen, done: true },
  { label: 'Do', icon: Wrench, done: true },
  { label: 'Capture', icon: Camera, active: true },
  { label: 'Upload', icon: Upload },
  { label: 'Verify', icon: CheckCircle2 },
];

// A faithful, hand-built recreation of the Kipuka guided-control interface,
// rendered with neutral demonstration data only. Purely decorative.
export default function HeroMockup() {
  return (
    <div role="img" aria-label="Preview of the Kipuka guided control workflow showing the Understand, Do, Capture, Upload, and Verify steps with supporting readiness cards" className="w-full">
      <div aria-hidden="true" className="overflow-hidden rounded-2xl border border-[#24385a] bg-[#0b1626] shadow-[0_24px_60px_rgba(2,8,20,0.6)]">
        {/* Browser chrome */}
        <div className="flex items-center gap-2 border-b border-[#1c2c44] bg-[#0d1a2e] px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#2a3d5c]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#2a3d5c]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#2a3d5c]" />
          <div className="ml-3 flex-1 rounded-md bg-[#121f36] px-3 py-1 text-[11px] text-[#8296b0]">
            app.kipuka — Guided Implementation
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {/* Guided stepper */}
          <div className="flex items-center justify-between gap-1">
            {STEPS.map((step, i) => (
              <div key={step.label} className="flex flex-1 items-center">
                <div className="flex flex-col items-center gap-1.5 text-center">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                      step.done
                        ? 'border-[#479dcf] bg-[#479dcf]/20 text-[#67d1f0]'
                        : step.active
                          ? 'border-[#67d1f0] bg-[#67d1f0]/15 text-[#67d1f0] ring-2 ring-[#67d1f0]/30'
                          : 'border-[#2a3d5c] text-[#64789a]'
                    }`}
                  >
                    <step.icon className="h-3.5 w-3.5" />
                  </span>
                  <span className={`text-[10px] font-bold ${step.active || step.done ? 'text-[#cfe4f5]' : 'text-[#64789a]'}`}>
                    {step.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`mx-1 h-px flex-1 ${step.done ? 'bg-[#479dcf]/60' : 'bg-[#22344f]'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Control card */}
          <div className="mt-4 rounded-xl border border-[#22344f] bg-[#0d1a2e] p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-md bg-[#479dcf]/15 px-2 py-0.5 text-[10px] font-bold tracking-wide text-[#67d1f0]">
                AC.L2-3.1.1
              </span>
              <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                Capture in progress
              </span>
            </div>
            <p className="mt-2 text-sm font-bold text-white">Limit system access to authorized users</p>
            <p className="mt-1 text-xs leading-relaxed text-[#8fa3bd]">
              Capture the user access listing with account names, status, and the
              date visible. Save it using the standard evidence file name.
            </p>
            <div className="mt-3 space-y-1.5">
              {['Open the admin center and sign in', 'Export the active user list', 'Confirm status column is visible'].map((line, i) => (
                <div key={line} className="flex items-center gap-2 text-[11px] text-[#b9c8dc]">
                  <span className={`h-3.5 w-3.5 rounded-sm border ${i < 2 ? 'border-[#479dcf] bg-[#479dcf]/30' : 'border-[#2a3d5c]'}`} />
                  {line}
                </div>
              ))}
            </div>
          </div>

          {/* Supporting dashboard cards */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { icon: ShieldCheck, label: 'Implementation', note: 'In progress' },
              { icon: FolderOpen, label: 'Evidence', note: 'Under review' },
              { icon: FileText, label: 'Documentation', note: 'Drafting' },
            ].map((card) => (
              <div key={card.label} className="rounded-xl border border-[#22344f] bg-[#0d1a2e] p-3">
                <card.icon className="h-4 w-4 text-[#67d1f0]" />
                <p className="mt-1.5 text-[11px] font-bold text-white">{card.label}</p>
                <p className="text-[10px] text-[#8296b0]">{card.note}</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#1a2942]">
                  <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-[#479dcf] to-[#67d1f0]" />
                </div>
              </div>
            ))}
          </div>

          <p className="mt-3 text-center text-[10px] text-[#64789a]">Demonstration data shown for illustration.</p>
        </div>
      </div>
    </div>
  );
}