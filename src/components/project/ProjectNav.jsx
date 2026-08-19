import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Radar, ArrowUpRight, SlidersHorizontal, LayoutGrid, Home, ArrowLeft } from 'lucide-react';
import { PROJECT_MODULES, CLIENT_NAV_GROUPS } from '@/lib/projectModules';
import { canAccessModule } from '@/lib/projectAccess';

const ADVANCED_KEY = 'projectNavAdvanced';

const MODULE_GROUPS = [
  { label: 'Overview', keys: ['dashboard'] },
  { label: 'Implement', keys: ['scoping', 'assessment', 'security-tooling', 'evidence', 'readiness'] },
  { label: 'Validate', keys: ['mock', 'poam', 'inventory', 'diagrams', 'srm', 'incident'] },
  { label: 'Deliver', keys: ['ssp', 'policies', 'reports', 'sprs', 'maintenance'] },
];

export default function ProjectNav({ projectId, orgRole, isClient = false }) {
  const [advanced, setAdvanced] = useState(() => {
    if (!isClient) return true;
    return localStorage.getItem(ADVANCED_KEY) === '1';
  });

  const toggleAdvanced = () => {
    const next = !advanced;
    setAdvanced(next);
    localStorage.setItem(ADVANCED_KEY, next ? '1' : '0');
  };

  const linkTo = (key) => (key === 'dashboard' ? `/projects/${projectId}` : `/projects/${projectId}/${key}`);
  const linkClass = ({ isActive }) =>
    `group relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] transition-all ${
      isActive
        ? 'bg-blue-50 font-extrabold text-[#175d88] ring-1 ring-blue-100 before:absolute before:left-0 before:h-5 before:w-0.5 before:rounded-full before:bg-[#479dcf]'
        : 'font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-800'
    }`;

  const showGrouped = isClient && !advanced;
  const accessibleItems = PROJECT_MODULES.filter((m) => canAccessModule(orgRole, m.key));
  const groups = showGrouped
    ? [{ label: 'My CMMC Setup', items: CLIENT_NAV_GROUPS }]
    : MODULE_GROUPS.map((group) => ({
        label: group.label,
        items: group.keys.map((key) => accessibleItems.find((item) => item.key === key)).filter(Boolean),
      })).filter((group) => group.items.length > 0);

  return (
    <aside className="app-surface h-fit w-full flex-shrink-0 overflow-hidden lg:sticky lg:top-4 lg:w-60">
      <div className="border-b border-slate-200 px-4 py-3.5">
        <div className="page-kicker">CMMC project</div>
        <div className="mt-1.5 text-sm font-extrabold text-slate-800">{showGrouped ? 'Guided navigation' : 'CMMC modules'}</div>
      </div>

      <nav className="max-h-[56vh] space-y-4 overflow-y-auto p-2.5 lg:max-h-[calc(100vh-20rem)]">
        {groups.map((group) => (
          <div key={group.label}>
            {!showGrouped && (
              <div className="px-3 pb-1.5 text-[9px] font-extrabold uppercase tracking-[0.13em] text-slate-400">{group.label}</div>
            )}
            <div className="grid gap-0.5 sm:grid-cols-2 lg:grid-cols-1">
              {group.items.map((module) => {
                const Icon = module.icon;
                return (
                  <NavLink key={module.key} to={linkTo(module.key)} end={module.key === 'dashboard'} className={linkClass}>
                    <Icon className="h-4 w-4 flex-shrink-0 text-slate-400 transition-colors group-hover:text-[#479dcf]" />
                    <span className="truncate">{module.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-200 p-2.5">
        <div className="mb-2 grid grid-cols-2 gap-1.5">
          <Link
            to={`/projects/${projectId}`}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-2 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <Home className="h-3.5 w-3.5" />
            Project Home
          </Link>
          <Link
            to="/projects"
            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-2 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All Projects
          </Link>
        </div>
        {isClient && (
          <button
            type="button"
            onClick={toggleAdvanced}
            className="mb-1 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
          >
            {advanced ? <LayoutGrid className="h-3.5 w-3.5" /> : <SlidersHorizontal className="h-3.5 w-3.5" />}
            {advanced ? 'Switch to simple view' : 'Show advanced modules'}
          </button>
        )}
        <Link
          to="/acolyte"
          className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
        >
          <Radar className="h-4 w-4 flex-shrink-0 text-[#479dcf]" />
          <span className="truncate">ACOLYTE Operations</span>
          <ArrowUpRight className="ml-auto h-3.5 w-3.5 text-slate-400" />
        </Link>
      </div>
    </aside>
  );
}