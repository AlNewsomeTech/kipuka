import { ExternalLink } from 'lucide-react';
import { officialResources } from './stepContent';

export default function OfficialResources() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="text-sm font-semibold text-slate-800 mb-3">Official Resources</h3>
      <div className="space-y-2">
        {officialResources.map(r => (
          <a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-2 border border-slate-200 rounded-lg px-3 py-2.5 hover:bg-slate-50">
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-800 truncate">{r.name}</div>
              <div className="text-xs text-slate-500">{r.purpose}</div>
            </div>
            <ExternalLink className="w-4 h-4 text-blue-600 flex-shrink-0" />
          </a>
        ))}
      </div>
    </div>
  );
}