import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy, Download, Check, FileText } from 'lucide-react';

export default function SSPPreview({ synthesis }) {
  const [copied, setCopied] = useState(false);
  const body = synthesis.generated_body || synthesis.ssp_record?.generated_body || '';

  const copy = () => {
    navigator.clipboard.writeText(body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const download = () => {
    const blob = new Blob([body], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SSP-${synthesis.client?.legal_name || 'client'}-${synthesis.level}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500">
          {synthesis.ssp_record ? `Generated ${synthesis.ssp_record.last_generated_date || '—'} by ${synthesis.ssp_record.generated_by || '—'}` : 'Not yet generated'}
        </div>
        <div className="flex gap-2">
          <button onClick={copy} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50">
            {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />} {copied ? 'Copied!' : 'Copy'}
          </button>
          <button onClick={download} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#0F1E3C] text-white hover:bg-[#1E2D4A]">
            <Download className="w-3.5 h-3.5" /> Download .md
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 max-h-[70vh] overflow-y-auto">
        {body ? (
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown>{body}</ReactMarkdown>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <FileText className="w-10 h-10 mb-2" />
            <p className="text-sm">SSP not generated yet. Click Regenerate SSP.</p>
          </div>
        )}
      </div>
    </div>
  );
}