import { ShieldAlert, Info, AlertTriangle } from 'lucide-react';

const warnings = [
  { icon: AlertTriangle, text: 'OneDrive sync is not a standalone backup. Use Microsoft 365 native recovery terminology unless a separate backup platform is in place.' },
  { icon: ShieldAlert, text: 'Do not upload passwords, secrets, tokens, or unredacted sensitive data as evidence.' },
  { icon: Info, text: 'Level 1 package should be completed before Level 2-ready evidence is presented as final.' },
  { icon: Info, text: 'This app supports readiness and evidence management. It does not replace legal, contractual, or official assessment requirements.' },
];

export default function WarningBanner({ compact = false, indices = null }) {
  const list = indices ? warnings.filter((_, i) => indices.includes(i)) : warnings;
  return (
    <div className={`space-y-1.5 ${compact ? '' : 'mb-4'}`}>
      {list.map((w, i) => {
        const Icon = w.icon;
        return (
          <div key={i} className="flex items-start gap-2 text-xs text-slate-600 bg-amber-50/60 border border-amber-200/60 rounded-lg px-3 py-1.5">
            <Icon className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
            <span>{w.text}</span>
          </div>
        );
      })}
    </div>
  );
}