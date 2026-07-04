import { useState, useEffect, useCallback, useMemo } from 'react';
import { Wrench, Plus, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAcolyteScope } from '@/lib/useAcolyteScope';
import { REMEDIATION_PRIORITIES, REMEDIATION_STATUSES, isRemediationOverdue } from '@/lib/acolyte';
import AcolyteHeader from '@/components/acolyte/AcolyteHeader';
import AcolyteProjectBar from '@/components/acolyte/AcolyteProjectBar';
import NoProjectState from '@/components/acolyte/NoProjectState';
import { PriorityBadge } from '@/components/acolyte/AcolyteBadges';
import RemediationFormModal from '@/components/acolyte/RemediationFormModal';
import StatusBadge from '@/components/StatusBadge';

const VIEWS = [
  { key: 'all', label: 'All Items' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'urgent', label: 'Urgent / High' },
  { key: 'blocked', label: 'Blocked' },
  { key: 'pending', label: 'Pending Validation' },
];

export default function RemediationQueue() {
  const scope = useAcolyteScope();
  const { project, projects, projectId, selectProject, orgNameForProject, readOnly, user } = scope;
  const [items, setItems] = useState([]);
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [view, setView] = useState('all');
  const [fPriority, setFPriority] = useState('All');
  const [fStatus, setFStatus] = useState('All');
  const [fOwner, setFOwner] = useState('');

  const load = useCallback(async () => {
    if (!projectId) { setLoading(false); return; }
    setLoading(true);
    const [r, f] = await Promise.all([
      base44.entities.AcolyteRemediationItem.filter({ project_id: projectId }, '-created_date').catch(() => []),
      base44.entities.CyberFinding.filter({ project_id: projectId }).catch(() => []),
    ]);
    setItems(r);
    setFindings(f);
    setLoading(false);
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => {
    let r = items;
    if (view === 'overdue') r = r.filter(isRemediationOverdue);
    else if (view === 'urgent') r = r.filter((i) => ['Urgent', 'High'].includes(i.priority) && !['Complete', 'Deferred'].includes(i.status));
    else if (view === 'blocked') r = r.filter((i) => i.status === 'Blocked');
    else if (view === 'pending') r = r.filter((i) => i.status === 'Pending Validation');
    return r.filter((i) =>
      (fPriority === 'All' || i.priority === fPriority) &&
      (fStatus === 'All' || i.status === fStatus) &&
      (!fOwner || (i.owner || '').toLowerCase().includes(fOwner.toLowerCase()))
    );
  }, [items, view, fPriority, fStatus, fOwner]);

  const findingTitle = (id) => findings.find((f) => f.id === id)?.finding_title;
  const overdueCount = useMemo(() => items.filter(isRemediationOverdue).length, [items]);

  return (
    <div className="space-y-4">
      <AcolyteHeader
        title="Remediation Queue"
        subtitle="Convert ACOLYTE findings into accountable, tracked remediation work."
        icon={Wrench}
        right={!readOnly && project ? (
          <button onClick={() => { setEditing(null); setModal(true); }} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-white text-[#0F1E3C] rounded-lg hover:bg-slate-100">
            <Plus className="w-4 h-4" /> New Remediation
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
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              {VIEWS.map((v) => (
                <button key={v.key} onClick={() => setView(v.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${view === v.key ? 'bg-[#0F1E3C] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {v.label}{v.key === 'overdue' && overdueCount > 0 && <span className="ml-1.5 text-red-300">({overdueCount})</span>}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <select className="form-input w-auto" value={fPriority} onChange={(e) => setFPriority(e.target.value)}>
                <option value="All">All priorities</option>
                {REMEDIATION_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <select className="form-input w-auto" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
                <option value="All">All statuses</option>
                {REMEDIATION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <input className="form-input w-auto flex-1 min-w-[160px]" placeholder="Filter by owner…" value={fOwner} onChange={(e) => setFOwner(e.target.value)} />
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-500">
              {items.length === 0 ? 'No ACOLYTE remediation items have been created yet.' : 'No remediation items in this view.'}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
              {rows.map((i) => {
                const overdue = isRemediationOverdue(i);
                return (
                  <button key={i.id} onClick={() => { if (!readOnly) { setEditing(i); setModal(true); } }}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-800 truncate">{i.remediation_title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {i.owner || 'Unassigned'}
                        {i.due_date && <span className={overdue ? 'text-red-600 font-semibold' : ''}> · Due {i.due_date}{overdue ? ' (overdue)' : ''}</span>}
                        {i.finding_id && findingTitle(i.finding_id) && <span> · From: {findingTitle(i.finding_id)}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <PriorityBadge priority={i.priority} />
                      <StatusBadge status={i.status} size="xs" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {modal && project && (
        <RemediationFormModal project={project} existing={editing} findings={findings} user={user}
          onClose={() => setModal(false)} onSaved={() => { setModal(false); load(); }} />
      )}
    </div>
  );
}