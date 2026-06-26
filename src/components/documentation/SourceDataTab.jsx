import { Database, CheckCircle2, XCircle } from 'lucide-react';

export default function SourceDataTab({ synthesis }) {
  const s = synthesis.source_summary;
  const entries = [
    { label: 'CMMC Controls (Applicable)', value: s.controls, entity: 'CMMCControl' },
    { label: 'Level 1 Controls', value: s.l1_controls, entity: 'CMMCControl' },
    { label: 'Level 2 Controls', value: s.l2_controls, entity: 'CMMCControl' },
    { label: 'Deployment Tasks', value: s.tasks, entity: 'DeploymentTask' },
    { label: 'Evidence Items', value: s.evidence, entity: 'EvidenceItem' },
    { label: 'Screenshots', value: s.screenshots, entity: 'Screenshot' },
    { label: 'Generated Documents', value: s.documents, entity: 'GeneratedDocument' },
    { label: 'Document Templates', value: s.templates, entity: 'DocumentTemplate' },
    { label: 'Device Inventory', value: s.devices, entity: 'DeviceInventory' },
    { label: 'User Inventory', value: s.users, entity: 'UserInventory' },
    { label: 'NinjaOne Evidence', value: s.ninja_evidence, entity: 'NinjaOneEvidence' },
    { label: 'POA&M Items', value: s.poams, entity: 'POAMItem' },
    { label: 'Risk Items', value: s.risks, entity: 'RiskItem' },
    { label: 'Training Records', value: s.training, entity: 'TrainingRecord' },
    { label: 'Policy Acknowledgements', value: s.policy_acks, entity: 'PolicyAcknowledgement' },
    { label: 'System Components', value: s.system_components, entity: 'SystemComponent' },
    { label: 'Data Flows', value: s.data_flows, entity: 'DataFlow' },
    { label: 'External Connections', value: s.external_connections, entity: 'ExternalConnection' },
    { label: 'Service Providers', value: s.service_providers, entity: 'ServiceProviderResponsibility' },
    { label: 'Self-Certification', value: s.self_cert, entity: 'SelfCertificationWalkthrough' },
    { label: 'Google Migration', value: s.google_migration, entity: 'GoogleMigration' },
    { label: 'Folder Items', value: s.folder_items, entity: 'FolderItem' },
    { label: 'Assessment Packages', value: s.assessment_packages, entity: 'AssessmentPackage' },
    { label: 'System Links', value: s.system_links, entity: 'SystemLink' },
    { label: 'Admin Center Links', value: s.admin_links, entity: 'AdminCenterLink' },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-xs text-blue-800">
          <strong>Source Data Coverage:</strong> The SSP synthesizes data from {entries.length} entity sources across the app.
          Empty sources produce gaps in the SSP — they are not hidden.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {entries.map(e => (
          <div key={e.entity} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <Database className={`w-4 h-4 ${e.value > 0 ? 'text-blue-500' : 'text-slate-300'}`} />
              {e.value > 0 ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-slate-300" />}
            </div>
            <div className={`text-2xl font-bold ${e.value > 0 ? 'text-slate-800' : 'text-slate-300'}`}>{e.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{e.label}</div>
            <div className="text-[10px] font-mono text-slate-400 mt-1">{e.entity}</div>
          </div>
        ))}
      </div>
    </div>
  );
}