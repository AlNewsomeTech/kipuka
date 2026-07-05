import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useOrg } from '@/lib/orgContext';
import { resolveOnboardingState } from '@/lib/onboarding';
import OnboardingWizard from '@/pages/OnboardingWizard';

// Gates the main app behind first-run onboarding. Brand-new self-service users
// (no org, no invitation, not platform/Pac-Sec staff) must complete the wizard
// before they can reach the app. Everyone else passes straight through.
export default function OnboardingGate({ children }) {
  const { user } = useAuth();
  const { loading: orgLoading, memberships, isPlatformAdmin } = useOrg();
  const [state, setState] = useState('checking'); // checking | wizard | ready
  const [checkKey, setCheckKey] = useState(0);

  const check = useCallback(async () => {
    if (orgLoading) return;
    if (!user) { setState('ready'); return; }
    setState('checking');
    try {
      const res = await resolveOnboardingState({ user, memberships, isPlatformAdmin });
      setState(res.needsWizard ? 'wizard' : 'ready');
    } catch {
      // On any error, don't trap the user — let them into the app.
      setState('ready');
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

  if (state === 'wizard') {
    return <OnboardingWizard onComplete={() => setCheckKey((k) => k + 1)} />;
  }

  return children;
}