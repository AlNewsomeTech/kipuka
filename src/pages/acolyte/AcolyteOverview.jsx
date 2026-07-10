import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield, Settings, TrendingUp, AlertTriangle, ListChecks, Loader2,
  Calendar, ArrowRight, Sparkles,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAcolyteScope } from '@/lib/useAcolyteScope';
import { useAcolyteProfile } from '@/lib/useAcolyteProfile';
import {
  ACOLYTE_BRAND, POSTURE_CARDS, overallStatusFromScore,
  OPEN_FINDING_STATUSES, OPEN_REMEDIATION_STATUSES, isRemediationOverdue,
} from '@/lib/acolyte';
import { canUseAssistant, summarizeReadiness } from '@/lib/acolyteAssistant';
import AcolyteHeader from '@/components/acolyte/AcolyteHeader';
import AcolyteProjectBar from '@/components/acolyte/AcolyteProjectBar';
import NoProjectState from '@/components/acolyte/NoProjectState';
import PostureCard from '@/components/acolyte/PostureCard';
import PostureDashboardPanel from '@/components/acolyte/PostureDashboardPanel';
import AssistantPanel from '@/components/acolyte/AssistantPanel';
import { PostureBadge } from '@/components/acolyte/AcolyteBadges';

function Field({ label, value }) {
  return (
    <div>
      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{label}</div>
      <div className="text-sm font-medium text-slate-800 mt-0.5">{value || '\u2014'}</div>
    </div>
  );
}

