import { ANSWER_OPTIONS } from '@/lib/postureAssessment';

const ANSWER_STYLES = {
  'Yes': 'bg-green-600 text-white border-green-600',
  'Partial': 'bg-amber-500 text-white border-amber-500',
  'No': 'bg-red-600 text-white border-red-600',
  'Not Applicable': 'bg-slate-500 text-white border-slate-500',
};

// One domain's set of questions, each with a Yes/Partial/No/N/A choice + note.
export default function PostureQuestionStep({ domain, questions, answers, readOnly, onAnswer }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">{domain.label}</h2>
          <p className="text-xs text-slate-500">Domain weight: {domain.weight} · {questions.length} questions</p>
        </div>
      </div>

      {questions.map((q, i) => {
        const current = answers?.[q.key] || {};
        return (
          <div key={q.key} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex gap-2">
              <span className="text-xs font-bold text-slate-400 mt-0.5">{i + 1}.</span>
              <p className="text-sm font-medium text-slate-800 flex-1">{q.text}</p>
            </div>
            <div className="flex flex-wrap gap-2 mt-3 ml-6">
              {ANSWER_OPTIONS.map((opt) => {
                const selected = current.answer === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    disabled={readOnly}
                    onClick={() => onAnswer(q.key, { ...current, answer: opt })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-60 ${
                      selected ? ANSWER_STYLES[opt] : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            <div className="ml-6 mt-2">
              <input
                type="text"
                disabled={readOnly}
                value={current.note || ''}
                onChange={(e) => onAnswer(q.key, { ...current, note: e.target.value })}
                placeholder="Optional note"
                className="form-input text-xs"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}