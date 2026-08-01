import { useMemo } from 'react';
import { applicableTemplates, TEMPLATE_LIBRARY_VERSION } from '@/lib/projectDocumentCatalog';
import { FileText, FileEdit, FileWarning, ShieldCheck, Settings2, AlertTriangle } from 'lucide-react';

function Card({ label, value, icon: Icon, color }) {
  const map = { green: 'text-green-600', amber: 'text-amber-600', red: 'text-red-600', blue: 'text-blue-600', navy: 'text-[#0F1E3C]' };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-1.5"><span className="text-xs font-medium text-slate-500">{label}</span><Icon className={`w-4 h-4 ${map[color] || map.blue}`} /></div>
      <div className={`text-2xl font-bold ${map[color] || map.blue}`}>{value}</div>
    </div>
  );
}

// Project-scoped document dashboard for the canonical Phase 4 engine.
// Configuration is view-only here: changes go through a verified server
// gate in a later phase — no browser writes.
export default function DocumentsDashboard({ project, docs, configs }) {
  const templates = useMemo(() => applicableTemplates(project?.target_cmmc_level), [project?.target_cmmc_level]);
  const active = docs.filter((d) => !['Superseded', 'Archived'].includes(d.status));
  const drafts = active.filter((d) => d.status === 'Draft').length;
  const needsInfo = active.filter((d) => (d.unresolved_fields || []).length > 0 || (d.missing_fields || []).length > 0).length;
  const stale = active.filter((d) => d.stale).length;

  const orgDefaults = configs.filter((c) => !c.project_id);
  const overrides = configs.filter((c) => c.project_id === project?.id);
  const duplicate = orgDefaults.length > 1 || overrides.length > 1;
  const effective = overrides[0] || orgDefaults[0] || null;
  const configStatus = duplicate ? 'Duplicate — fix required' : effective ? (overrides[0] ? 'Project override active' : 'Organization default active') : 'Not configured';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card label="Applicable Templates" value={templates.length} icon={ShieldCheck} color="navy" />
        <Card label="Draft Documents" value={drafts} icon={FileEdit} color="blue" />
        <Card label="Needs Information" value={needsInfo} icon={FileWarning} color={needsInfo ? 'amber' : 'green'} />
        <Card label="Stale Drafts" value={stale} icon={AlertTriangle} color={stale ? 'red' : 'green'} />
        <Card label="Library Version" value={`v${TEMPLATE_LIBRARY_VERSION}`} icon={FileText} color="navy" />
      </div>

      <div className={`bg-white rounded-xl border p-5 ${duplicate ? 'border-red-300' : 'border-slate-200'}`}>
        <div className="flex items-center gap-2 mb-3">
          <Settings2 className="w-5 h-5 text-[#0F1E3C]" />
          <h3 className="text-sm font-semibold text-slate-800">Document Configuration</h3>
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${duplicate ? 'bg-red-50 text-red-700' : effective ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{configStatus}</span>
        </div>
        {duplicate && (
          <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5 mb-3">
            More than one active configuration exists at the same scope. Generation is blocked until the extras are deactivated.
          </p>
        )}
        {effective ? (
          <dl className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-xs">
            {[
              ['Classification', effective.classification],
              ['Filename short name', effective.filename_short_name],
              ['Policy owner', effective.policy_owner_name],
              ['Approving authority', effective.approving_authority_name],
              ['Reporting channel', effective.reporting_channel],
              ['Document repository', effective.document_repository],
              ['Evidence repository', effective.evidence_repository],
              ['Retention schedule', effective.retention_schedule],
              ['Review cycle', effective.review_cycle_days ? `${effective.review_cycle_days} days` : ''],
              ['Responsible team', effective.default_responsible_team],
              ['Timezone', effective.timezone],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3 border-b border-slate-100 pb-1">
                <dt className="text-slate-500">{label}</dt>
                <dd className={`font-medium text-right ${value ? 'text-slate-800' : 'text-amber-600'}`}>{value || 'Not set'}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-xs text-slate-500">No active document configuration for this organization. Unconfigured fields render as “[INFORMATION REQUIRED: …]” in drafts.</p>
        )}
        <p className="text-[11px] text-slate-400 mt-3">Configuration is view-only in this phase; changes are applied through a verified server-side process.</p>
      </div>
    </div>
  );
}