export default function AcolyteOverview() {
  const scope = useAcolyteScope();
  const { project, projects, projectId, selectProject, orgNameForProject, orgRole, user } = scope;
  const { profile, loading: profileLoading, refresh: refreshProfile } = useAcolyteProfile(projectId);
  const [stats, setStats] = useState(null);
  const [assistant, setAssistant] = useState(false);

  const applyReadiness = async (textPlain) => {
    const html = `<p>${textPlain.replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br/>')}</p>`;
    if (profile?.id) await base44.entities.AcolyteProfile.update(profile.id, { executive_summary: html });
    else await base44.entities.AcolyteProfile.create({ project_id: projectId, organization_id: project.organization_id || '', executive_summary: html });
    refreshProfile();
  };

  useEffect(() => {
    let alive = true;
    if (!projectId) { setStats(null); return; }
    (async () => {
      const [findings, remediations] = await Promise.all([
        base44.entities.CyberFinding.filter({ project_id: projectId }).catch(() => []),
        base44.entities.AcolyteRemediationItem.filter({ project_id: projectId }).catch(() => []),
      ]);
      if (!alive) return;
      const openF = findings.filter((f) => OPEN_FINDING_STATUSES.includes(f.finding_status));
      setStats({
        critical: openF.filter((f) => f.severity === 'Critical').length,
        high: openF.filter((f) => f.severity === 'High').length,
        moderate: openF.filter((f) => f.severity === 'Moderate').length,
        acceptedRisk: findings.filter((f) => f.finding_status === 'Accepted Risk').length,
        openRemediation: remediations.filter((r) => OPEN_REMEDIATION_STATUSES.includes(r.status)).length,
        overdueRemediation: remediations.filter(isRemediationOverdue).length,
        pendingValidation: remediations.filter((r) => r.status === 'Pending Validation').length,
      });
    })();
    return () => { alive = false; };
  }, [projectId]);

  const score = Math.round(profile?.current_readiness_score || project?.current_readiness_score || 0);
  const overall = overallStatusFromScore(score);

  return (
    <div className="space-y-4">
      <AcolyteHeader
        showPositioning
        right={
          <div className="flex items-center gap-2">
            {project && canUseAssistant(orgRole, 'summarize_readiness') && (
              <button onClick={() => setAssistant(true)} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-white text-purple-700 rounded-lg hover:bg-slate-100">
                <Sparkles className="w-4 h-4" /> Summarize Readiness
              </button>
            )}
            <Link to="/acolyte/settings" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-white text-[#0F1E3C] rounded-lg hover:bg-slate-100">
              <Settings className="w-4 h-4" /> ACOLYTE Settings
            </Link>
          </div>
        }
      />

      <AcolyteProjectBar projects={projects} projectId={projectId} onSelect={selectProject} orgName={orgNameForProject} />

      {!project ? (
        <NoProjectState />
      ) : profileLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
      ) : (
        <>
          {/* Service profile + readiness */}
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-4 h-4 text-[#0F1E3C]" />
                <h2 className="text-sm font-bold text-slate-800">Service Profile</h2>
              </div>
              {profile ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Field label="Service Tier" value={profile.service_tier} />
                  <Field label="Service Status" value={profile.service_status} />
                  <Field label="Review Cadence" value={profile.review_cadence} />
                  <Field label="Pac-Sec Service Lead" value={profile.pacsec_service_lead} />
                  <Field label="Primary Service Owner" value={profile.primary_service_owner} />
                  <Field label="Executive Contact" value={profile.executive_contact_name} />
                  <Field label="Service Start" value={profile.service_start_date} />
                  <Field label="Renewal Date" value={profile.service_renewal_date} />
                  <Field label="Organization" value={orgNameForProject} />
                </div>
              ) : (
                <div className="text-sm text-slate-500">
                  No ACOLYTE service profile yet for this project.{' '}
                  <Link to="/acolyte/settings" className="text-blue-600 font-semibold hover:underline">Configure the service</Link>.
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col items-center justify-center text-center">
              <div className="relative w-28 h-28">
                <svg viewBox="0 0 36 36" className="w-28 h-28 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" className="stroke-slate-100" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.9" fill="none" className="stroke-blue-500" strokeWidth="3"
                    strokeDasharray={`${score} 100`} strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-slate-900">{score}%</span>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wide">Readiness</span>
                </div>
              </div>
              <div className="mt-3"><PostureBadge status={overall} /></div>
              <div className="mt-3 text-xs text-slate-500 space-y-0.5">
                <div>Last review: <b className="text-slate-700">{profile?.last_review_date || '\u2014'}</b></div>
                <div>Next target: <b className="text-slate-700">{profile?.next_review_target_date || '\u2014'}</b></div>
              </div>
            </div>
          </div>

          {/* Six posture cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {POSTURE_CARDS.map((c) => (
              <PostureCard
                key={c.key}
                label={c.label}
                blurb={c.blurb}
                status={profile?.[c.key] || 'Unknown'}
                findingsTo="/acolyte/findings"
                remediationTo="/acolyte/remediation"
              />
            ))}
          </div>

          {/* Cyber posture (live PostureAssessment data) */}
          <PostureDashboardPanel organizationId={project?.organization_id} />

          {/* Open issue summary */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-bold text-slate-800">Open Issue Summary</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              <SummaryTile label="Critical Findings" value={stats?.critical} tone="red" />
              <SummaryTile label="High Findings" value={stats?.high} tone="orange" />
              <SummaryTile label="Moderate Findings" value={stats?.moderate} tone="amber" />
              <SummaryTile label="Open Remediation" value={stats?.openRemediation} tone="blue" />
              <SummaryTile label="Overdue Remediation" value={stats?.overdueRemediation} tone="red" />
              <SummaryTile label="Pending Validation" value={stats?.pendingValidation} tone="amber" />
              <SummaryTile label="Accepted Risk" value={stats?.acceptedRisk} tone="slate" />
            </div>
          </div>

          {/* Next recommended actions */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-[#0F1E3C]" />
                <h2 className="text-sm font-bold text-slate-800">Next Recommended Actions</h2>
              </div>
              <Link to="/acolyte/settings" className="text-xs font-semibold text-blue-600 hover:underline">Edit</Link>
            </div>
            {profile?.next_steps_summary ? (
              <div className="prose prose-slate prose-sm max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: profile.next_steps_summary }} />
            ) : (
              <p className="text-sm text-slate-400 italic">No next steps recorded yet. Add them in ACOLYTE Settings.</p>
            )}
          </div>

          {/* Executive summary + risks */}
          {(profile?.executive_summary || profile?.key_risks_summary) && (
            <div className="grid lg:grid-cols-2 gap-4">
              {profile?.executive_summary && (
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <h3 className="text-sm font-bold text-slate-800 mb-2">Executive Summary</h3>
                  <div className="prose prose-slate prose-sm max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: profile.executive_summary }} />
                </div>
              )}
              {profile?.key_risks_summary && (
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <h3 className="text-sm font-bold text-slate-800 mb-2">Key Risks</h3>
                  <div className="prose prose-slate prose-sm max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: profile.key_risks_summary }} />
                </div>
              )}
            </div>
          )}

          {/* Quick links */}
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { to: '/acolyte/reviews', label: 'Readiness Reviews', icon: Calendar },
              { to: '/acolyte/findings', label: 'Cyber Findings', icon: AlertTriangle },
              { to: '/acolyte/reports', label: 'Executive Cyber Reports', icon: TrendingUp },
            ].map((l) => {
              const Icon = l.icon;
              return (
                <Link key={l.to} to={l.to} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between hover:border-blue-300 hover:shadow-sm transition">
                  <span className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Icon className="w-4 h-4 text-[#0F1E3C]" /> {l.label}</span>
                  <ArrowRight className="w-4 h-4 text-blue-500" />
                </Link>
              );
            })}
          </div>

          <p className="text-[11px] text-slate-400 pt-1">{ACOLYTE_BRAND.preparedBy}. {ACOLYTE_BRAND.reportDisclaimer}</p>
        </>
      )}

      <AssistantPanel
        open={assistant}
        title="Summarize Readiness"
        actionLabel="Summarize Readiness"
        applyLabel="Apply to Executive Summary"
        organizationId={project?.organization_id}
        user={user}
        targetEntity="AcolyteProfile"
        targetRecordId={profile?.id || ''}
        generate={async () => {
          const [findings, remediations, irRows] = await Promise.all([
            base44.entities.CyberFinding.filter({ project_id: projectId }).catch(() => []),
            base44.entities.AcolyteRemediationItem.filter({ project_id: projectId }).catch(() => []),
            base44.entities.IncidentReadinessRecord.filter({ project_id: projectId }).catch(() => []),
          ]);
          return summarizeReadiness({ project, orgName: orgNameForProject, profile, findings, remediations, incident: irRows[0] });
        }}
        onApply={applyReadiness}
        onClose={() => setAssistant(false)}
      />
    </div>
  );
}

const TONES = {
  red: 'text-red-600', orange: 'text-orange-600', amber: 'text-amber-600',
  blue: 'text-blue-600', slate: 'text-slate-600',
};
function SummaryTile({ label, value, tone }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
      <div className={`text-2xl font-bold ${TONES[tone]}`}>{value ?? '\u2014'}</div>
      <div className="text-[11px] font-medium text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}