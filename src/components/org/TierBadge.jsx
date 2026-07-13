import { planConfig } from '@/lib/planTiers';

// Renders an org's platform plan tier badge. Accepts either a full org object
// (preferred) or a plan_tier string.
export default function TierBadge({ org, tier, size = 'sm' }) {
  const planTier = org?.plan_tier || tier;
  const cfg = planConfig(planTier);
  const sizeClass = size === 'md' ? 'text-[13px] px-3 py-1' : 'text-[11px] px-2.5 py-0.5';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${cfg.badge} ${sizeClass}`}>
      {cfg.label}
    </span>
  );
}