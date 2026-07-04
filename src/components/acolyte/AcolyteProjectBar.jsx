import { FolderKanban } from 'lucide-react';

// Project scope selector shown at the top of every ACOLYTE page so records
// stay tenant- and project-aware.
export default function AcolyteProjectBar({ projects, projectId, onSelect, orgName }) {
  return (
    <div className="flex items-center gap-2.5 flex-wrap">
      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
        <FolderKanban className="w-4 h-4" /> ACOLYTE project scope:
      </div>
      <select
        value={projectId || ''}
        onChange={(e) => onSelect(e.target.value || null)}
        className="text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 min-w-[220px]"
      >
        {projects.length === 0 && <option value="">No projects available</option>}
        {projects.map((p) => (
          <option key={p.id} value={p.id}>{p.project_name}</option>
        ))}
      </select>
      {orgName && <span className="text-xs text-slate-400">{orgName}</span>}
    </div>
  );
}