const FIELDS = [
  { key: 'legal_name', label: 'Legal company name' },
  { key: 'uei', label: 'UEI' },
  { key: 'primary_cage_code', label: 'CAGE code' },
  { key: 'sam_status', label: 'SAM status' },
  { key: 'primary_poc', label: 'Primary point of contact' },
  { key: 'it_poc', label: 'IT point of contact' },
  { key: 'compliance_poc', label: 'Compliance point of contact' },
  { key: 'affirming_official_name', label: 'Affirming Official' },
];

export default function StepCompanyProfile({ data, onChange }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-slate-900">Step 1 — Confirm company profile</h2>
      <p className="text-sm text-slate-500 mt-1 mb-5">
        Confirm the details below. Pre-filled values come from your organization profile; edit any that need correcting.
      </p>
      <div className="grid sm:grid-cols-2 gap-4">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label className="block text-xs font-semibold text-slate-600 mb-1">{f.label}</label>
            <input
              className="form-input"
              value={data[f.key] || ''}
              onChange={(e) => onChange({ ...data, [f.key]: e.target.value })}
              placeholder={f.label}
            />
          </div>
        ))}
      </div>
    </div>
  );
}