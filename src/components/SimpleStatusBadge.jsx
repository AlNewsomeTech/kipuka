import { toSimpleStatus, SIMPLE_STATUS_TONE } from '@/lib/simpleStatus';

// Renders a control's status as one of the four client-facing simple buckets.
// Pass a real (13-status) taxonomy value; it maps down for display.
export default function SimpleStatusBadge({ assessment, status, size = 'sm' }) {
  const simple = toSimpleStatus(assessment || status);
  const config = SIMPLE_STATUS_TONE[simple] || SIMPLE_STATUS_TONE['Not Started'];
  const sizeClass =
    size === 'xs' ? 'text-[11px] px-2 py-0.5' :
    size === 'md' ? 'text-[13px] px-3 py-1' :
    'text-xs px-2.5 py-0.5';
  const dotSize = size === 'md' ? 'w-2 h-2' : 'w-1.5 h-1.5';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${config.bg} ${config.text} ${sizeClass}`}>
      <span className={`${dotSize} rounded-full ${config.dot} flex-shrink-0`} />
      {simple}
    </span>
  );
}