import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useOrg } from '@/lib/orgContext';
import { determineTrack } from '@/lib/scopingQuestionnaire';
import { completeOnboarding } from '@/lib/onboarding';
import OnboardingCompanyStep from '@/components/onboarding/OnboardingCompanyStep';
import OnboardingScopingStep from '@/components/onboarding/OnboardingScopingStep';
import ConfidentialityFooter from '@/components/legal/ConfidentialityFooter';

// Mandatory first-run wizard for brand-new self-service signups. Rendered by the
// OnboardingGate before the main app shell. On finish it auto-creates the org,
// membership, company profile, default project, scoping profile, and control set.
export default function OnboardingWizard({ onComplete }) {
  const { user } = useAuth();
  const { refreshOrgs, selectOrg } = useOrg();
  const [step, setStep] = useState(1);
  const [company, setCompany] = useState({ it_environment: '' });
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const setCompanyField = (k, v) => setCompany((c) => ({ ...c, [k]: v }));
  const setAnswer = (k, v) => setAnswers((a) => ({ ...a, [k]: v }));

  const finish = async () => {
    setSubmitting(true);
    setError('');
    try {
      const trackResult = determineTrack(answers);
      const { organization } = await completeOnboarding({ user, company, answers, trackResult });
      await refreshOrgs();
      selectOrg(organization.id);
      onComplete?.();
    } catch (e) {
      setError(e?.message || 'Something went wrong setting up your workspace. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F4F8] flex flex-col">
      <div className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-3xl">
          {/* Brand header */}
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#0F1E3C] flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Welcome to Kipuka</h1>
              <p className="text-sm text-slate-500">Let's set up your compliance workspace in two quick steps.</p>
            </div>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-2 mb-5">
            {[1, 2].map((s) => (
              <div key={s} className="flex-1">
                <div className={`h-1.5 rounded-full ${step >= s ? 'bg-[#0F1E3C]' : 'bg-slate-200'}`} />
                <span className={`text-[11px] font-semibold mt-1 inline-block ${step >= s ? 'text-slate-700' : 'text-slate-400'}`}>
                  {s === 1 ? '1. Company' : '2. Scoping'}
                </span>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            {step === 1 && (
              <OnboardingCompanyStep data={company} set={setCompanyField} onNext={() => setStep(2)} />
            )}
            {step === 2 && (
              <OnboardingScopingStep
                answers={answers}
                setAnswer={setAnswer}
                onBack={() => setStep(1)}
                onFinish={finish}
                submitting={submitting}
              />
            )}
            {error && <p className="text-xs text-red-600 mt-4">{error}</p>}
          </div>
        </div>
      </div>
      <ConfidentialityFooter />
    </div>
  );
}