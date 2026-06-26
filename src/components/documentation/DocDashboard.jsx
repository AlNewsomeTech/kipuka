import { ShieldCheck, AlertTriangle, FileWarning, Copy, Layers, FileCheck2, CircleDot, Eye, XCircle } from 'lucide-react';
import ProgressBar from '@/components/ProgressBar';
import StatusBadge from '@/components/StatusBadge';

function ScoreCard({ label, value, icon: Icon, color }) {
  const colorMap = { green: 'text-green-600', amber: 'text-amber-600', red: 'text-red-600', blue: 'text-blue-600', navy: 'text-[#0F1E3C]' };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <Icon className={`w-4 h-4 ${colorMap[color] || colorMap.blue}`} />
      </div>
      <div className={`text-2xl font-bold ${colorMap[color] || colorMap.blue}`}>{value}</div>
    </div>
  );
}

export default function DocDashboard({ synthesis, client }) {
  const { scores, gaps, placeholders, duplicates, client_mismatches, final_package, source_summary, is_level2, cui_in_scope, fci_in_scope } = synthesis;
  const totalIssues = gaps.length + placeholders.length + duplicates.length + client_mismatches.length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <ScoreCard label="SSP Status" value={synthesis.ssp_record?.status || 'Draft'} icon={ShieldCheck} color="navy" />
        <ScoreCard label="Target Level" value={synthesis.level} icon={Layers} color="blue" />
        <ScoreCard label="Overall Completeness" value={`${scores.completeness}%`} icon={CircleDot} color={scores.completeness >= 80 ? 'green' : scores.completeness >= 50 ? 'amber' : 'red'} />
        <ScoreCard label="Open Issues" value={totalIssues} icon={AlertTriangle} color={totalIssues === 0 ? 'green' : 'red'} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">Scope & Boundary</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between"><span className="text-slate-500">FCI in Scope</span><span className={`font-medium ${fci_in_scope ? 'text-green-600' : 'text-slate-400'}`}>{fci_in_scope ? 'Yes' : 'No'}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">CUI in Scope</span><span className={`font-medium ${cui_in_scope ? 'text-green-600' : is_level2 ? 'text-red-600' : 'text-slate-400'}`}>{cui_in_scope ? 'Yes' : is_level2 ? 'No ⚠' : 'N/A (L1)'}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">System Components</span><span className="font-medium text-slate-700">{source_summary.system_components} documented</span></div>
            <div className="flex justify-between"><span className="text-slate-500">External Connections</span><span className="font-medium text-slate-700">{source_summary.external_connections} documented</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Service Providers</span><span className="font-medium text-slate-700">{source_summary.service_providers} documented</span></div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">Completeness Scores</h3>
          <div className="space-y-3">
            <ProgressBar value={scores.control_narrative} label="Control Narratives" color="blue" size="sm" />
            <ProgressBar value={scores.evidence_linkage} label="Evidence Linkage" color="green" size="sm" />
            <ProgressBar value={scores.inventory} label="Inventory" color="amber" size="sm" />
            <ProgressBar value={scores.policy} label="Policy Documents" color="navy" size="sm" />
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">Level Readiness</h3>
          <div className="space-y-3">
            <ProgressBar value={scores.level1_readiness} label="Level 1 Readiness" color="green" size="sm" />
            {is_level2 && <ProgressBar value={scores.level2_readiness} label="Level 2 Readiness" color="amber" size="sm" />}
            <ProgressBar value={scores.final_package_readiness} label="Final Package Readiness" color="navy" size="sm" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">Issue Summary</h3>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1">
              <span className="flex items-center gap-1.5 text-slate-600"><AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Data Gaps</span>
              <span className={`font-bold ${gaps.length > 0 ? 'text-amber-600' : 'text-green-600'}`}>{gaps.length}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="flex items-center gap-1.5 text-slate-600"><FileWarning className="w-3.5 h-3.5 text-orange-500" /> Unresolved Placeholders</span>
              <span className={`font-bold ${placeholders.length > 0 ? 'text-orange-600' : 'text-green-600'}`}>{placeholders.length}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="flex items-center gap-1.5 text-slate-600"><Copy className="w-3.5 h-3.5 text-purple-500" /> Duplicate Documents</span>
              <span className={`font-bold ${duplicates.length > 0 ? 'text-purple-600' : 'text-green-600'}`}>{duplicates.length}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="flex items-center gap-1.5 text-slate-600"><XCircle className="w-3.5 h-3.5 text-red-500" /> Client Mismatches</span>
              <span className={`font-bold ${client_mismatches.length > 0 ? 'text-red-600' : 'text-green-600'}`}>{client_mismatches.length}</span>
            </div>
            <div className="flex items-center justify-between py-1 border-t border-slate-100 mt-1 pt-2">
              <span className="flex items-center gap-1.5 text-slate-600"><FileCheck2 className="w-3.5 h-3.5 text-green-500" /> Final Package Ready</span>
              <span className="font-bold text-slate-700">{final_package.ready_count}/{final_package.total_count}</span>
            </div>
          </div>
        </div>
      </div>

      {is_level2 && !cui_in_scope && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-red-800">CUI Scope Required for Level 2</h4>
            <p className="text-xs text-red-700 mt-0.5">This client is targeting Level 2 but CUI is not marked in scope. Level 2 SSP requires CUI boundary definition, CUI data flows, and CUI-handling system components.</p>
          </div>
        </div>
      )}
    </div>
  );
}