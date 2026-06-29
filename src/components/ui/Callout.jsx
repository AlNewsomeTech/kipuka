import { AlertTriangle, CheckCircle2, Info, FileWarning } from 'lucide-react';

/**
 * Clearly-styled callout box for gaps, warnings, success, and placeholder notices.
 * High contrast, readable body text, never tiny gray.
 */
const tones = {
  success: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', icon: CheckCircle2, iconColor: 'text-green-600' },
  warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', icon: AlertTriangle, iconColor: 'text-amber-600' },
  danger: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', icon: AlertTriangle, iconColor: 'text-red-600' },
  placeholder: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', icon: FileWarning, iconColor: 'text-orange-600' },
  info: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', icon: Info, iconColor: 'text-blue-600' },
};

export default function Callout({ tone = 'info', title, children }) {
  const t = tones[tone] || tones.info;
  const Icon = t.icon;
  return (
    <div className={`rounded-xl border ${t.bg} ${t.border} p-4 flex items-start gap-3`}>
      <Icon className={`w-5 h-5 ${t.iconColor} flex-shrink-0 mt-0.5`} />
      <div className="min-w-0">
        {title && <div className={`text-[15px] font-semibold ${t.text} mb-0.5`}>{title}</div>}
        {children && <div className={`text-[14px] ${t.text} leading-[1.55]`}>{children}</div>}
      </div>
    </div>
  );
}