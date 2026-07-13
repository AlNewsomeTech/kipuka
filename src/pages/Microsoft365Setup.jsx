import { useState, useEffect } from 'react';
import { Settings2, ExternalLink, Search } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useClient } from '@/lib/clientContext';
import EmptyState from '@/components/EmptyState';

const defaultTasks = [
  { title: 'Confirm E5 Licensing', admin_center_url: 'https://admin.microsoft.com', role: 'Global Admin', instructions: 'Navigate to Billing > Licenses. Confirm Microsoft 365 E5 licenses are assigned to all users.', screenshot: 'Active licenses page showing E5', export: 'Export license report CSV', folder: '03_Microsoft_365_Evidence/Licensing', control: 'IA.L1-3.5.2' },
  { title: 'Export Active Users', admin_center_url: 'https://admin.microsoft.com', role: 'User Admin', instructions: 'Go to Users > Active Users. Export the list to CSV.', screenshot: 'Active users list', export: 'Active users CSV', folder: '07_Users_Groups_and_Access', control: 'IA.L1-3.5.1' },
  { title: 'Create Named Admin Accounts', admin_center_url: 'https://admin.microsoft.com', role: 'Global Admin', instructions: 'Create dedicated admin accounts (admin-firstname@domain). Do not use general user accounts for admin work.', screenshot: 'Admin accounts list', export: 'Admin accounts export', folder: '07_Users_Groups_and_Access', control: 'AC.L1-3.1.1' },
  { title: 'Create Break-Glass Accounts', admin_center_url: 'https://admin.microsoft.com', role: 'Global Admin', instructions: 'Create 1-2 emergency break-glass accounts with strong passwords. Store credentials securely. Exclude from MFA/Conditional Access.', screenshot: 'Break-glass account configuration', export: 'Break-glass account documentation', folder: '07_Users_Groups_and_Access', control: 'AC.L1-3.1.1' },
  { title: 'Create Security Groups', admin_center_url: 'https://entra.microsoft.com', role: 'Groups Admin', instructions: 'Create security groups for role-based access (FCI-Users, Admins, etc.)', screenshot: 'Security groups list', export: 'Groups export', folder: '07_Users_Groups_and_Access', control: 'AC.L1-3.1.2' },
  { title: 'Create FCI Authorized Users Group', admin_center_url: 'https://entra.microsoft.com', role: 'Groups Admin', instructions: 'Create a dedicated group for users authorized to access FCI. Add only required personnel.', screenshot: 'FCI users group membership', export: 'Group membership export', folder: '07_Users_Groups_and_Access', control: 'AC.L1-3.1.1' },
  { title: 'Enable MFA', admin_center_url: 'https://entra.microsoft.com', role: 'Conditional Access Admin', instructions: 'Configure MFA for all users via Conditional Access or Security Defaults. Require authenticator app.', screenshot: 'MFA registration policy', export: 'MFA enrollment report', folder: '03_Microsoft_365_Evidence/MFA', control: 'IA.L1-3.5.2' },
  { title: 'Configure Conditional Access', admin_center_url: 'https://entra.microsoft.com', role: 'Conditional Access Admin', instructions: 'Create Conditional Access policies: block legacy auth, require MFA for all users, require compliant devices.', screenshot: 'Conditional Access policies list', export: 'CA policy export', folder: '03_Microsoft_365_Evidence/ConditionalAccess', control: 'AC.L1-3.1.1' },
  { title: 'Disable Legacy Authentication', admin_center_url: 'https://entra.microsoft.com', role: 'Conditional Access Admin', instructions: 'Create a Conditional Access policy to block legacy authentication protocols (IMAP, POP, SMTP, etc.)', screenshot: 'Block legacy auth policy', export: 'CA policy export', folder: '03_Microsoft_365_Evidence/ConditionalAccess', control: 'IA.L1-3.5.2' },
  { title: 'Configure Audit Logging', admin_center_url: 'https://purview.microsoft.com', role: 'Compliance Admin', instructions: 'Enable unified audit log in Purview. Confirm audit log is on for Exchange, SharePoint, OneDrive.', screenshot: 'Audit log enabled status', export: 'Audit configuration report', folder: '03_Microsoft_365_Evidence/AuditLogs', control: 'AC.L1-3.1.2' },
  { title: 'Configure Defender Security Baseline', admin_center_url: 'https://security.microsoft.com', role: 'Security Admin', instructions: 'Enable Defender for Office 365, configure safe links, safe attachments, and anti-phishing policies.', screenshot: 'Defender policies overview', export: 'Defender configuration export', folder: '03_Microsoft_365_Evidence/Defender', control: 'SI.L1-3.14.2' },
  { title: 'Configure Exchange Anti-Phishing', admin_center_url: 'https://security.microsoft.com', role: 'Security Admin', instructions: 'Configure anti-phishing policy with mailbox intelligence, spoofing protection, and first-contact safety tips.', screenshot: 'Anti-phishing policy settings', export: 'Anti-phishing policy export', folder: '05_Exchange_Online_Evidence', control: 'SI.L1-3.14.2' },
  { title: 'Configure Exchange Anti-Malware', admin_center_url: 'https://security.microsoft.com', role: 'Security Admin', instructions: 'Verify anti-malware policy is enabled with default settings or custom policy for the tenant.', screenshot: 'Anti-malware policy', export: 'Anti-malware policy export', folder: '05_Exchange_Online_Evidence', control: 'SI.L1-3.14.2' },
  { title: 'Configure Exchange Anti-Spam', admin_center_url: 'https://security.microsoft.com', role: 'Security Admin', instructions: 'Configure anti-spam inbound and outbound policies. Set SCL thresholds.', screenshot: 'Anti-spam policy settings', export: 'Anti-spam policy export', folder: '05_Exchange_Online_Evidence', control: 'SI.L1-3.14.2' },
  { title: 'Configure SPF, DKIM, and DMARC', admin_center_url: 'https://admin.exchange.microsoft.com', role: 'Global Admin', instructions: 'Configure SPF TXT record, enable DKIM signing, and set DMARC policy to p=quarantine or p=reject.', screenshot: 'DKIM enabled + DMARC record', export: 'DNS records documentation', folder: '05_Exchange_Online_Evidence', control: 'SC.L1-3.13.1' },
  { title: 'Configure SharePoint External Sharing Restrictions', admin_center_url: 'https://admin.microsoft.com/sharepoint', role: 'SharePoint Admin', instructions: 'Set external sharing to existing guests only or disabled. Restrict at tenant and site level.', screenshot: 'SharePoint sharing settings', export: 'Sharing settings documentation', folder: '04_SharePoint_OneDrive_Evidence', control: 'AC.L1-3.1.20' },
  { title: 'Configure OneDrive Settings', admin_center_url: 'https://admin.microsoft.com/sharepoint', role: 'SharePoint Admin', instructions: 'Configure OneDrive sharing settings, external access, and sync restrictions.', screenshot: 'OneDrive sharing settings', export: 'OneDrive settings export', folder: '04_SharePoint_OneDrive_Evidence', control: 'AC.L1-3.1.20' },
  { title: 'Configure Retention and Recovery Evidence', admin_center_url: 'https://purview.microsoft.com', role: 'Compliance Admin', instructions: 'Document native recovery capabilities: version history, recycle bin, restore. Configure retention policies if needed.', screenshot: 'Retention policies + recovery settings', export: 'Retention policy export', folder: '04_SharePoint_OneDrive_Evidence', control: 'SI.L1-3.14.1' },
  { title: 'Configure FCI Storage Location', admin_center_url: 'https://admin.microsoft.com/sharepoint', role: 'SharePoint Admin', instructions: 'Create a dedicated SharePoint site or document library for FCI storage. Restrict access to FCI authorized users group.', screenshot: 'FCI storage site permissions', export: 'Site permissions export', folder: '04_SharePoint_OneDrive_Evidence', control: 'AC.L1-3.1.1' },
  { title: 'Configure Access Reviews', admin_center_url: 'https://entra.microsoft.com', role: 'Global Admin', instructions: 'Set up periodic access reviews for privileged roles and FCI access groups.', screenshot: 'Access review configuration', export: 'Access review schedule', folder: '07_Users_Groups_and_Access', control: 'AC.L1-3.1.2' },
  { title: 'Configure Device Compliance Baseline', admin_center_url: 'https://intune.microsoft.com', role: 'Intune Admin', instructions: 'Create device compliance policies for macOS and Windows. Require encryption, OS updates, and password.', screenshot: 'Compliance policy settings', export: 'Compliance policy export', folder: '06_Endpoint_NinjaOne_Evidence', control: 'SI.L1-3.14.1' },
];

