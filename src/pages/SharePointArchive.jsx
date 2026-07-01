import { useState, useEffect } from 'react';
import { FolderArchive, Copy, Check, Folder, FolderOpen, ChevronRight, ChevronDown } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useClient } from '@/lib/clientContext';
import EmptyState from '@/components/EmptyState';

const controlFolders = [
  { id: 'AC.L1-3.1.1', name: 'AC.L1-3.1.1_Authorized_Access_Control' },
  { id: 'AC.L1-3.1.2', name: 'AC.L1-3.1.2_Transaction_Function_Access_Control' },
  { id: 'AC.L1-3.1.20', name: 'AC.L1-3.1.20_External_Connections_Verification' },
  { id: 'AC.L1-3.1.22', name: 'AC.L1-3.1.22_Control_Public_Information' },
  { id: 'IA.L1-3.5.1', name: 'IA.L1-3.5.1_Identify_System_Users' },
  { id: 'IA.L1-3.5.2', name: 'IA.L1-3.5.2_Authenticate_System_Users' },
  { id: 'MP.L1-3.8.3', name: 'MP.L1-3.8.3_Media_Disposal' },
  { id: 'PE.L1-3.10.1', name: 'PE.L1-3.10.1_Limit_Physical_Access' },
  { id: 'PE.L1-3.10.3', name: 'PE.L1-3.10.3_Escort_Visitors' },
  { id: 'PE.L1-3.10.4', name: 'PE.L1-3.10.4_Maintain_Physical_Access_Logs' },
  { id: 'PE.L1-3.10.5', name: 'PE.L1-3.10.5_Control_Physical_Access_Devices' },
  { id: 'SC.L1-3.13.1', name: 'SC.L1-3.13.1_Boundary_Protection' },
  { id: 'SC.L1-3.13.5', name: 'SC.L1-3.13.5_Public_System_Separation' },
  { id: 'SI.L1-3.14.1', name: 'SI.L1-3.14.1_Flaw_Remediation' },
  { id: 'SI.L1-3.14.2', name: 'SI.L1-3.14.2_Malicious_Code_Protection' },
  { id: 'SI.L1-3.14.4', name: 'SI.L1-3.14.4_Update_Malicious_Code_Protection' },
  { id: 'SI.L1-3.14.5', name: 'SI.L1-3.14.5_Periodic_Scans' },
];

const controlSubfolders = ['01_Control_Narrative', '02_Screenshots', '03_Configuration_Exports', '04_Reports', '05_Test_or_Validation', '06_Reviewer_Notes'];

const topFolders = [
  '00_ReadMe_and_Index', '01_Scope_and_Environment', '02_Level_1_Control_Evidence',
  '03_Microsoft_365_Evidence', '04_SharePoint_OneDrive_Evidence', '05_Exchange_Online_Evidence',
  '06_Endpoint_NinjaOne_Evidence', '07_Users_Groups_and_Access', '08_Policies_and_Procedures',
  '09_Security_Awareness', '10_Incident_Response', '11_Level_2_Ready_Evidence',
  '12_SPRS_and_Attestation', '13_Final_Assessment_Package', '99_Archive'
];

function buildTree(rootName) {
  const lines = [rootName + '/'];
  topFolders.forEach((folder) => {
    lines.push('  ' + folder + '/');
    if (folder === '02_Level_1_Control_Evidence') {
      controlFolders.forEach((cf) => {
        lines.push('    ' + cf.name + '/');
        controlSubfolders.forEach((sf) => { lines.push('      ' + sf + '/'); });
      });
    }
  });
  return lines.join('\n');
}

