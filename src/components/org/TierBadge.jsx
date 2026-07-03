import { getTierConfig } from '@/lib/subscriptionTiers';

export default function TierBadge({ tier, size = 'sm' }) {
  const cfg = getTierConfig(tier);
  const sizeClass = size === 'md' ? 'text-[13px] px-3 py-1' : 'text-[11px] px-2.5 py-0.5';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${cfg.badge} ${sizeClass}`}>
      {cfg.label}
    </span>
  );
}