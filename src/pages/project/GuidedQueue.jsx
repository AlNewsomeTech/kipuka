import { useState, useEffect, useMemo } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Compass, Loader2, ArrowRight, CheckCircle2 } from 'lucide-react';
import { buildGuidedQueue, targetLevelsFor, familyOf } from '@/lib/doNextEngine';
import { toSimpleStatus, SIMPLE_STATUS, SIMPLE_STATUS_TONE } from '@/lib/simpleStatus';
import ControlMetaBadges from '@/components/guided/ControlMetaBadges';
import ConfidentialityFooter from '@/components/legal/ConfidentialityFooter';
import { scfReferencesFor } from '@/lib/scfCrossReferences';

function SimpleBadge({ assessment, realStatus }) {
  const simple = toSimpleStatus(assessment || realStatus);
  const t = SIMPLE_STATUS_TONE[simple];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold text-[11px] px-2.5 py-0.5 ${t.bg} ${t.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} /> {simple}
    </span>
  );
}

export default function GuidedQueue() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [library, setLibrary] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);

  const familyFilter = useMemo(() => {
    const raw = new URLSearchParams(location.search).get('family');
    return raw ? raw.split(',').map((f) => f.trim().toUpperCase()) : null;
  }, [location.search]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const proj = await base44.entities.Project.get(id).catch(() => null);
      const levels = targetLevelsFor(proj);
      const [lib, asmt] = await Promise.all([
        base44.entities.ControlLibrary.filter({ active: true }).catch(() => []),
        base44.entities.ControlAssessment.filter({ project_id: id }).catch(() => []),
      ]);
      if (!alive) return;
      setProject(proj);
      setLibrary(lib.filter((c) => levels.includes(c.cmmc_level)));
      setAssessments(asmt);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [id]);

  const queue = useMemo(() => {
    let q = buildGuidedQueue(library, assessments, project);
    if (familyFilter) q = q.filter((it) => familyFilter.includes(familyOf(it.control_id)));
    return q;
  }, [library, assessments, project, familyFilter]);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;
  }

  const done = queue.filter((it) => toSimpleStatus(it.assessment || it.status) === SIMPLE_STATUS.DONE).length;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2.5">
          <Compass className="w-5 h-5 text-[#0F1E3C]" />
          <h1 className="text-lg font-bold text-slate-900">Guided Setup</h1>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          {done} of {queue.length} controls done{familyFilter ? ` · filtered to ${familyFilter.join(', ')}` : ''}. Work top-to-bottom — highest-impact controls first.
        </p>
        {familyFilter && (
          <Link to={`/projects/${id}/guided`} className="text-xs text-blue-600 hover:underline mt-1 inline-block">Clear filter — show all controls</Link>
        )}
      </div>

      {queue.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-500">
          No controls to show. Generate your control list in Control Implementation first.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {queue.map((it) => {
            const isDone = toSimpleStatus(it.assessment || it.status) === SIMPLE_STATUS.DONE;
            const scfReferences = project?.control_set_mode === 'CMMC + SCF'
              ? scfReferencesFor(it.control_id)
              : [];
            return (
              <button
                key={it.control_id}
                onClick={() => navigate(`/projects/${id}/guided/${encodeURIComponent(it.control_id)}`)}
                className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 text-left"
              >
                {isDone
                  ? <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  : <span className="w-5 h-5 rounded-full border-2 border-slate-300 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-semibold text-slate-500">{it.control_id}</span>
                    <SimpleBadge assessment={it.assessment} realStatus={it.status} />
                    {scfReferences.length > 0 && (
                      <span className="inline-flex items-center rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] font-bold text-cyan-800 ring-1 ring-inset ring-cyan-200">
                        {scfReferences.length} SCF {scfReferences.length === 1 ? 'reference' : 'references'}
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-medium text-slate-800 truncate mt-0.5">{it.control_title}</div>
                </div>
                <ControlMetaBadges points={it.points} minutes={it.minutes} />
                <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
              </button>
            );
          })}
        </div>
      )}

      <ConfidentialityFooter />
    </div>
  );
}