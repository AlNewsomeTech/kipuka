import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Download, PackageCheck, PackageOpen } from 'lucide-react';
import EmptyState from '@/components/EmptyState';

export default function DocumentPackagePanel({ project, packages, onChanged }) {
  const [busy, setBusy] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const generate = async (mode) => {
    setBusy(mode); setError(''); setResult(null);
    try {
      const res = await base44.functions.invoke('generateProjectDocumentPackage', { project_id: project.id, mode });
      setResult(res.data);
      await onChanged();
    } catch (e) {
      const data = e.response?.data || {};
      setError([data.error || e.message, ...(data.blockers || [])].join('\n'));
    } finally { setBusy(''); }
  };
  const download = async (pkg) => {
    const res = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: pkg.file_uri });
    window.open(res.signed_url, '_blank', 'noopener,noreferrer');
  };

  return <div className="space-y-5">
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-slate-900">Document Package Export</h2>
      <p className="mt-1 text-sm text-slate-500">Draft packages may include working documents and blockers. Ready packages fail closed unless every required applicability decision and document is approved and current.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={() => generate('Draft')} disabled={Boolean(busy)} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"><PackageOpen className="h-4 w-4" />{busy === 'Draft' ? 'Generating…' : 'Generate Draft Package'}</button>
        <button onClick={() => generate('Ready')} disabled={Boolean(busy)} className="inline-flex items-center gap-2 rounded-lg bg-[#0F1E3C] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><PackageCheck className="h-4 w-4" />{busy === 'Ready' ? 'Validating…' : 'Generate Ready Package'}</button>
      </div>
      {error && <pre className="mt-4 whitespace-pre-wrap rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</pre>}
      {result?.download_url && <a href={result.download_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-700"><Download className="h-4 w-4" />Download generated package</a>}
    </div>
    {!packages.length ? <EmptyState icon={PackageOpen} title="No document packages" description="Generate a Draft package to inspect the current document set and blockers." action={null} /> :
      <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">{packages.map((p) => <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div><p className="text-sm font-semibold text-slate-900">{p.package_name}</p><p className="text-xs text-slate-500">v{p.package_version} · {p.included_document_count} documents · {p.generated_date?.slice(0, 10)} · {p.status}</p></div>
        <button onClick={() => download(p)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700"><Download className="h-4 w-4" />Download</button>
      </div>)}</div>}
  </div>;
}
