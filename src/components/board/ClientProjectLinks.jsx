import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Wrench, FolderKanban, ArrowRight, Info } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// Bridges a selected Client to its organization's CMMC project(s), giving one-click
// access to the project-scoped SPRS and Maintenance views (which filter to that
// client's data only). Legacy clients with no linked organization show guidance.
export default function ClientProjectLinks({ client }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      if (!client?.organization_id) { if (alive) { setProjects([]); setLoading(false); } return; }
      const all = await base44.entities.Project.filter({ organization_id: client.organization_id }).catch(() => []);
      if (alive) { setProjects(all); setLoading(false); }
    })();
    return () => { alive = false; };
  }, [client?.organization_id]);

  if (loading) return null;

  if (!client?.organization_id || projects.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-slate-600">
          <b>{client?.legal_name}</b> is not yet linked to a CMMC project. Link this client to an organization on the
          Clients page, then create a project to track SPRS records and maintenance tasks for it.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <FolderKanban className="w-4 h-4 text-[#0F1E3C]" />
        <h3 className="text-sm font-bold text-slate-800">{client.legal_name} — Project Workspace</h3>
      </div>
      <div className="space-y-2">
        {projects.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center gap-2 border border-slate-200 rounded-lg px-3 py-2">
            <span className="text-sm font-medium text-slate-700 flex-1 min-w-0 truncate">{p.project_name}</span>
            <Link to={`/projects/${p.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg">
              <FolderKanban className="w-3.5 h-3.5" /> Dashboard
            </Link>
            <Link to={`/projects/${p.id}/sprs`} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg">
              <BadgeCheck className="w-3.5 h-3.5" /> SPRS
            </Link>
            <Link to={`/projects/${p.id}/maintenance`} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg">
              <Wrench className="w-3.5 h-3.5" /> Maintenance
            </Link>
            <Link to={`/projects/${p.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600">
              Open <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-slate-400 mt-2.5">
        SPRS records and maintenance tasks are scoped to each project, so they show only {client.legal_name}'s data.
      </p>
    </div>
  );
}