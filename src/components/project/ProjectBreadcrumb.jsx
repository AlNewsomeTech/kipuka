import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

// Breadcrumb: Organization > Project > Current Module
export default function ProjectBreadcrumb({ orgName, projectName, projectId, moduleLabel }) {
  return (
    <nav className="flex items-center gap-1.5 text-xs text-slate-500 flex-wrap">
      <Link to="/projects" className="hover:text-slate-800 font-medium">
        {orgName || 'Organization'}
      </Link>
      <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
      {projectId ? (
        <Link to={`/projects/${projectId}`} className="hover:text-slate-800 font-medium">
          {projectName || 'Project'}
        </Link>
      ) : (
        <span className="font-medium text-slate-700">{projectName || 'Project'}</span>
      )}
      {moduleLabel && (
        <>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <span className="font-semibold text-slate-800">{moduleLabel}</span>
        </>
      )}
    </nav>
  );
}