import { useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';

// Preserves the pre-landing-page behavior for protected deep links: an
// unauthenticated visitor hitting any non-public route is sent to the existing
// platform login flow (which returns them to the requested URL after login).
export default function LoginRedirect() {
  const { navigateToLogin } = useAuth();

  useEffect(() => {
    navigateToLogin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#060c18]">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-[#479dcf]" role="status" aria-label="Redirecting to login" />
    </div>
  );
}