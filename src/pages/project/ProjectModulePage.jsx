import { useOutletContext } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { moduleByKey } from '@/lib/projectModules';
import { useAuth } from '@/lib/AuthContext';
import DarkHorizonBadge from '@/components/ui/DarkHorizonBadge';
import ScopingModule from '@/components/project/scoping/ScopingModule';
import InventoryModule from '@/components/project/inventory/InventoryModule';
import AssessmentModule from '@/components/project/assessment/AssessmentModule';
import EvidenceModule from '@/components/project/evidence/EvidenceModule';

// Modules with full in-app workflows (Phase 3).
const RICH_MODULES = {
  scoping: ScopingModule,
  inventory: InventoryModule,
  assessment: AssessmentModule,
  evidence: EvidenceModule,
};

// Remaining modules link to the existing global feature pages.
const MODULE_CONTENT = {
  ssp: {
    desc: 'Draft and maintain the System Security Plan from your scoping and control data.',
    links: [{ to: '/documentation', label: 'Open SSP Builder' }],
  },
  poam: {
    desc: 'Track open weaknesses and remediation plans (Plan of Action & Milestones).',
    links: [{ to: '/level2', label: 'Manage POA&M items' }],
  },
  policies: {
    desc: 'Review and generate the policy set required for your target CMMC level.',
    links: [{ to: '/documents', label: 'Document & Policy Library' }],
  },
  sprs: {
    desc: 'Prepare your SPRS score and walk through the PIEE self-certification submission.',
    links: [{ to: '/piee', label: 'PIEE / SPRS Self-Cert' }],
  },
  reports: {
    desc: 'Generate readiness reports and the final handoff/assessment package.',
    links: [{ to: '/package', label: 'Final Package' }, { to: '/sharepoint-package', label: 'SharePoint Package' }],
  },
};

export default function ProjectModulePage({ moduleKey }) {
  const { project, readOnly } = useOutletContext();
  const { user } = useAuth();

  const RichModule = RICH_MODULES[moduleKey];
  if (RichModule) {
    return <RichModule project={project} readOnly={readOnly} currentUser={user} />;
  }

  const def = moduleByKey(moduleKey);
  const content = MODULE_CONTENT[moduleKey] || { desc: '', links: [] };
  const Icon = def.icon;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center gap-2.5 mb-1">
        <Icon className="w-5 h-5 text-[#0F1E3C]" />
        <h1 className="text-lg font-bold text-slate-900">{def.label}</h1>
        {def.darkhorizon && <DarkHorizonBadge />}
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