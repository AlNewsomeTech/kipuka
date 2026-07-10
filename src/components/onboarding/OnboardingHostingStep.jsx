import CuiHostingDecision from '@/components/cui/CuiHostingDecision';

// Step 3 (conditional) — CUI hosting decision gate. Only shown when the org handles
// CUI and the selected environment cannot hold CUI. A choice is required to finish.
export default function OnboardingHostingStep({ hosting, notes, onChange, onBack, onFinish, submitting }) {
  const chosen = !!hosting;
  return (
    <div className="space-y-5">
      <CuiHostingDecision hosting={hosting} notes={notes} onChange={onChange} />

      <div className="flex items-center justify-between pt-2">
        <button onClick={onBack} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200">← Back</button>
        <button
          onClick={onFinish}
          disabled={submitting || !chosen}
          className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52] disabled:opacity-50"
        >
          {submitting ? 'Setting up your workspace…' : !chosen ? 'Select where your CUI will live' : 'Finish setup & open dashboard →'}
        </button>
      </div>
    </div>
  );
}