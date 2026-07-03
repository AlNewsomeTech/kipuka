import { Sparkles, Lock } from 'lucide-react';

// Small inline indicator for locked premium capabilities.
export default function PremiumBadge({ locked = true, label = 'Premium' }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${locked ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
      {locked ? <Lock className="w-2.5 h-2.5" /> : <Sparkles className="w-2.5 h-2.5" />}
      {locked ? `Available in ${label}` : label}
    </span>
  );
}