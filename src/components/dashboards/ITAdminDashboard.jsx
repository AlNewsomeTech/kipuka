import { Link } from 'react-router-dom';
import { Server, ListChecks, Boxes, AlertTriangle, ShieldAlert } from 'lucide-react';
import { DashCard, StatTile, MiniList } from './dashboardPrimitives';
import { deriveMetrics } from '@/lib/useProjectDashboardData';

// Technical control domains typically owned by IT.
const TECH_DOMAINS = ['AC', 'IA', 'SC', 'SI', 'AU', 'CM', 'MA'];
const isTechnical = (a) => TECH_DOMAINS.some((d) => (a.control_id || '').toUpperCase().startsWith(d));

const ASSET_GROUPS = [
  { key: 'Endpoint', label: 'Endpoint' },
  { key: 'User', label: 'Identity' },
  { key: 'Cloud Service', label: 'Cloud' },
  { key: 'Security Tool', label: 'Security Tool' },
];

export default function ITAdminDashboard({ project, data }) {
  const m = deriveMetrics(project, data);
  const base = `/projects/${project.id}`;

  const techControls = data.assessments.filter(isTechnical);
  const techNeedingImpl = techControls.filter((a) => ['Not Started', 'Not Implemented', 'Partially Implemented'].includes(a.status));
  const techPoam = m.openPoam.filter((p) => isTechnical({ control_id: p.control_id }));

  // Evidence-owner heuristic: evidence with source system suggesting IT ownership.
  const itEvidence = data.evidence.filter((e) => /ninja|entra|intune|defender|m365|azure|cortex|xdr|endpoint|firewall/i.test(`${e.source_system} ${e.evidence_title}`));

  const assetGaps = ASSET_GROUPS.map((g) => {
    const assets = data.assets.filter((a) => a.asset_type === g.key);
    const withEvidence = assets.filter((a) => data.evidence.some((e) => (e.evidence_title || '').includes(a.asset_name)));
    return { label: g.label, gap: assets.length - withEvidence.length, total: assets.length };
  }).filter((g) => g.total > 0 && g.gap > 0).map((g) => `${g.label}: ${g.gap} of ${g.total} assets lack evidence`);

  const inventoryComplete = data.assets.length ? Math.round((data.assets.filter((a) => a.business_purpose && a.owner).length / data.assets.length) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile icon={Server} label="Technical Controls Open" value={techNeedingImpl.length} tone="amber" />
        <StatTile icon={ListChecks} label="IT Evidence Items" value={itEvidence.length} tone="blue" />
        <StatTile icon={Boxes} label="Inventory Completeness" value={`${inventoryComplete}%`} tone="green" />
        <StatTile icon={AlertTriangle} label="Open Technical POA&M" value={techPoam.length} tone="red" />
      </div>

      <DashCard title="Technical Controls Needing Implementation" icon={ShieldAlert} action={<Link to={`${base}/assessment`} className="text-xs text-blue-600 hover:underline">Open</Link>}>
        <MiniList items={techNeedingImpl.map((a) => `${a.control_id} — ${a.control_title} (${a.status})`)} empty="All technical controls implemented." />
      </DashCard>

      <div className="grid lg:grid-cols-2 gap-4">
        <DashCard title="Evidence Assigned to IT" icon={ListChecks} action={<Link to={`${base}/evidence`} className="text-xs text-blue-600 hover:underline">Open</Link>}>
          <MiniList items={itEvidence.map((e) => `${e.evidence_title} — ${e.review_status}`)} empty="No IT-tagged evidence yet." />
        </DashCard>
        <DashCard title="Endpoint / Identity / Cloud / Tool Gaps" icon={Boxes} action={<Link to={`${base}/inventory`} className="text-xs text-blue-600 hover:underline">Open</Link>}>
          <MiniList items={assetGaps} empty="No evidence gaps across tracked asset groups." />
        </DashCard>
      </div>

      <DashCard title="Open Technical POA&M Items" icon={AlertTriangle} action={<Link to={`${base}/poam`} className="text-xs text-blue-600 hover:underline">Open</Link>}>
        <MiniList items={techPoam.map((p) => `${p.poam_title} — ${p.status} (${p.risk_rating})`)} empty="No open technical POA&M items." />
      </DashCard>
    </div>
  );
}