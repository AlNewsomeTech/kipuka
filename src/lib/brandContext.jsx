import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { setReportBranding } from '@/lib/reportBranding';

// Convert an image URL to a data URL so jsPDF can embed it in reports.
async function toDataUrl(url) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve) => { const fr = new FileReader(); fr.onload = () => resolve(fr.result); fr.readAsDataURL(blob); });
  } catch { return null; }
}

// Loads the single platform BrandingSettings record and exposes logo variants.
// Falls back to the "Kipuka" wordmark when nothing is uploaded.
const BrandContext = createContext({
  branding: null,
  loading: true,
  refresh: () => {},
  wordmark: 'Kipuka',
});

export function BrandProvider({ children }) {
  const [branding, setBranding] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const rows = await base44.entities.BrandingSettings.filter({ scope: 'platform' });
      const b = rows[0] || null;
      setBranding(b);
      // Feed the color logo (for document cover pages/headers) into the report cache.
      const logoUrl = b?.logo_color_url;
      const logoDataUrl = logoUrl ? await toDataUrl(logoUrl) : null;
      setReportBranding({ logoDataUrl, wordmark: b?.wordmark_text || 'Kipuka' });
    } catch {
      setBranding(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const wordmark = branding?.wordmark_text || 'Kipuka';

  return (
    <BrandContext.Provider value={{ branding, loading, refresh, wordmark }}>
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand() {
  return useContext(BrandContext);
}