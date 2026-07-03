import { Sparkles } from 'lucide-react';

// Shown only on drafting, guide, documentation, or intelligence support areas.
export default function DarkHorizonBadge({ className = '' }) {
  return (
    <span
      title="Drafting & guidance assistance powered by DarkHorizon.AI"
      className={`inline-flex items-center gap-1.5 rounded-full bg-slate-900 text-white text-[10px] font-semibold px-2.5 py-1 ${className}`}
    >
      <Sparkles className="w-3 h-3 text-indigo-300" />
      DarkHorizon.AI
    </span>
  );
}