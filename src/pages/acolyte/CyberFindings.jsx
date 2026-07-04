import { useState, useEffect, useCallback, useMemo } from 'react';
import { AlertTriangle, Plus, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAcolyteScope } from '@/lib/useAcolyteScope';
import { SEVERITIES, FINDING_STATUSES, FINDING_CATEGORIES } from '@/lib/acolyte';
import AcolyteHeader from '@/components/acolyte/AcolyteHeader';
import AcolyteProjectBar from '@/components/acolyte/AcolyteProjectBar';
import NoProjectState from '@/components/acolyte/NoProjectState';
import { SeverityBadge } from '@/components/acolyte/AcolyteBadges';
import FindingFormModal from '@/components/acolyte/FindingFormModal';
import FindingDetail from '@/components/acolyte/FindingDetail';
import RemediationFormModal from '@/components/acolyte/RemediationFormModal';
import StatusBadge from '@/components/StatusBadge';

const SEV_ORDER = ['Critical', 'High', 'Moderate', 'Low', 'Informational'];

export default function CyberFindings() {
  const scope = useAcolyteScope();
  const { project, projects, projectId, selectProject, orgNameForProject, readOnly, user } = scope;
  const [findings, setFindings] = useState([]);
  const [remediations, setRemediations] = useState([]);
  const [evLabels, setEvLabels] = useState({});
  const [poamLabels, setPoamLabels] = useState({});
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);
  const [remedFrom, setRemedFrom] = useState(null);
  const [fSev, setFSev] = useState('All');
  const [fCat, setFCat] = useState('All');
  const [fStatus, setFStatus] = useState('All');
  const [fOwner, setFOwner] = useState('');

  const load = useCallback(async () => {
    if (!projectId) { setLoading(false); return; }
    setLoading(true);
    const [f, r, ev, pm] = await Promise.all([
      base44.entities.CyberFinding.filter({ project_id: projectId }, '-created_date').catch(() => []),
      base44.entities.AcolyteRemediationItem.filter({ project_id: projectId }).catch(() => []),
      base44.entities.ProjectEvidence.filter({ project_id: projectId }).catch(() => []),
      base44.entities.ProjectPOAM.filter({ project_id: projectId }).catch(() => []),
    ]);
    setFindings(f);
    setRemediations(r);
    setEvLabels(Object.fromEntries(ev.map((e) => [e.id, e.evidence_title])));
    setPoamLabels(Object.fromEntries(pm.map((p) => [p.id, p.poam_title])));
    setLoading(false);
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => findings.filter((f) =>
    (fSev === 'All' || f.severity === fSev) &&
    (fCat === 'All' || f.finding_category === fCat) &&
    (fStatus === 'All' || f.finding_status === fStatus) &&
    (!fOwner || (f.owner || '').toLowerCase().includes(fOwner.toLowerCase()))
  ), [findings, fSev, fCat, fStatus, fOwner]);

  const grouped = useMemo(() => {
    const g = {};
    SEV_ORDER.forEach((s) => { g[s] = filtered.filter((f) => f.severity === s); });
    return g;
  }, [filtered]);

  return (
    <div className="space-y-4">
      <AcolyteHeader
        title="Cyber Findings"
        subtitle="Operational cyber findings from posture, vulnerability, incident readiness, and compliance reviews."
        icon={AlertTriangle}
        right={!readOnly && project ? (
          <button onClick={() => { setEditing(null); setModal(true); }} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-white text-[#0F1E3C] rounded-lg hover:bg-slate-100">
            <Plus className="w-4 h-4" /> New Finding
          </button>
        ) : null}
      />
      <AcolyteProjectBar projects={projects} projectId={projectId} onSelect={selectProject} orgName={orgNameForProject} />

      {!project ? (
        <NoProjectState />
      ) : loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3">
            <select className="form-input w-auto" value={fSev} onChange={(e) => setFSev(e.target.value)}>
              <option value="All">All severities</option>
              {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select className="form-input w-auto" value={fCat} onChange={(e) => setFCat(e.target.value)}>
              <option value="All">All categories</option>
              {FINDING_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="form-input w-auto" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
              <option value="All">All statuses</option>
              {FINDING_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <input className="form-input w-auto flex-1 min-w-[160px]" placeholder="Filter by owner…" value={fOwner} onChange={(e) => setFOwner(e.target.value)} />
          </div>

          {filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-500">
              {findings.length === 0 ? 'No cyber findings have been recorded yet.' : 'No findings match this view.'}
            </div>
          ) : (
            SEV_ORDER.filter((s) => grouped[s].length > 0).map((sev) => (
              <div key={sev}>
                <div className="flex items-center gap-2 mb-2">
                  <SeverityBadge severity={sev} />
                  <span className="text-xs text-slate-400">{grouped[sev].length}</span>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                  {grouped[sev].map((f) => (
                    <button key={f.id} onClick={() => setDetail(f)} className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-800 truncate">{f.finding_title}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{f.finding_category}{f.owner ? ` · ${f.owner}` : ''}{f.target_resolution_date ? ` · Target ${f.target_resolution_date}` : ''}</div>
                      </div>
                      <StatusBadge status={f.finding_status} size="xs" />
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </>
      )}

      {modal && project && (
        <FindingFormModal project={project} existing={editing} user={user}
          onClose={() => setModal(false)} onSaved={() => { setModal(false); load(); }} />
      )}
      {detail && (
        <FindingDetail
          finding={detail}
          evidenceLabels={evLabels}
          poamLabels={poamLabels}
          remediationTitles={remediations.filter((r) => r.finding_id === detail.id).map((r) => r.remediation_title)}
          readOnly={readOnly}
          onClose={() => setDetail(null)}
          onEdit={() => { setEditing(detail); setDetail(null); setModal(true); }}
          onCreateRemediation={() => { setRemedFrom(detail); setDetail(null); }}
        />
      )}
      {remedFrom && project && (
        <RemediationFormModal project={project} fromFinding={remedFrom} findings={findings} user={user}
          onClose={() => setRemedFrom(null)} onSaved={() => { setRemedFrom(null); load(); }} />
      )}
    </div>
  );
}