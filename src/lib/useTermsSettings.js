import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import * as defaults from '@/lib/termsContent';

// Resolves the effective terms configuration: the single admin-configured
// TermsSettings record if present, otherwise the built-in defaults.
export function useTermsSettings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    base44.entities.TermsSettings.list('-last_updated_date', 1)
      .then((rows) => {
        if (!active) return;
        setSettings(resolveSettings(rows && rows[0]));
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setSettings(resolveSettings(null));
        setLoading(false);
      });
    return () => { active = false; };
  }, []);

  return { settings, loading };
}

export function resolveSettings(record) {
  return {
    id: record?.id || null,
    terms_version: record?.terms_version || defaults.DEFAULT_TERMS_VERSION,
    terms_title: record?.terms_title || defaults.DEFAULT_TERMS_TITLE,
    login_modal_title: record?.login_modal_title || defaults.LOGIN_MODAL_TITLE,
    login_modal_body: record?.login_modal_body || defaults.LOGIN_MODAL_BODY,
    footer_warning_text: record?.footer_warning_text || defaults.FOOTER_WARNING_TEXT,
    require_acceptance: record?.require_acceptance !== false,
  };
}