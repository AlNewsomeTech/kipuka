import { useOutletContext } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { moduleByKey } from '@/lib/projectModules';
import { useAuth } from '@/lib/AuthContext';
import { useOrg } from '@/lib/orgContext';
import { isClientView } from '@/lib/clientView';
import ScopingModule from '@/components/project/scoping/ScopingModule';
import InventoryModule from '@/components/project/inventory/InventoryModule';
import AssessmentModule from '@/components/project/assessment/AssessmentModule';
import EvidenceModule from '@/components/project/evidence/EvidenceModule';
import SSPModule from '@/components/project/ssp/SSPModule';
import PoamModule from '@/components/project/poam/PoamModule';
import PoliciesModule from '@/components/project/policies/PoliciesModule';
import ReportsModule from '@/components/project/reports/ReportsModule';
import SprsModule from '@/components/project/sprs/SprsModule';
import MaintenanceModule from '@/components/project/maintenance/MaintenanceModule';
import SecurityToolingModule from '@/components/project/securitytools/SecurityToolingModule';
import DiagramModule from '@/components/project/diagram/DiagramModule';
import SrmModule from '@/components/project/srm/SrmModule';
import IncidentModule from '@/components/project/incident/IncidentModule';
import EvidenceReadinessModule from '@/components/project/readiness/EvidenceReadinessModule';
import MockAssessmentModule from '@/components/project/mock/MockAssessmentModule';
import MicrosoftGraphModule from '@/components/project/microsoft/MicrosoftGraphModule';

// Modules with full in-app workflows (Phase 3 + Phase 4 + Phase 5).
const RICH_MODULES = {
  scoping: ScopingModule,
  inventory: InventoryModule,
  assessment: AssessmentModule,
  evidence: EvidenceModule,
  readiness: EvidenceReadinessModule,
  mock: MockAssessmentModule,
  microsoft: MicrosoftGraphModule,
  'security-tooling': SecurityToolingModule,
  diagrams: DiagramModule,
  srm: SrmModule,
  incident: IncidentModule,
  ssp: SSPModule,
  poam: PoamModule,
  policies: PoliciesModule,
  sprs: SprsModule,
  maintenance: MaintenanceModule,
  reports: ReportsModule,
};

// Remaining modules link to the existing global feature pages.
const MODULE_CONTENT = {};

export default function ProjectModulePage({ moduleKey }) {
  const { project, readOnly, org, refreshProject } = useOutletContext();
  const { user } = useAuth();
  const { orgRole, isPlatformAdmin } = useOrg();
  const isClient = isClientView(orgRole, isPlatformAdmin);

  const RichModule = RICH_MODULES[moduleKey];
  if (RichModule) {
    return <RichModule project={project} org={org} readOnly={readOnly} currentUser={user} refreshProject={refreshProject} isClient={isClient} />;
  }

  const def = moduleByKey(moduleKey);
  const content = MODULE_CONTENT[moduleKey] || { desc: '', links: [] };
  const Icon = def.icon;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center gap-2.5 mb-1">
        <Icon className="w-5 h-5 text-[#0F1E3C]" />
        <h1 className="text-lg font-bold text-slate-900">{def.label}</h1>
      </div>
      <p className="text-sm text-slate-500 max-w-2xl">{content.desc}</p>

      <div className="mt-5 flex flex-wrap gap-2.5">
        {content.links.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52]"
          >
            {l.label} <ArrowUpRight className="w-4 h-4" />
          </Link>
        ))}
      </div>

      <p className="mt-6 text-[11px] text-slate-400">
        Project: <span className="font-medium text-slate-500">{project.project_name}</span> — this module is part of the
        {' '}{project.assessment_path} workflow.
      </p>
    </div>
  );
}