import { Building2 } from 'lucide-react';

const IT_ENVIRONMENTS = [
  'Microsoft 365 Commercial',
  'Microsoft 365 GCC',
  'Microsoft 365 GCC High',
  'Google Workspace',
  'On-Premises',
  'Hybrid',
];

// Step 1 — collect the company profile. `data` is the working object, `set(k,v)`
// updates it, `onNext` advances (validation lives here).
export default function OnboardingCompanyStep({ data, set, onNext }) {
  const valid = (data.company_name || '').trim().length > 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-lg bg-[#0F1E3C] flex items-center justify-center flex-shrink-0">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Tell us about your company</h2>
          <p className="text-sm text-slate-500">This sets up your secure workspace. You can change any of this later.</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Company name *" full>
          <input className="form-input" value={data.company_name || ''} onChange={(e) => set('company_name', e.target.value)} placeholder="Acme Defense Components, LLC" />
        </Field>
        <Field label="CAGE code">
          <input className="form-input" value={data.cage_code || ''} onChange={(e) => set('cage_code', e.target.value)} placeholder="1AB23" />
        </Field>
        <Field label="DUNS / UEI">
          <input className="form-input" value={data.duns_uei || ''} onChange={(e) => set('duns_uei', e.target.value)} placeholder="SAM.gov Unique Entity ID" />
        </Field>
        <Field label="DoD contracts held or pursued" full>
          <textarea className="form-input min-h-[70px]" value={data.dod_contracts || ''} onChange={(e) => set('dod_contracts', e.target.value)} placeholder="Prime/sub contracts, agencies, or opportunities you are pursuing." />
        </Field>
        <Field label="Number of employees">
          <input type="number" min="0" className="form-input" value={data.employee_count ?? ''} onChange={(e) => set('employee_count', e.target.value)} placeholder="25" />
        </Field>
        <Field label="IT environment">
          <select className="form-input" value={data.it_environment || ''} onChange={(e) => set('it_environment', e.target.value)}>
            <option value="">Select…</option>
            {IT_ENVIRONMENTS.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </Field>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-lg border border-slate-200 p-3">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" className="w-4 h-4" checked={!!data.uses_msp} onChange={(e) => set('uses_msp', e.target.checked)} />
            <span className="text-sm text-slate-700">We use a Managed Service Provider (MSP)</span>
          </label>
          {data.uses_msp && (
            <input className="form-input mt-2" value={data.msp_name || ''} onChange={(e) => set('msp_name', e.target.value)} placeholder="MSP name" />
          )}
        </div>
        <div className="rounded-lg border border-slate-200 p-3 flex items-center">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" className="w-4 h-4" checked={!!data.has_existing_ssp} onChange={(e) => set('has_existing_ssp', e.target.checked)} />
            <span className="text-sm text-slate-700">We already have a System Security Plan (SSP)</span>
          </label>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button onClick={onNext} disabled={!valid}
          className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52] disabled:opacity-50">
          Continue to scoping →
        </button>
      </div>
    </div>
  );
}

function Field({ label, children, full }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  );
}