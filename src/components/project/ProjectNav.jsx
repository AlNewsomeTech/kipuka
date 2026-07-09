import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Radar, ArrowUpRight, SlidersHorizontal, LayoutGrid } from 'lucide-react';
import { PROJECT_MODULES, CLIENT_NAV_GROUPS } from '@/lib/projectModules';
import { canAccessModule } from '@/lib/projectAccess';

const ADVANCED_KEY = 'projectNavAdvanced';

export default function ProjectNav({ projectId, orgRole, isClient = false }) {
  // Clients see the simplified grouped nav by default; they can opt into the full
  // module list. Consultants always get the full list (advanced is forced on).
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
    `flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-colors ${
      isActive ? 'bg-[#0F1E3C] text-white font-medium' : 'text-slate-600 hover:bg-slate-100'
    }`;

  // Client + simplified view: the five friendly groups.
  const showGrouped = isClient && !advanced;
  const items = showGrouped ? CLIENT_NAV_GROUPS : PROJECT_MODULES.filter((m) => canAccessModule(orgRole, m.key));

  return (
    <aside className="w-52 flex-shrink-0 bg-white rounded-xl border border-slate-200 p-2 h-fit">
      <div className="px-2 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
        {showGrouped ? 'My CMMC Setup' : 'Project Modules'}
      </div>
      <nav className="space-y-0.5">
        {items.map((m) => {
          const Icon = m.icon;
          return (
            <NavLink key={m.key} to={linkTo(m.key)} end={m.key === 'dashboard'} className={linkClass}>
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{m.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {isClient && (
        <div className="mt-3 pt-2 border-t border-slate-100">
          <button
            onClick={toggleAdvanced}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 transition-colors"
          >
            {advanced ? <LayoutGrid className="w-3.5 h-3.5" /> : <SlidersHorizontal className="w-3.5 h-3.5" />}
            {advanced ? 'Simple view' : 'Advanced view'}
          </button>
        </div>
      )}

      <div className="mt-3 pt-2 border-t border-slate-100">
        <div className="px-2 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Managed Service
        </div>
        <Link
          to="/acolyte"
          className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <Radar className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">ACOLYTE Operations</span>
          <ArrowUpRight className="w-3.5 h-3.5 ml-auto text-slate-400" />
        </Link>
      </div>
    </aside>
  );
}