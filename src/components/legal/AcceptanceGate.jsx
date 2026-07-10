import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useTermsSettings } from '@/lib/useTermsSettings';
import { ACCEPTANCE_CHECKBOX_TEXT } from '@/lib/termsContent';
import { logAudit, AUDIT_ACTIONS } from '@/lib/auditLog';
import AcceptanceModal from './AcceptanceModal';

// Gates app content behind acceptance of the current terms version.
// Acceptance is required ONCE PER LOGIN SESSION (DoD-style consent banner
// behavior): every fresh browser session shows the modal again, and every
// acceptance writes a timestamped TermsAcceptance record as a consent log.
export default function AcceptanceGate({ children }) {
  const { user, logout } = useAuth();
  const { settings, loading: settingsLoading } = useTermsSettings();
  const [status, setStatus] = useState('checking'); // checking | accepted | needs_acceptance
  const [submitting, setSubmitting] = useState(false);

  const sessionKey = settings ? `kipuka_terms_session_${settings.terms_version}` : null;

  useEffect(() => {
    if (settingsLoading || !settings || !user) return;

    if (!settings.require_acceptance) {
      setStatus('accepted');
      return;
    }

    // Per-session gate: prior acceptance records do NOT carry across logins.
    let sessionAccepted = false;
    try { sessionAccepted = sessionStorage.getItem(sessionKey) === '1'; } catch { /* storage unavailable */ }
    setStatus(sessionAccepted ? 'accepted' : 'needs_acceptance');
  }, [settingsLoading, settings, user, sessionKey]);

  const captureIp = async () => {
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      return data.ip || '';
    } catch {
      return '';
    }
  };

  const handleAccept = async () => {
    setSubmitting(true);
    const ip = await captureIp();
    await base44.entities.TermsAcceptance.create({
      user_email: user.email,
      user_name: user.full_name || '',
      terms_version: settings.terms_version,
      accepted: true,
      accepted_date: new Date().toISOString(),
      ip_address: ip,
      user_agent: navigator.userAgent || '',
      acceptance_text: ACCEPTANCE_CHECKBOX_TEXT,
    });
    await logAudit({ user, actionType: AUDIT_ACTIONS.LOGIN_ACCEPTANCE, summary: `Accepted terms ${settings.terms_version}` });
    try { sessionStorage.setItem(sessionKey, '1'); } catch { /* storage unavailable */ }
    setSubmitting(false);
    setStatus('accepted');
  };

  const handleDecline = async () => {
    setSubmitting(true);
    try {
      await base44.entities.TermsAcceptance.create({
        user_email: user.email,
        user_name: user.full_name || '',
        terms_version: settings.terms_version,
        accepted: false,
        declined_date: new Date().toISOString(),
        user_agent: navigator.userAgent || '',
      });
    } catch {
      // Recording the decline is best-effort; log out regardless.
    }
    logout();
  };

  if (settingsLoading || status === 'checking') {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (status === 'needs_acceptance') {
    return (
      <AcceptanceModal
        title={settings.login_modal_title}
        body={settings.login_modal_body}
        onAccept={handleAccept}
        onDecline={handleDecline}
        submitting={submitting}
      />
    );
  }

  return children;
}