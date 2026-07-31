import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useOrg } from '@/lib/orgContext';
import { resolveOnboardingState } from '@/lib/onboarding';
import OnboardingWizard from '@/pages/OnboardingWizard';

// Gates the main app behind first-run onboarding. Brand-new self-service users
// (no org, no invitation, not platform/Pac-Sec staff) must complete the wizard
// before they can reach the app. Everyone else passes straight through.
//
// FAILS CLOSED: if the onboarding state cannot be read we show an explicit error
// with a retry action. We never render the app after a failed check, because a
// failed read cannot distinguish "already onboarded" from "brand-new tenant".
export default function OnboardingGate({ children }) {
  const { user } = useAuth();
  const { loading: orgLoading, memberships, isPlatformAdmin } = useOrg();
  const [state, setState] = useState('checking'); // checking | wizard | ready | error
  const [errorMessage, setErrorMessage] = useState('');
  const [checkKey, setCheckKey] = useState(0);

  const check = useCallback(async () => {
    if (orgLoading) return;
    if (!user) { setState('ready'); return; }
    setState('checking');
    try {
      const res = await resolveOnboardingState({ user, memberships, isPlatformAdmin });
      setState(res.needsWizard ? 'wizard' : 'ready');
    } catch (e) {
      setErrorMessage(e?.message || 'We could not load your workspace setup status.');
      setState('error');
    }
  }, [orgLoading, user, memberships, isPlatformAdmin, checkKey]);

  useEffect(() => { check(); }, [check]);

  if (orgLoading || state === 'checking') {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#F1F4F8] px-4">
        <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 p-6 shadow-sm text-center">
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-700" />
          </div>
          <h2 className="text-base font-bold text-slate-900">We couldn't load your workspace</h2>
          <p className="text-sm text-slate-600 mt-1.5">{errorMessage}</p>
          <p className="text-xs text-slate-500 mt-2">
            Your data is safe. Try again in a moment — if this keeps happening, contact Pac-Sec support.
          </p>
          <button
            type="button"
            onClick={() => { setErrorMessage(''); setCheckKey((k) => k + 1); }}
            className="mt-4 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#0F1E3C] hover:bg-[#152a52]"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (state === 'wizard') {
    return <OnboardingWizard />;
  }

  return children;
}