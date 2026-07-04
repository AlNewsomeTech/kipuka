import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Radar, ArrowRight, Loader2, ShieldPlus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import {
  overallStatusFromScore, OPEN_FINDING_STATUSES, OPEN_REMEDIATION_STATUSES,
} from '@/lib/acolyte';
import { PostureBadge } from '@/components/acolyte/AcolyteBadges';

// Compact ACOLYTE readiness summary for the Project Dashboard.
// Reads only its own project's records; shows a clean empty state + create link
// when no AcolyteProfile exists yet. Never renders undefined/null values.
export default function AcolyteSummaryCard({ projectId }) {
  const [state, setState] = useState({ loading: true, profile: null, stats: null });

  useEffect(() => {
    let alive = true;
    if (!projectId) { setState({ loading: false, profile: null, stats: null }); return; }
    (async () => {
      const [profiles, findings, remediations, ir] = await Promise.all([
        base44.entities.AcolyteProfile.filter({ project_id: projectId }).catch(() => []),
        base44.entities.CyberFinding.filter({ project_id: projectId }).catch(() => []),
        base44.entities.AcolyteRemediationItem.filter({ project_id: projectId }).catch(() => []),
        base44.entities.IncidentReadinessRecord.filter({ project_id: projectId }).catch(() => []),
      ]);
      if (!alive) return;
      const openF = findings.filter((f) => OPEN_FINDING_STATUSES.includes(f.finding_status));
      setState({
        loading: false,
        profile: profiles[0] || null,
        stats: {
          critical: openF.filter((f) => f.severity === 'Critical').length,
          high: openF.filter((f) => f.severity === 'High').length,
          openRemediation: remediations.filter((r) => OPEN_REMEDIATION_STATUSES.includes(r.status)).length,
          incidentStatus: ir[0]?.ir_plan_status || 'Not Started',
        },
      });
    })();
    return () => { alive = false; };
  }, [projectId]);

  const { loading, profile, stats } = state;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#0F1E3C] flex items-center justify-center">
            <Radar className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">ACOLYTE Cyber Readiness</h3>
          <span className="text-[10px] font-bold tracking-wider bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">PAC-SEC</span>
        </div>
        <Link to="/acolyte" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline">
          Open <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
      ) : !profile ? (
        <div className="text-center py-4">
          <p className="text-sm text-slate-500 mb-3">No ACOLYTE profile has been created for this project yet.</p>
          <Link to="/acolyte/settings" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#1E2D4A]">
            <ShieldPlus className="w-4 h-4" /> Create ACOLYTE Profile
          </Link>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
            <div>
              <div className="text-sm font-semibold text-slate-800">{profile.service_tier || 'ACOLYTE Watch'}</div>
              <div className="text-xs text-slate-500">{profile.service_status || 'Not Started'}</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-slate-900">{Math.round(profile.current_readiness_score || 0)}%</div>
              <PostureBadge status={overallStatusFromScore(profile.current_readiness_score)} />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            <Tile label="Critical" value={stats.critical} tone="text-red-600" />
            <Tile label="High" value={stats.high} tone="text-orange-600" />
            <Tile label="Open Fixes" value={stats.openRemediation} tone="text-blue-600" />
            <Tile label="IR Plan" value={stats.incidentStatus} tone="text-slate-700" small />
          </div>
        </>
      )}
    </div>
  );
}

function Tile({ label, value, tone, small }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
      <div className={`font-bold ${tone} ${small ? 'text-xs leading-tight' : 'text-lg'}`}>{value ?? '—'}</div>
      <div className="text-[10px] font-medium text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}