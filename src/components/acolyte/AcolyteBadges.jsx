import { postureStyle, severityStyle, priorityStyle } from '@/lib/acolyte';

function Pill({ className, children }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold text-xs px-2.5 py-0.5 border ${className}`}>
      {children}
    </span>
  );
}

export function PostureBadge({ status }) {
  return <Pill className={postureStyle(status)}>{status || 'Unknown'}</Pill>;
}

export function SeverityBadge({ severity }) {
  return <Pill className={severityStyle(severity)}>{severity || 'Moderate'}</Pill>;
}

export function PriorityBadge({ priority }) {
  return <Pill className={priorityStyle(priority)}>{priority || 'Medium'}</Pill>;
}