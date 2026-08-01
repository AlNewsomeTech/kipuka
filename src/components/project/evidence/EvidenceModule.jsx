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

export default function EvidenceModule({ project, readOnly }) {
  const [evidence, setEvidence] = useState([]);
  const [controls, setControls] = useState([]);
  const [objectives, setObjectives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('all');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [evidenceRecords, assessments, objectiveRecords] = await Promise.all([
      base44.entities.ProjectEvidence.filter({ project_id: project.id }).catch(() => []),
      base44.entities.ControlAssessment.filter({ project_id: project.id }).catch(() => []),
      base44.entities.AssessmentObjectiveLibrary.filter({ active: true }, 'objective_id', 500).catch(() => []),
    ]);
    setEvidence(evidenceRecords);
    setControls(assessments);
    setObjectives(objectiveRecords);
    setLoading(false);
  }, [project.id]);

  useEffect(() => { load(); }, [load]);

  const currentEvidence = useMemo(
    () => evidence.filter((item) => !['Archived', 'Superseded'].includes(item.review_status)),
    [evidence],
  );
  const expired = useMemo(() => currentEvidence.filter((item) => item.review_status === 'Expired' || isExpired(item)), [currentEvidence]);
  const rejected = useMemo(() => currentEvidence.filter((item) => item.review_status === 'Rejected'), [currentEvidence]);

  const byControl = useMemo(() => {
    const map = {};
    controls.forEach((control) => { map[control.control_id] = { control, items: [] }; });
    currentEvidence.forEach((item) => (item.control_ids || []).forEach((controlId) => {
      if (!map[controlId]) map[controlId] = { control: { control_id: controlId, control_title: '(unmapped control)' }, items: [] };
      map[controlId].items.push(item);
    }));
    return map;
  }, [controls, currentEvidence]);

  const missing = useMemo(() => controls.filter((control) => !(byControl[control.control_id]?.items.length)), [controls, byControl]);

  const renderCards = (items, compact = false) => (
    <div className="grid gap-3">{items.map((item) => <EvidenceCard
      key={item.id} item={item} compact={compact} readOnly={readOnly}
      onEdit={() => { setEditing(item); setModal(true); }} onRefresh={load}
    />)}</div>
  );

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <ListChecks className="w-5 h-5 text-[#0F1E3C]" />
            <div>
              <h1 className="text-lg font-bold text-slate-900">Evidence Vault</h1>
              <p className="text-xs text-slate-500 mt-0.5">Private, SHA-256 verified evidence with reviewer separation and immutable lifecycle history.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => exportEvidenceIndex(evidence, project)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200">
              <Download className="w-4 h-4" /> Export Index
            </button>
            {!readOnly && <button onClick={() => { setEditing(null); setModal(true); }} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52]">
              <Plus className="w-4 h-4" /> Upload Evidence
            </button>}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {VIEWS.map((option) => <button key={option.key} onClick={() => setView(option.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${view === option.key ? 'bg-[#0F1E3C] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {option.label}
            {option.key === 'expired' && expired.length > 0 && <span className="ml-1.5 text-amber-300">({expired.length})</span>}
            {option.key === 'rejected' && rejected.length > 0 && <span className="ml-1.5 text-red-300">({rejected.length})</span>}
            {option.key === 'missing' && missing.length > 0 && <span className="ml-1.5 opacity-70">({missing.length})</span>}
          </button>)}
        </div>
      </div>

      {view === 'all' && (currentEvidence.length ? renderCards(currentEvidence) : <Empty text="No evidence uploaded yet." />)}

      {view === 'by_control' && <div className="space-y-3">
        {Object.values(byControl).filter((group) => group.items.length).map((group) => <div key={group.control.control_id} className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-sm font-bold text-slate-800 mb-2"><span className="font-mono text-slate-500">{group.control.control_id}</span> {group.control.control_title}</div>
          {renderCards(group.items, true)}
        </div>)}
        {Object.values(byControl).every((group) => !group.items.length) && <Empty text="No evidence mapped to controls yet." />}
      </div>}

      {view === 'missing' && (missing.length === 0 ? <Empty text="Every tracked control has at least one current evidence record." /> : <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {missing.map((control) => <div key={control.control_id} className="flex items-center gap-2 px-4 py-2.5 text-sm">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <span className="font-mono text-xs text-slate-500">{control.control_id}</span>
          <span className="text-slate-700">{control.control_title}</span>
          <span className="ml-auto text-xs text-amber-600 font-semibold">No evidence</span>
        </div>)}
      </div>)}

      {view === 'expired' && (expired.length ? renderCards(expired) : <Empty text="No expired or stale evidence." />)}
      {view === 'rejected' && (rejected.length ? renderCards(rejected) : <Empty text="No rejected evidence." />)}

      {modal && <EvidenceUploadModal
        project={project} controls={controls} objectives={objectives} existing={editing}
        onClose={() => setModal(false)} onSaved={() => { setModal(false); load(); }}
      />}
    </div>
  );
}

function Empty({ text }) {
  return <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-500">{text}</div>;
}
