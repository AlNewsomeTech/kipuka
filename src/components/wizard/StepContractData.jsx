const QUESTIONS = [
  { key: 'performs_dod_work', label: 'Does the company perform work for DoD or a DoD prime contractor?' },
  { key: 'handles_fci', label: 'Does the company receive, create, store, process, or transmit FCI?' },
  { key: 'handles_cui', label: 'Does the company receive, create, store, process, or transmit CUI?' },
  { key: 'has_far_52_204_21', label: 'Does any contract include FAR 52.204-21?' },
  { key: 'has_dfars_252_204_7012', label: 'Does any contract include DFARS 252.204-7012?' },
  { key: 'has_dfars_252_204_7020', label: 'Does any contract include DFARS 252.204-7020?' },
  { key: 'contract_mentions_cmmc_l1', label: 'Does any contract or solicitation mention CMMC Level 1?' },
  { key: 'contract_mentions_cmmc_l2', label: 'Does any contract or solicitation mention CMMC Level 2?' },
  { key: 'expected_future_cui', label: 'Does the company expect to handle CUI in the next 12 months?' },
];

function YesNo({ value, onChange }) {
  return (
    <div className="flex gap-2 flex-shrink-0">
      {[{ v: true, l: 'Yes' }, { v: false, l: 'No' }].map((opt) => (
        <button
          key={opt.l}
          type="button"
          onClick={() => onChange(opt.v)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
            value === opt.v
              ? opt.v
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'bg-slate-700 border-slate-700 text-white'
              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
          }`}
        >
          {opt.l}
        </button>
      ))}
    </div>
  );
}

export default function StepContractData({ data, onChange }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-slate-900">Step 2 — Contract &amp; data questions</h2>
      <p className="text-sm text-slate-500 mt-1 mb-5">
        Your answers drive the recommended CMMC path. Answer to the best of current knowledge.
      </p>
      <div className="divide-y divide-slate-100">
        {QUESTIONS.map((q) => (
          <div key={q.key} className="flex items-center justify-between gap-4 py-3">
            <span className="text-sm text-slate-700">{q.label}</span>
            <YesNo value={data[q.key]} onChange={(v) => onChange({ ...data, [q.key]: v })} />
          </div>
        ))}
      </div>
    </div>
  );
}