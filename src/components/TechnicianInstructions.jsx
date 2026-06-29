import { ExternalLink, FolderArchive, Camera, FileCheck2, MonitorSmartphone, FileText, ClipboardCheck, BookOpen } from 'lucide-react';

const basePortals = [
  { key: 'm365_evidence', label: 'Microsoft 365 Admin Center', url: 'https://admin.microsoft.com' },
  { key: 'sharepoint_evidence', label: 'SharePoint Admin Center', url: 'https://admin.microsoft.com/sharepoint' },
  { key: 'entra_evidence', label: 'Entra ID Portal', url: 'https://entra.microsoft.com' },
  { key: 'exchange_evidence', label: 'Exchange Admin Center', url: 'https://admin.exchange.microsoft.com' },
  { key: 'physical_evidence', label: 'Physical Security (On-Site)', url: null },
];

const optionalPortals = {
  ninjaone: { key: 'ninjaone_evidence', label: 'NinjaOne Dashboard', url: 'https://app.ninjaone.com' },
  cortex_xdr: { key: 'cortex_xdr_evidence', label: 'Palo Alto Cortex XDR', url: 'https://xdr.paloaltonetworks.com' },
};

const splitSteps = (text) => {
  if (!text) return [];
  return text.split('\n').map(s => s.trim()).filter(Boolean);
};

