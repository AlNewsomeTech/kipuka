import { NavLink } from 'react-router-dom';
import { PROJECT_MODULES } from '@/lib/projectModules';
import { canAccessModule } from '@/lib/projectAccess';
import DarkHorizonBadge from '@/components/ui/DarkHorizonBadge';

export default function ProjectNav({ projectId, orgRole }) {
  return (
    <aside className="w-52 flex-shrink-0 bg-white rounded-xl border border-slate-200 p-2 h-fit">
      <div className="px-2 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
        Project Modules
      </div>
      <nav className="space-y-0.5">
        {PROJECT_MODULES.filter((m) => canAccessModule(orgRole, m.key)).map((m) => {
          const Icon = m.icon;
          return (
            <NavLink
              key={m.key}
              to={`/projects/${projectId}/${m.key}`}
              end={m.key === 'dashboard'}
              className={({ isActive }) =>
                `flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-[#0F1E3C] text-white font-medium' : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{m.label}</span>
              {m.darkhorizon && <DarkHorizonBadge className="ml-auto scale-75 origin-right" />}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}