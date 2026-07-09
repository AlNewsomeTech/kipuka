import { useState } from 'react';
import { Palette, Upload, Loader2, ShieldAlert, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useOrg } from '@/lib/orgContext';
import { useBrand } from '@/lib/brandContext';
import EmptyState from '@/components/EmptyState';

const LOGO_SLOTS = [
  { key: 'logo_color_url', label: 'Primary Color Logo', help: 'Shown in the app header, login page, and on document cover pages, headers, and footers.', bg: 'bg-white' },
  { key: 'logo_dark_url', label: 'Dark Logo', help: 'Dark variant for light backgrounds where the color logo does not read well.', bg: 'bg-white' },
  { key: 'logo_white_url', label: 'White / Reversed Logo', help: 'Used automatically on dark backgrounds (e.g. the navy sidebar).', bg: 'bg-[#0F1E3C]' },
];

export default function BrandingSettings() {
  const { isPlatformAdmin } = useOrg();
  const { branding, refresh, wordmark } = useBrand();
  const [uploading, setUploading] = useState(null);
  const [wordmarkText, setWordmarkText] = useState(branding?.wordmark_text || 'Kipuka');
  const [savedFlash, setSavedFlash] = useState(false);

  if (!isPlatformAdmin) {
    return (
      <div className="max-w-2xl mx-auto py-16">
        <EmptyState icon={ShieldAlert} title="Restricted area" description="Branding settings are available to Pac-Sec platform administrators only." />
      </div>
    );
  }

  // Ensure the single platform record exists, return it.
  const ensureRecord = async () => {
    if (branding?.id) return branding;
    return base44.entities.BrandingSettings.create({ scope: 'platform', wordmark_text: wordmarkText });
  };

  const uploadLogo = async (key, file) => {
    if (!file) return;
    setUploading(key);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const rec = await ensureRecord();
      await base44.entities.BrandingSettings.update(rec.id, { [key]: file_url });
      await refresh();
    } finally {
      setUploading(null);
    }
  };

  const removeLogo = async (key) => {
    if (!branding?.id) return;
    setUploading(key);
    try {
      await base44.entities.BrandingSettings.update(branding.id, { [key]: '' });
      await refresh();
    } finally {
      setUploading(null);
    }
  };

  const saveWordmark = async () => {
    const rec = await ensureRecord();
    await base44.entities.BrandingSettings.update(rec.id, { wordmark_text: wordmarkText });
    await refresh();
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-2.5">
        <Palette className="w-6 h-6 text-brand" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Branding</h1>
          <p className="text-sm text-slate-500">Upload your logo variants. They appear across the app and on generated documents.</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {LOGO_SLOTS.map((slot) => {
          const url = branding?.[slot.key];
          return (
            <div key={slot.key} className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col">
              <div className="text-sm font-bold text-slate-800">{slot.label}</div>
              <p className="text-[11px] text-slate-500 mt-0.5 mb-3 flex-1">{slot.help}</p>
              <div className={`rounded-lg border border-slate-200 h-24 flex items-center justify-center mb-3 ${slot.bg}`}>
                {url ? <img src={url} alt={slot.label} className="max-h-16 max-w-[90%] object-contain" />
                  : <span className={`text-xs ${slot.bg.includes('0F1E3C') ? 'text-white/50' : 'text-slate-400'}`}>No logo</span>}
              </div>
              <label className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-brand cursor-pointer">
                {uploading === slot.key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                {url ? 'Replace' : 'Upload'}
                <input type="file" accept="image/*" className="hidden"
                  onChange={(e) => uploadLogo(slot.key, e.target.files?.[0])} disabled={uploading === slot.key} />
              </label>
              {url && (
                <button onClick={() => removeLogo(slot.key)} className="mt-1.5 text-[11px] text-slate-400 hover:text-red-600">Remove</button>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="text-sm font-bold text-slate-800 mb-1">Text Wordmark Fallback</div>
        <p className="text-xs text-slate-500 mb-3">Shown in Questa Bold brand blue wherever no logo is uploaded.</p>
        <div className="flex flex-wrap items-center gap-3">
          <input value={wordmarkText} onChange={(e) => setWordmarkText(e.target.value)} className="form-input text-sm max-w-xs" />
          <button onClick={saveWordmark} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-brand">
            {savedFlash ? <><Check className="w-4 h-4" /> Saved</> : 'Save Wordmark'}
          </button>
          <span className="font-heading font-bold text-brand text-lg">{wordmarkText || wordmark}</span>
        </div>
      </div>

      <p className="text-[11px] text-slate-400">Logos are stored securely and used only inside this application and its generated documents.</p>
    </div>
  );
}