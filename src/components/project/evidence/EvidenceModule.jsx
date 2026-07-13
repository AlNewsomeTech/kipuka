import { useState, useEffect, useCallback, useMemo } from 'react';
import { ListChecks, Plus, Loader2, Download, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { isExpired } from '@/lib/evidenceQuality';
import EvidenceUploadModal from './EvidenceUploadModal';
import EvidenceCard from './EvidenceCard';
import { exportEvidenceIndex } from '@/lib/evidenceExport';

const VIEWS = [
  { key: 'all', label: 'All Evidence' },
  { key: 'by_control', label: 'By Control' },
  { key: 'missing', label: 'Missing by Control' },
  { key: 'expired', label: 'Expired / Stale' },
  { key: 'rejected', label: 'Rejected' },
];

export default function EvidenceModule({ project, readOnly, currentUser }) {
  const [evidence, setEvidence] = useState([]);
  const [controls, setControls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('all');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [ev, asmt] = await Promise.all([
      base44.entities.ProjectEvidence.filter({ project_id: project.id }).catch(() => []),
      base44.entities.ControlAssessment.filter({ project_id: project.id }).catch(() => []),
    ]);
    setEvidence(ev);
    setControls(asmt);
    setLoading(false);
  }, [project.id]);

  useEffect(() => { load(); }, [load]);

  const expired = useMemo(() => evidence.filter((e) => e.review_status === 'Expired' || isExpired(e)), [evidence]);
  const rejected = useMemo(() => evidence.filter((e) => e.review_status === 'Rejected'), [evidence]);

  const byControl = useMemo(() => {
    const map = {};
    controls.forEach((c) => { map[c.control_id] = { control: c, items: [] }; });
    evidence.forEach((e) => (e.control_ids || []).forEach((cid) => {
      if (!map[cid]) map[cid] = { control: { control_id: cid, control_title: '(unmapped control)' }, items: [] };
      map[cid].items.push(e);
    }));
    return map;
  }, [controls, evidence]);

  const missing = useMemo(() => controls.filter((c) => !(byControl[c.control_id]?.items.length)), [controls, byControl]);

  const remove = async (id) => {
    await base44.entities.ProjectEvidence.delete(id);
    load();
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <ListChecks className="w-5 h-5 text-[#0F1E3C]" />
            <h1 className="text-lg font-bold text-slate-900">Evidence Vault</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => exportEvidenceIndex(evidence, project)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200">
              <Download className="w-4 h-4" /> Export Index
            </button>
            {!readOnly && (
              <button onClick={() => { setEditing(null); setModal(true); }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52]">
                <Plus className="w-4 h-4" /> Upload Evidence
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {VIEWS.map((v) => (
            <button key={v.key} onClick={() => setView(v.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${view === v.key ? 'bg-[#0F1E3C] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {v.label}
              {v.key === 'expired' && expired.length > 0 && <span className="ml-1.5 text-amber-300">({expired.length})</span>}
              {v.key === 'rejected' && rejected.length > 0 && <span className="ml-1.5 text-red-300">({rejected.length})</span>}
              {v.key === 'missing' && missing.length > 0 && <span className="ml-1.5 opacity-70">({missing.length})</span>}
            </button>
          ))}
        </div>
      </div>

      {/* All */}
      {view === 'all' && (
        evidence.length === 0
          ? <Empty text="No evidence uploaded yet." />
          : <div className="grid gap-3">{evidence.map((e) => <EvidenceCard key={e.id} item={e} readOnly={readOnly} onEdit={() => { setEditing(e); setModal(true); }} onDelete={() => remove(e.id)} onRefresh={load} />)}</div>
      )}

      {/* By control */}
      {view === 'by_control' && (
        <div className="space-y-3">
          {Object.values(byControl).filter((g) => g.items.length).map((g) => (
            <div key={g.control.control_id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="text-sm font-bold text-slate-800 mb-2"><span className="font-mono text-slate-500">{g.control.control_id}</span> {g.control.control_title}</div>
              <div className="grid gap-2">{g.items.map((e) => <EvidenceCard key={e.id} item={e} compact readOnly={readOnly} onEdit={() => { setEditing(e); setModal(true); }} onDelete={() => remove(e.id)} onRefresh={load} />)}</div>
            </div>
          ))}
          {Object.values(byControl).every((g) => !g.items.length) && <Empty text="No evidence mapped to controls yet." />}
        </div>
      )}

      {/* Missing */}
      {view === 'missing' && (
        missing.length === 0
          ? <Empty text="Every tracked control has at least one piece of evidence." />
          : <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
              {missing.map((c) => (
                <div key={c.control_id} className="flex items-center gap-2 px-4 py-2.5 text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <span className="font-mono text-xs text-slate-500">{c.control_id}</span>
                  <span className="text-slate-700">{c.control_title}</span>
                  <span className="ml-auto text-xs text-amber-600 font-semibold">No evidence</span>
                </div>
              ))}
            </div>
      )}

      {/* Expired */}
      {view === 'expired' && (
        expired.length === 0 ? <Empty text="No expired or stale evidence." />
          : <div className="grid gap-3">{expired.map((e) => <EvidenceCard key={e.id} item={e} readOnly={readOnly} onEdit={() => { setEditing(e); setModal(true); }} onDelete={() => remove(e.id)} onRefresh={load} />)}</div>
      )}

      {/* Rejected */}
      {view === 'rejected' && (
        rejected.length === 0 ? <Empty text="No rejected evidence." />
          : <div className="grid gap-3">{rejected.map((e) => <EvidenceCard key={e.id} item={e} readOnly={readOnly} onEdit={() => { setEditing(e); setModal(true); }} onDelete={() => remove(e.id)} onRefresh={load} />)}</div>
      )}

      {modal && (
        <EvidenceUploadModal
          project={project}
          currentUser={currentUser}
          controls={controls}
          existing={editing}
          onClose={() => setModal(false)}
          onSaved={() => { setModal(false); load(); }}
        />
      )}
    </div>
  );
}

function Empty({ text }) {
  return <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-500">{text}</div>;
}