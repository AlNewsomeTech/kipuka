import { Link } from 'react-router-dom';
import { GitCompareArrows, ArrowRight } from 'lucide-react';
import { DRIFT_SEVERITY_STYLES } from '@/lib/acolyteMicrosoft';

// Expected vs observed configuration changes. ACOLYTE only reports drift and
// provides guidance. "Review Proposed Restoration" appears ONLY when the
// separate Graph deployment capability is enabled AND the object is
// Kipuka-managed — it routes into the full deployment workflow (precheck,
// diff, approval, deploy, read back, verify, evidence). Never automatic.
export default function DriftPanel({ snapshot, deploymentEnabled, projectId }) {
  if (!snapshot) return null;
  const items = snapshot.drift_summary?.items || [];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <GitCompareArrows className="w-4 h-4 text-[#0F1E3C]" />
          <h2 className="text-sm font-bold text-slate-800">Configuration Drift</h2>
        </div>
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
          snapshot.comparison_status === 'In Sync' ? 'bg-green-50 text-green-700 border-green-200'
            : snapshot.comparison_status === 'Drift Detected' ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
          {snapshot.comparison_status}
        </span>
      </div>

      {snapshot.comparison_status === 'No Baseline' ? (
        <p className="text-sm text-slate-500">
          No approved Microsoft baseline yet. Review this snapshot and approve it as the baseline to enable drift detection on future scans.
        </p>
      ) : !items.length ? (
        <p className="text-sm text-slate-500">No meaningful configuration drift was detected against the approved baseline.</p>
      ) : (
        <div className="space-y-3">
          {items.map((d) => (
            <div key={d.fingerprint} className="border border-slate-200 rounded-lg p-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${DRIFT_SEVERITY_STYLES[d.severity] || DRIFT_SEVERITY_STYLES.Informational}`}>{d.severity}</span>
                  <span className="text-sm font-semibold text-slate-800 truncate">{d.title}</span>
                </div>
                {deploymentEnabled && d.deployment_id && (
                  <Link to={`/projects/${projectId}/microsoft`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline flex-shrink-0">
                    Review Proposed Restoration <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
              <div className="mt-2 grid sm:grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-50 border border-slate-200 rounded p-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Expected</div>
                  <div className="text-slate-700">{d.expected}</div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded p-2">
                  <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-0.5">Observed</div>
                  <div className="text-slate-700">{d.observed}</div>
                </div>
              </div>
              <p className="text-xs text-slate-600 mt-2"><b>Recommended action:</b> {d.recommended_action}</p>
            </div>
          ))}
        </div>
      )}
      <p className="text-[11px] text-slate-400 mt-3">
        ACOLYTE never changes Microsoft configuration automatically. Restorations require the full Kipuka deployment approval workflow.
      </p>
    </div>
  );
}