export default function Microsoft365Setup() {
  const { selectedClientId, selectedClient } = useClient();
  const [links, setLinks] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.AdminCenterLink.list().then(setLinks).catch(() => {});
    if (selectedClientId) {
      base44.entities.DeploymentTask.filter({ client_id: selectedClientId })
        .then((allTasks) => {
          const setupTasks = allTasks.filter(t => defaultTasks.some(dt => dt.title === t.title));
          setTasks(setupTasks);
        })
        .finally(() => setLoading(false));
    } else { setLoading(false); }
  }, [selectedClientId]);

  const filteredTasks = defaultTasks.filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.control.toLowerCase().includes(search.toLowerCase()));

  if (!selectedClient) return <EmptyState icon={Settings2} title="No client selected" description="Select a client to configure Microsoft 365." />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Microsoft 365 Setup</h1>
        <p className="text-sm text-slate-500 mt-1">Guided E5 configuration with admin center links and step-by-step tasks</p>
      </div>

      {/* Admin center links */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Admin Center Links</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {links.length > 0 ? links.map(l => (
            <a key={l.id} href={l.url} target="_blank" rel="noreferrer" className="bg-white rounded-xl border border-slate-200 p-3 hover:shadow-md hover:border-blue-300 transition-all group">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-slate-800">{l.name}</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
              </div>
              <div className="text-[10px] text-slate-400 truncate">{l.url}</div>
            </a>
          )) : (
            <p className="text-xs text-slate-400 col-span-full">Admin center links will appear here once seeded. Go to Settings to manage links.</p>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input placeholder="Search setup tasks..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
      </div>

      {/* Setup tasks */}
      <div className="space-y-3">
        {filteredTasks.map((task, i) => {
          const existing = tasks.find(t => t.title === task.title);
          return <SetupTaskCard key={i} task={task} existing={existing} clientId={selectedClientId} />;
        })}
      </div>
    </div>
  );
}

function SetupTaskCard({ task, existing, clientId }) {
  const [status, setStatus] = useState(existing?.status || 'Not Started');
  const [expanded, setExpanded] = useState(false);

  const updateStatus = (newStatus) => {
    setStatus(newStatus);
    if (existing) {
      base44.entities.DeploymentTask.update(existing.id, { status: newStatus });
    } else {
      base44.entities.DeploymentTask.create({
        title: task.title, client_id: clientId, phase: 'Tenant Baseline', status: newStatus,
        admin_center_url: task.admin_center_url, related_control: task.control,
        instructions: task.instructions, required_screenshots: task.screenshot,
        required_exports: task.export, runbook_url: task.admin_center_url, runbook_role: task.role,
        runbook_save_location: task.folder
      });
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <button onClick={() => setExpanded(!expanded)} className="flex-1 text-left">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-slate-800">{task.title}</span>
            <span className="text-[10px] font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{task.control}</span>
          </div>
          <div className="text-xs text-slate-500">{task.role} • {task.admin_center_url}</div>
        </button>
        <a href={task.admin_center_url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-blue-600"><ExternalLink className="w-4 h-4" /></a>
        <select value={status} onChange={e => updateStatus(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
          <option>Not Started</option><option>In Progress</option><option>Evidence Needed</option><option>Ready for Review</option><option>Reviewed</option><option>Complete</option>
        </select>
      </div>
      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-2 text-xs">
          <div><span className="font-semibold text-slate-600">Instructions: </span><span className="text-slate-500">{task.instructions}</span></div>
          <div><span className="font-semibold text-slate-600">Screenshot: </span><span className="text-slate-500">{task.screenshot}</span></div>
          <div><span className="font-semibold text-slate-600">Export: </span><span className="text-slate-500">{task.export}</span></div>
          <div><span className="font-semibold text-slate-600">Evidence Folder: </span><span className="text-slate-500 font-mono">{task.folder}</span></div>
        </div>
      )}
    </div>
  );
}