export default function SharePointArchive() {
  const { selectedClientId, selectedClient } = useClient();
  const [folders, setFolders] = useState([]);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState({ '02_Level_1_Control_Evidence': true });

  const clientSlug = selectedClient?.legal_name
    ? selectedClient.legal_name.replace(/[^a-zA-Z0-9]/g, '')
    : '{ClientName}';
  const rootName = `${clientSlug}_CMMC_Evidence`;

  useEffect(() => {
    if (!selectedClientId) return;
    base44.entities.FolderItem.filter({ client_id: selectedClientId })
      .then(setFolders)
      .catch(() => {});
  }, [selectedClientId]);

  const folderMap = {};
  folders.forEach(f => { folderMap[f.folder_path] = f; });

  const toggleFolder = (path, field) => {
    const existing = folderMap[path];
    if (existing) {
      base44.entities.FolderItem.update(existing.id, { [field]: !existing[field] })
        .then(() => base44.entities.FolderItem.filter({ client_id: selectedClientId }).then(setFolders));
    } else {
      const parts = path.split('/');
      base44.entities.FolderItem.create({
        client_id: selectedClientId, folder_name: parts[parts.length - 1] || parts[0],
        folder_path: path, parent_path: parts.slice(0, -1).join('/'),
        [field]: true
      }).then(() => base44.entities.FolderItem.filter({ client_id: selectedClientId }).then(setFolders));
    }
  };

  const copyTree = () => {
    navigator.clipboard.writeText(buildTree(rootName));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadTree = () => {
    const blob = new Blob([buildTree(rootName)], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'CMMC_Evidence_Folder_Structure.txt'; a.click();
    URL.revokeObjectURL(url);
  };

  if (!selectedClient) return <EmptyState icon={FolderArchive} title="No client selected" description="Select a client to manage the SharePoint evidence archive." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">SharePoint Evidence Archive</h1>
        <p className="text-sm text-slate-500 mt-1">Standard CMMC evidence folder structure — mark each folder as created locally and in SharePoint</p>
      </div>

      <div className="flex gap-2">
        <button onClick={copyTree} className="flex items-center gap-1.5 text-sm bg-[#0F1E3C] text-white px-3 py-2 rounded-lg hover:bg-[#1E2D4A]">{copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? 'Copied!' : 'Copy Structure'}</button>
        <button onClick={downloadTree} className="flex items-center gap-1.5 text-sm bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-50">Download .txt</button>
      </div>

      {/* Folder tree */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-3">
          <FolderOpen className="w-5 h-5 text-[#0F1E3C]" />
          <span className="text-sm font-mono font-semibold text-slate-800">{rootName}/</span>
        </div>
        <div className="space-y-1 ml-4">
          {topFolders.map((folder) => (
            <div key={folder}>
              <div className="flex items-center gap-2 py-1">
                {folder === '02_Level_1_Control_Evidence' ? (
                  <button onClick={() => setExpanded({...expanded, [folder]: !expanded[folder]})}>
                    {expanded[folder] ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                  </button>
                ) : <span className="w-3.5" />}
                <Folder className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-mono text-slate-700 flex-1">{folder}/</span>
                <button onClick={() => toggleFolder(`${rootName}/${folder}`, 'created_locally')} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${folderMap[`${rootName}/${folder}`]?.created_locally ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{folderMap[`${rootName}/${folder}`]?.created_locally ? '✓ Local' : 'Local'}</button>
                <button onClick={() => toggleFolder(`${rootName}/${folder}`, 'created_in_sharepoint')} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${folderMap[`${rootName}/${folder}`]?.created_in_sharepoint ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>{folderMap[`${rootName}/${folder}`]?.created_in_sharepoint ? '✓ SP' : 'SP'}</button>
              </div>
              {folder === '02_Level_1_Control_Evidence' && expanded[folder] && (
                <div className="ml-8 space-y-0.5">
                  {controlFolders.map((cf) => (
                    <div key={cf.id}>
                      <div className="flex items-center gap-2 py-0.5">
                        <button onClick={() => setExpanded({...expanded, [cf.name]: !expanded[cf.name]})}>
                          {expanded[cf.name] ? <ChevronDown className="w-3 h-3 text-slate-400" /> : <ChevronRight className="w-3 h-3 text-slate-400" />}
                        </button>
                        <Folder className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-[11px] font-mono text-slate-600 flex-1">{cf.name}/</span>
                        <button onClick={() => toggleFolder(`${rootName}/${folder}/${cf.name}`, 'created_locally')} className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${folderMap[`${rootName}/${folder}/${cf.name}`]?.created_locally ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>L</button>
                        <button onClick={() => toggleFolder(`${rootName}/${folder}/${cf.name}`, 'created_in_sharepoint')} className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${folderMap[`${rootName}/${folder}/${cf.name}`]?.created_in_sharepoint ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>SP</button>
                      </div>
                      {expanded[cf.name] && (
                        <div className="ml-8 space-y-0.5">
                          {controlSubfolders.map((sf) => (
                            <div key={sf} className="flex items-center gap-2 py-0.5">
                              <Folder className="w-3 h-3 text-slate-300" />
                              <span className="text-[10px] font-mono text-slate-500 flex-1">{sf}/</span>
                              <button onClick={() => toggleFolder(`${rootName}/${folder}/${cf.name}/${sf}`, 'created_locally')} className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${folderMap[`${rootName}/${folder}/${cf.name}/${sf}`]?.created_locally ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>L</button>
                              <button onClick={() => toggleFolder(`${rootName}/${folder}/${cf.name}/${sf}`, 'created_in_sharepoint')} className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${folderMap[`${rootName}/${folder}/${cf.name}/${sf}`]?.created_in_sharepoint ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>SP</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}