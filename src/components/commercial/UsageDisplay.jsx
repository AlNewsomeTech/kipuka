import { Users, HardDrive, FolderKanban } from 'lucide-react';
import { getTierConfig } from '@/lib/subscriptionTiers';

function Meter({ icon: Icon, label, used, limit }) {
  const unlimited = limit === null || limit === undefined;
  const pct = unlimited ? 0 : Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));
  const over = !unlimited && used > limit;
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1.5">
        <Icon className="w-4 h-4 text-[#0F1E3C]" /> {label}
      </div>
      <div className="text-lg font-bold text-slate-800">
        {used}{unlimited ? '' : ` / ${limit}`}
        {unlimited && <span className="text-xs font-medium text-slate-400 ml-1">Unlimited</span>}
      </div>
      {!unlimited && (
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mt-2">
          <div className={`h-full rounded-full ${over ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-[#0F1E3C]'}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

// Displays seat, project, and storage usage against the org's tier limits.
export default function UsageDisplay({ tier, seatsUsed = 0, projectsUsed = 0, storageUsedGb = 0 }) {
  const cfg = getTierConfig(tier);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <Meter icon={Users} label="Seats" used={seatsUsed} limit={cfg.seat_limit} />
      <Meter icon={FolderKanban} label="Projects" used={projectsUsed} limit={cfg.project_limit} />
      <Meter icon={HardDrive} label="Storage (GB)" used={storageUsedGb} limit={cfg.storage_limit_gb} />
    </div>
  );
}