import { ExternalLink, FolderArchive, Camera, FileCheck2, MonitorSmartphone } from 'lucide-react';

const adminPortals = [
  { key: 'm365_evidence', label: 'Microsoft 365 Admin Center', url: 'https://admin.microsoft.com' },
  { key: 'sharepoint_evidence', label: 'SharePoint Admin Center', url: 'https://admin.microsoft.com/sharepoint' },
  { key: 'entra_evidence', label: 'Entra ID (Azure AD) Portal', url: 'https://entra.microsoft.com' },
  { key: 'exchange_evidence', label: 'Exchange Admin Center', url: 'https://admin.exchange.microsoft.com' },
  { key: 'ninjaone_evidence', label: 'NinjaOne Dashboard', url: 'https://app.ninjaone.com' },
  { key: 'physical_evidence', label: 'Physical Security (On-Site)', url: null },
];

export default function TechnicianInstructions({ control, clientName }) {
  const sanitize = (str) => (str || '').replace(/[^a-zA-Z0-9]/g, '');
  const company = sanitize(clientName) || 'CompanyName';
  const controlId = sanitize(control.control_id) || 'Control';
  const namingPrefix = `${company}-CMMC-2.0-${controlId}`;

  const activePortals = adminPortals.filter(p => control[p.key] && control[p.key].trim() !== '');
  const screenshots = control.required_screenshots
    ? control.required_screenshots.split('\n').filter(Boolean)
    : [];

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="bg-[#0F1E3C] px-5 py-3 flex items-center gap-2">
        <MonitorSmartphone className="w-4 h-4 text-white" />
        <h3 className="text-sm font-semibold text-white">Technician Implementation Guide</h3>
      </div>
      <div className="p-5 space-y-4">
        {/* Step 1: Admin Portal */}
        <Step number={1} icon={ExternalLink} title="Open the Admin Portal">
          {activePortals.length === 0 ? (
            <p className="text-xs text-slate-500">No specific admin portal mapped for this control. Check the evidence sections below for guidance.</p>
          ) : (
            <div className="space-y-1.5">
              {activePortals.map(p => (
                <div key={p.key} className="flex items-center justify-between gap-2 bg-slate-50 rounded-lg px-3 py-2">
                  <span className="text-xs text-slate-700 font-medium">{p.label}</span>
                  {p.url && (
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                      Open <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </Step>

        {/* Step 2: Implement */}
        <Step number={2} icon={FileCheck2} title="Implement the Control">
          {control.implementation_guidance ? (
            <p className="text-xs text-slate-600 whitespace-pre-wrap">{control.implementation_guidance}</p>
          ) : (
            <p className="text-xs text-slate-400">No implementation guidance recorded. Click Edit to add steps.</p>
          )}
        </Step>

        {/* Step 3: Screenshot */}
        <Step number={3} icon={Camera} title="Capture Evidence Screenshots">
          {screenshots.length === 0 ? (
            <p className="text-xs text-slate-400">No specific screenshots listed. Capture what proves the control is implemented.</p>
          ) : (
            <ul className="space-y-1">
              {screenshots.map((s, i) => (
                <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                  <span className="text-slate-300 mt-0.5">•</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          )}
        </Step>

        {/* Step 4: Naming Convention */}
        <Step number={4} icon={FolderArchive} title="Name Files & Upload to Archive">
          <p className="text-xs text-slate-600 mb-2">Use this exact naming convention for every evidence file:</p>
          <div className="bg-slate-900 text-green-400 font-mono text-xs px-3 py-2 rounded-lg break-all">
            {namingPrefix}-01.png
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Pattern: <span className="font-mono text-slate-700">CompanyName-CMMC-2.0-ControlID-##.ext</span>
            <br />
            Increment the two-digit number for each screenshot (01, 02, 03…). Upload to the client's SharePoint evidence archive under the folder for this control.
          </p>
        </Step>
      </div>
    </div>
  );
}

function Step({ number, icon: Icon, title, children }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">{number}</div>
        <div className="w-px flex-1 bg-slate-200 mt-1" />
      </div>
      <div className="flex-1 pb-1">
        <h4 className="text-xs font-semibold text-slate-800 flex items-center gap-1.5 mb-1.5">
          <Icon className="w-3.5 h-3.5 text-slate-500" /> {title}
        </h4>
        {children}
      </div>
    </div>
  );
}