export default function TechnicianInstructions({ control, clientName, ninjaoneInScope = true, cortexXdrInScope = false }) {
  const sanitize = (str) => (str || '').replace(/[^a-zA-Z0-9]/g, '');
  const company = sanitize(clientName) || 'CompanyName';
  const levelCode = control.level === 'Level 1' ? 'L1' : control.level === 'Level 2' ? 'L2' : 'L3';
  const controlNumber = (control.control_id || '').split('-').pop() || 'Control';
  const namingPrefix = `${company}-CMMC-2.0-${levelCode}-${controlNumber}`;

  const adminPortals = [
    ...basePortals,
    ...(ninjaoneInScope ? [optionalPortals.ninjaone] : []),
    ...(cortexXdrInScope ? [optionalPortals.cortex_xdr] : []),
  ];
  const activePortals = adminPortals.filter(p => control[p.key] && control[p.key].trim() !== '' && control[p.key].trim() !== 'N/A for Level 1');
  const implSteps = splitSteps(control.implementation_guidance);
  const screenshotList = splitSteps(control.required_screenshots);
  const exportList = splitSteps(control.required_exports);
  const policyList = splitSteps(control.required_policies);
  const validationList = splitSteps(control.required_validation_steps);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="bg-[#0F1E3C] px-5 py-3 flex items-center gap-2">
        <MonitorSmartphone className="w-5 h-5 text-white" />
        <h3 className="text-[16px] font-bold text-white">Technician Step-by-Step Guide</h3>
      </div>
      <div className="p-5 space-y-5">

        {/* Step 1: What this control is about */}
        <Step number={1} icon={BookOpen} title="What This Control Means">
          <p className="text-[15px] text-slate-700 leading-[1.6]">{control.explanation || 'No explanation available — click Edit to add one.'}</p>
        </Step>

        {/* Step 2: Write the policy */}
        <Step number={2} icon={FileText} title="Write the Required Policy">
          {policyList.length === 0 ? (
            <p className="text-[14px] text-slate-500 italic">No specific policy listed for this control.</p>
          ) : (
            <div className="space-y-2">
              <p className="text-[14px] text-slate-600 leading-[1.55]">You need a written policy document for each of the following. Create it in the Document Library if it doesn't exist:</p>
              {policyList.map((p, i) => (
                <div key={i} className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                  <FileText className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <span className="text-[15px] text-amber-800 font-semibold">{p}</span>
                </div>
              ))}
            </div>
          )}
        </Step>

        {/* Step 3: Implement the control */}
        <Step number={3} icon={FileCheck2} title="Implement the Control — Do These Things">
          {implSteps.length === 0 ? (
            <p className="text-[14px] text-slate-500 italic">No implementation guidance recorded. Click Edit to add steps.</p>
          ) : (
            <div className="space-y-1.5">
              {implSteps.map((step, i) => {
                const isSubBullet = /^[-•]/.test(step);
                return (
                  <div key={i} className={isSubBullet ? 'pl-5 flex items-start gap-1.5' : 'flex items-start gap-2'}>
                    {!isSubBullet && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0 mt-2.5" />}
                    {isSubBullet && <span className="text-slate-400 flex-shrink-0 mt-0.5">•</span>}
                    <span className="text-[15px] text-slate-700 leading-[1.6]">{step}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Step>

        {/* Step 4: Go to each portal and capture evidence */}
        <Step number={4} icon={ExternalLink} title="Go to Each Admin Portal & Capture Evidence">
          {activePortals.length === 0 ? (
            <p className="text-[14px] text-slate-500 italic">No admin portals mapped for this control.</p>
          ) : (
            <div className="space-y-3">
              {activePortals.map((p, idx) => (
                <div key={p.key} className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-50 px-3 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded bg-blue-600 text-white flex items-center justify-center text-[12px] font-bold">{idx + 1}</span>
                      <span className="text-[15px] font-semibold text-slate-800">{p.label}</span>
                    </div>
                    {p.url && (
                      <a href={p.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[14px] text-blue-600 hover:underline font-semibold">
                        Open Portal <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                  <div className="px-3 py-3">
                    <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">What to do here:</p>
                    <p className="text-[15px] text-slate-700 leading-[1.55]">{control[p.key]}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Step>

        {/* Step 5: Take these specific screenshots */}
        <Step number={5} icon={Camera} title="Take These Exact Screenshots">
          {screenshotList.length === 0 ? (
            <p className="text-[14px] text-slate-500 italic">No specific screenshots listed.</p>
          ) : (
            <div className="space-y-1.5">
              {screenshotList.map((s, i) => (
                <div key={i} className="flex items-start gap-2 bg-slate-50 rounded-lg px-3 py-2.5">
                  <Camera className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  <span className="text-[15px] text-slate-700 leading-[1.5]">{s}</span>
                </div>
              ))}
            </div>
          )}
          {exportList.length > 0 && (
            <div className="mt-3">
              <p className="text-[12px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Also Export These:</p>
              <div className="space-y-1.5">
                {exportList.map((e, i) => (
                  <div key={i} className="flex items-start gap-2 bg-slate-50 rounded-lg px-3 py-2.5">
                    <FileText className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <span className="text-[15px] text-slate-700 leading-[1.5]">{e}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Step>

        {/* Step 6: Name your files */}
        <Step number={6} icon={FolderArchive} title="Name Each File Exactly Like This">
          <p className="text-[15px] text-slate-600 leading-[1.55] mb-2">Every screenshot and export must follow this naming pattern:</p>
          <div className="bg-slate-900 rounded-lg p-3 space-y-1.5">
            <div className="text-[10px] text-slate-400 uppercase tracking-wide">Pattern:</div>
            <div className="text-green-400 font-mono text-xs break-all">CompanyName-CMMC-2.0-L1/2/3-ControlNumber-##.png</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wide pt-1">Your files for this control:</div>
            {screenshotList.length > 0 ? screenshotList.map((_, i) => (
              <div key={i} className="text-green-400 font-mono text-xs break-all">{namingPrefix}-{String(i + 1).padStart(2, '0')}.png</div>
            )) : (
              <div className="text-green-400 font-mono text-xs break-all">{namingPrefix}-01.png</div>
            )}
          </div>
          <p className="text-[14px] text-slate-600 leading-[1.55] mt-2.5">
            Replace <span className="font-mono font-semibold">CompanyName</span> with the client's name (no spaces). <span className="font-mono font-semibold">L1/2/3</span> is the CMMC level. <span className="font-mono font-semibold">ControlNumber</span> is the number after the dash (e.g., 3.1.1). The last number goes up by 1 for each file (01, 02, 03…).
          </p>
        </Step>

        {/* Step 7: Upload to archive */}
        <Step number={7} icon={FolderArchive} title="Upload to the SharePoint Evidence Archive">
          <ol className="space-y-2">
            <li className="flex items-start gap-2"><span className="text-slate-400 mt-0.5">→</span><span className="text-[15px] text-slate-700 leading-[1.55]">Go to the client's SharePoint evidence archive site</span></li>
            <li className="flex items-start gap-2"><span className="text-slate-400 mt-0.5">→</span><span className="text-[15px] text-slate-700 leading-[1.55]">Navigate to the folder for control <span className="font-mono font-semibold">{control.control_id}</span></span></li>
            <li className="flex items-start gap-2"><span className="text-slate-400 mt-0.5">→</span><span className="text-[15px] text-slate-700 leading-[1.55]">Upload all screenshots and exports with the correct file names above</span></li>
            <li className="flex items-start gap-2"><span className="text-slate-400 mt-0.5">→</span><span className="text-[15px] text-slate-700 leading-[1.55]">Come back here and use the upload area below to log each file in the system</span></li>
          </ol>
        </Step>

        {/* Step 8: Validate */}
        <Step number={8} icon={ClipboardCheck} title="Validate — Check Off Each Item" last>
          {validationList.length === 0 ? (
            <p className="text-[14px] text-slate-500 italic">No validation steps listed.</p>
          ) : (
            <div className="space-y-1.5">
              {validationList.map((v, i) => (
                <label key={i} className="flex items-start gap-2.5 cursor-pointer">
                  <input type="checkbox" className="w-5 h-5 rounded border-slate-300 mt-0.5 flex-shrink-0" />
                  <span className="text-[15px] text-slate-700 leading-[1.5]">{v}</span>
                </label>
              ))}
            </div>
          )}
        </Step>

      </div>
    </div>
  );
}

function Step({ number, icon: Icon, title, children, last }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 rounded-full bg-[#0F1E3C] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">{number}</div>
        {!last && <div className="w-px flex-1 bg-slate-200 mt-1" />}
      </div>
      <div className="flex-1 pb-1">
        <h4 className="text-[16px] font-bold text-slate-900 flex items-center gap-2 mb-2.5">
          <Icon className="w-[18px] h-[18px] text-slate-500" /> {title}
        </h4>
        {children}
      </div>
    </div>
  );
}