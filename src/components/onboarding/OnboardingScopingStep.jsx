import { useMemo } from 'react';
import { ClipboardList, ShieldCheck, Info, AlertTriangle } from 'lucide-react';
import { SCOPING_QUESTIONNAIRE, determineTrack, SCOPING_DISCLAIMER } from '@/lib/scopingQuestionnaire';

// Step 2 — plain-English scoping questionnaire. `answers` is a map of
// key → true | false | null ("Not sure"), and `setAnswer(key, val)` updates it.
// Shows a live track recommendation. Contradictory or unclear answers block
// Finish — the track is never defaulted to Level 1.
export default function OnboardingScopingStep({ answers, setAnswer, onBack, onFinish, submitting, finishLabelOverride }) {
  const result = useMemo(() => determineTrack(answers), [answers]);
  const answeredCount = SCOPING_QUESTIONNAIRE.filter((q) => answers[q.key] !== undefined).length;
  const allAnswered = answeredCount === SCOPING_QUESTIONNAIRE.length;
  const needsReview = result.track === 'Undetermined' || result.conflict === true;
  const canFinish = allAnswered && !needsReview;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-lg bg-[#0F1E3C] flex items-center justify-center flex-shrink-0">
          <ClipboardList className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Scoping questionnaire</h2>
          <p className="text-sm text-slate-500">Answer in plain English. We'll recommend your CMMC track and only show the requirements that apply to you.</p>
        </div>
      </div>

      <div className="space-y-3">
        {SCOPING_QUESTIONNAIRE.map((q, i) => (
          <div key={q.key} className="rounded-lg border border-slate-200 p-4">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800">{q.question}</p>
                <p className="text-xs text-slate-500 mt-1 flex items-start gap-1.5"><Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />{q.help}</p>
                <div className="flex gap-2 mt-3">
                  {[['Yes', true], ['No', false], ["Not sure", null]].map(([lbl, val]) => {
                    const active = answers[q.key] === val && answers[q.key] !== undefined;
                    return (
                      <button key={String(lbl)} type="button" onClick={() => setAnswer(q.key, val)}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${active ? 'bg-[#0F1E3C] text-white border-[#0F1E3C]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
                        {lbl}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Live recommendation */}
      <div className={`rounded-lg border p-4 ${result.track === 'Level 2' ? 'border-amber-200 bg-amber-50' : result.track === 'Level 1' ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-slate-50'}`}>
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className={`w-4 h-4 ${result.track === 'Level 2' ? 'text-amber-700' : result.track === 'Level 1' ? 'text-green-700' : 'text-slate-500'}`} />
          <span className="text-sm font-bold text-slate-800">
            Recommended track: {needsReview ? 'Needs review' : `CMMC ${result.track}`}
            {!needsReview && result.track === 'Level 1' && ' (15 FAR 52.204-21 requirements)'}
            {!needsReview && result.track === 'Level 2' && ' (110 requirements)'}
          </span>
        </div>
        <p className="text-xs text-slate-600">{result.rationale}</p>
      </div>

      {/* Needs-review blocker — we never guess a track on contradictory or unclear answers. */}
      {allAnswered && needsReview && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900">We can't confirm your CMMC track yet</p>
            <p className="text-xs text-amber-800 mt-1">
              {result.conflict
                ? 'You selected FCI-only and also indicated CUI is in scope. Those cannot both be true.'
                : 'Your answers do not clearly establish whether FCI or CUI is in scope.'}
              {' '}Please review your answers above, or contact Pac-Sec for a scoping review. We will not guess a track for you.
            </p>
          </div>
        </div>
      )}

      <p className="text-[11px] text-slate-400 leading-relaxed">{SCOPING_DISCLAIMER}</p>

      <div className="flex items-center justify-between pt-2">
        <button onClick={onBack} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200">← Back</button>
        <button onClick={onFinish} disabled={submitting || !canFinish}
          className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52] disabled:opacity-50">
          {submitting
            ? 'Setting up your workspace…'
            : !allAnswered
              ? `Answer all questions (${answeredCount}/${SCOPING_QUESTIONNAIRE.length})`
              : needsReview
                ? 'Needs review before continuing'
                : (finishLabelOverride || 'Finish setup & open dashboard →')}
        </button>
      </div>
    </div>
  );
}