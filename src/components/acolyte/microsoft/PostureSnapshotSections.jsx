import { Link } from 'react-router-dom';
import { Users, KeyRound, MonitorSmartphone, Gauge, FileArchive } from 'lucide-react';

function Section({ icon: Icon, title, children, aside }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-[#0F1E3C]" />
          <h2 className="text-sm font-bold text-slate-800">{title}</h2>
        </div>
        {aside}
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
      <div className="text-xl font-bold text-slate-800">{value ?? '\u2014'}</div>
      <div className="text-[11px] font-medium text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}

const CA_STATE_LABELS = {
  enabled: 'Enabled',
  enabledForReportingButNotEnforced: 'Report-only',
  disabled: 'Disabled',
};

export default function PostureSnapshotSections({ snapshot, projectId }) {
  if (!snapshot) return null;
  const identity = snapshot.identity_summary || {};
  const mfa = snapshot.mfa_summary || {};
  const ca = snapshot.conditional_access_summary || {};
  const devices = snapshot.device_summary || {};
  const compliance = snapshot.compliance_summary || {};
  const score = snapshot.secure_score_summary || {};
  const privileged = identity.privileged_roles || {};

  return (
    <div className="space-y-4">
      <Section icon={Users} title="Microsoft Identity">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <Stat label="Users" value={identity.total_users} />
          <Stat label="Enabled" value={identity.enabled_users} />
          <Stat label="Disabled" value={identity.disabled_users} />
          <Stat label="Guests" value={identity.guest_users} />
          <Stat label="Security Groups" value={identity.security_groups} />
          <Stat label="Verified Domains" value={(identity.verified_domains || []).length} />
        </div>
        {Object.keys(privileged).length > 0 && (
          <div className="mt-4">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">Privileged access observations</div>
            <div className="space-y-1 max-h-44 overflow-y-auto">
              {Object.entries(privileged).map(([role, members]) => (
                <div key={role} className="text-xs text-slate-700 flex flex-wrap gap-1.5 items-baseline">
                  <span className="font-semibold">{role}:</span>
                  <span className="text-slate-500">{members.join(', ')}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="MFA Registered" value={mfa.mfa_registered} />
          <Stat label="MFA Capable" value={mfa.mfa_capable} />
          <Stat label="Not Registered" value={mfa.not_registered_count} />
          <Stat label="Coverage" value={mfa.coverage_percent != null ? `${mfa.coverage_percent}%` : null} />
        </div>
        <p className="text-[11px] text-slate-400 mt-2">MFA registration coverage only. Registration alone does not prove a complete CMMC MFA implementation.</p>
      </Section>

      <Section icon={KeyRound} title="Conditional Access">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-3">
          <Stat label="Policies" value={ca.total} />
          <Stat label="Enabled" value={ca.enabled} />
          <Stat label="Report-only" value={ca.report_only} />
          <Stat label="Disabled" value={ca.disabled} />
          <Stat label="Kipuka-managed" value={ca.kipuka_managed} />
        </div>
        {(ca.policies || []).length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-1.5 pr-3 font-semibold">Policy</th>
                  <th className="py-1.5 pr-3 font-semibold">State</th>
                  <th className="py-1.5 pr-3 font-semibold">Origin</th>
                  <th className="py-1.5 pr-3 font-semibold">Grant Controls</th>
                  <th className="py-1.5 font-semibold">Exclusions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ca.policies.map((p) => (
                  <tr key={p.graph_id}>
                    <td className="py-1.5 pr-3 font-medium text-slate-800">{p.display_name}</td>
                    <td className="py-1.5 pr-3 text-slate-600">{CA_STATE_LABELS[p.state] || p.state}</td>
                    <td className="py-1.5 pr-3">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${p.managed_by === 'Kipuka' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{p.managed_by === 'Kipuka' ? 'Kipuka-managed' : 'Customer'}</span>
                    </td>
                    <td className="py-1.5 pr-3 text-slate-600">{(p.grant_controls || []).join(', ') || '\u2014'}{p.auth_strength ? ` (${p.auth_strength})` : ''}</td>
                    <td className="py-1.5 text-slate-600">{(p.exclude_users || []).length + (p.exclude_groups || []).length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section icon={MonitorSmartphone} title="Endpoint Management (Intune)">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <Stat label="Managed Devices" value={devices.total} />
          <Stat label="Compliant" value={devices.compliant} />
          <Stat label="Noncompliant" value={devices.noncompliant} />
          <Stat label="Compliance Policies" value={compliance.total} />
          <Stat label="Config Policies" value={(compliance.configuration_policies || []).length} />
        </div>
        {(compliance.policies || []).length > 0 && (
          <div className="mt-3 space-y-1">
            {compliance.policies.map((p) => (
              <div key={p.graph_id} className="text-xs text-slate-700 flex items-center gap-2">
                <span className="font-medium">{p.display_name}</span>
                <span className="text-slate-400">{p.platform}</span>
                <span className="text-slate-500">{p.assignment_count} assignment(s)</span>
                {p.managed_by === 'Kipuka' && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">Kipuka-managed</span>}
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section icon={Gauge} title="Microsoft Secure Score"
        aside={<Link to="/acolyte/secure-score" className="text-xs font-semibold text-blue-600 hover:underline">History & trend</Link>}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Current Score" value={score.current_score} />
          <Stat label="Max Score" value={score.max_score} />
          <Stat label="Percent" value={score.percent != null ? `${score.percent}%` : null} />
          <Stat label="Report Date" value={score.report_date} />
        </div>
        <p className="text-[11px] text-slate-400 mt-2">
          Graph-collected scores enter the existing Secure Score history automatically. Manual export uploads remain available as a fallback.
        </p>
      </Section>

      <Section icon={FileArchive} title="Evidence Collected"
        aside={<Link to={`/projects/${projectId}/evidence`} className="text-xs font-semibold text-blue-600 hover:underline">Open evidence workspace</Link>}>
        {(snapshot.evidence_ids || []).length ? (
          <p className="text-xs text-slate-600">
            {snapshot.evidence_ids.length} hash-verified raw Graph evidence record(s) from this scan were preserved in the project evidence workspace (status: Needs Review). Newer scans supersede older posture evidence while retaining full history.
          </p>
        ) : (
          <p className="text-xs text-slate-400 italic">No evidence records were produced by this scan.</p>
        )}
      </Section>
    </div>
  );
}