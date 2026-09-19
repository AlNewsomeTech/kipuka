import { useEffect, useState } from 'react';

export default function useReadingPreferences(userId) {
  const key = `cmmc-reading-preferences:${userId || 'anonymous'}`;
  const [preferences, setPreferences] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(key) || '{}');
      return { enabled: stored.enabled === true, guide: stored.guide !== false };
    } catch { return { enabled: false, guide: true }; }
  });
  const [saveError, setSaveError] = useState('');
  useEffect(() => {
    document.documentElement.dataset.readingMode = String(preferences.enabled);
    try { localStorage.setItem(key, JSON.stringify(preferences)); setSaveError(''); }
    catch { setSaveError('This browser cannot save the preference. It will apply for this visit only.'); }
    return () => { delete document.documentElement.dataset.readingMode; };
  }, [key, preferences]);
  return { preferences, setPreferences, saveError };
}