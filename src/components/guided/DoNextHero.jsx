import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Rocket, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { nextIncomplete, queueCounts, targetLevelsFor } from '@/lib/doNextEngine';
import { computeSprs } from '@/lib/sprsScoring';
import ControlMetaBadges from '@/components/guided/ControlMetaBadges';

// Item 4 — dashboard hero: "Continue implementation →" opens the highest-priority
// incomplete control; shows "X of Y done · current SPRS → projected".
export default function DoNextHero({ project }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const levels = targetLevelsFor(project);
      const [lib, asmt] = await Promise.all([
        base44.entities.ControlLibrary.filter({ active: true }).catch(() => []),
        base44.entities.ControlAssessment.filter({ project_id: project.id }).catch(() => []),
      ]);
      if (!alive) return;
      const inScope = lib.filter((c) => levels.includes(c.cmmc_level));
      setData({
        next: nextIncomplete(inScope, asmt, project),
        counts: queueCounts(inScope, asmt, project),
        sprs: computeSprs(asmt),
      });
    })();
    return () => { alive = false; };
  }, [project.id]);

  if (!data) {
    return (
      <div className="bg-[#0F1E3C] rounded-xl p-5 flex items-center justify-center h-24">
        <Loader2 className="w-5 h-5 animate-spin text-white/60" />
      </div>
    );
  }

  const { next, counts, sprs } = data;
  const allDone = !next;

  return (
    <div className="bg-[#0F1E3C] rounded-xl p-5 text-white">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold text-white/70 uppercase tracking-wide">
            <Rocket className="w-4 h-4" /> Guided Setup
          </div>
          {allDone ? (
            <h2 className="text-lg font-bold mt-1.5 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-400" /> All controls done — nice work!
            </h2>
          ) : (
            <>
              <h2 className="text-lg font-bold mt-1.5 truncate">Next up: {next.control_id} — {next.control_title}</h2>
              <div className="mt-2"><ControlMetaBadges points={next.points} minutes={next.minutes} /></div>
            </>
          )}
          <p className="text-sm text-white/70 mt-2">
            {counts.done} of {counts.total} controls done · SPRS {sprs.current} → <span className="text-green-300 font-semibold">{sprs.projected}</span> projected
          </p>
        </div>
        {!allDone && (
          <button
            onClick={() => navigate(`/projects/${project.id}/guided/${encodeURIComponent(next.control_id)}`)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold text-[#0F1E3C] bg-white hover:bg-slate-100"
          >
            Continue implementation <ArrowRight className="w-4 h-4" />
          </button>
        )}
        {allDone && (
          <button
            onClick={() => navigate(`/projects/${project.id}/guided`)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold text-[#0F1E3C] bg-white hover:bg-slate-100"
          >
            Review controls <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}