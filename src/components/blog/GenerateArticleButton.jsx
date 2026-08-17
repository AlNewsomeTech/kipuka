import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// Admin action: writes one article now, always as a Draft for review.
// The scheduled workflow uses the same backend function.
export default function GenerateArticleButton({ onGenerated }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const run = async () => {
    setBusy(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke('generateBlogArticle', { publish: false });
      const data = res?.data || {};
      if (data.ok) {
        setResult({
          tone: data.needs_review ? 'warn' : 'ok',
          text: data.needs_review
            ? `Draft "${data.post.title}" saved, but it needs edits: ${data.style_violations.join(' ')}`
            : `Draft "${data.post.title}" saved. Review it, then publish.`,
        });
        if (onGenerated) await onGenerated();
      } else {
        setResult({ tone: 'warn', text: data.reason || data.error || 'Could not write an article.' });
      }
    } catch (err) {
      setResult({ tone: 'warn', text: err?.response?.data?.error || 'Could not write an article.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <button type="button" className="btn-secondary" onClick={run} disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {busy ? 'Writing draft…' : 'Write Draft Now'}
      </button>
      {result && (
        <p className={`max-w-sm text-right text-xs font-semibold ${result.tone === 'ok' ? 'text-green-700' : 'text-amber-700'}`}>
          {result.text}
        </p>
      )}
    </div>
  );
}