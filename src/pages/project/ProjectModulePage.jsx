import { useOutletContext } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { moduleByKey } from '@/lib/projectModules';
import DarkHorizonBadge from '@/components/ui/DarkHorizonBadge';

// Module content: a concise workspace pane per module that links to the
// existing global feature pages (which hold the full workflow). This keeps the
// per-project navigation intact without duplicating existing functionality.
const MODULE_CONTENT = {
  scoping: {
    desc: 'Define the CUI/FCI boundary, in-scope systems, and assessment scope for this project.',
    links: [{ to: '/documentation', label: 'Open SSP & scoping workspace' }],
  },
  assessment: {
    desc: 'Work through the CMMC control set and record implementation status for each control.',
    links: [{ to: '/controls', label: 'Level 1 Controls' }, { to: '/level2', label: 'Level 2 Controls' }],
  },
  evidence: {
    desc: 'Collect, review, and index the evidence backing each control response.',
    links: [{ to: '/screenshots', label: 'Screenshot Library' }, { to: '/evidence', label: 'Evidence Index' }],
  },
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
  const { project } = useOutletContext();
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