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
        <div className="text-[14px] text-slate-600">
          {synthesis.ssp_record ? `Generated ${synthesis.ssp_record.last_generated_date || '—'} by ${synthesis.ssp_record.generated_by || '—'}` : 'Not yet generated'}
        </div>
        <div className="flex gap-2">
          <button onClick={copy} className="flex items-center gap-1.5 text-[14px] font-medium px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50">
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />} {copied ? 'Copied!' : 'Copy'}
          </button>
          <button onClick={download} className="flex items-center gap-1.5 text-[14px] font-semibold px-3.5 py-2 rounded-lg bg-[#0F1E3C] text-white hover:bg-[#1E2D4A]">
            <Download className="w-4 h-4" /> Download .md
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 px-6 md:px-10 py-8 max-h-[72vh] overflow-y-auto">
        {body ? (
          <div className="prose prose-slate max-w-[72ch] mx-auto prose-base prose-headings:font-bold prose-headings:text-slate-900 prose-p:text-slate-700 prose-p:leading-[1.7] prose-li:text-slate-700 prose-li:leading-[1.6] prose-h1:text-3xl prose-h2:text-2xl prose-h2:mt-8 prose-h2:pb-2 prose-h2:border-b prose-h2:border-slate-200 prose-h3:text-xl prose-strong:text-slate-900 prose-table:text-[14px]">
            <ReactMarkdown>{body}</ReactMarkdown>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <FileText className="w-12 h-12 mb-3" />
            <p className="text-[15px]">SSP not generated yet. Click Regenerate SSP.</p>
          </div>
        )}
      </div>
    </div>
  );
}