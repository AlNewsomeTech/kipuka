import { Shield } from 'lucide-react';
import DarkHorizonBadge from '@/components/ui/DarkHorizonBadge';
import { ACOLYTE_BRAND } from '@/lib/acolyte';

// Premium hero header for ACOLYTE pages.
export default function AcolyteHeader({ title, subtitle, showPositioning, icon: Icon = Shield, right, darkHorizon }) {
  return (
    <div className="bg-gradient-to-r from-[#0F1E3C] to-[#1E2D4A] rounded-xl p-6 text-white">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold">{title || ACOLYTE_BRAND.full}</h1>
            <span className="text-[10px] font-bold tracking-wider bg-white/15 px-2 py-0.5 rounded-full">PAC-SEC</span>
            {darkHorizon && <DarkHorizonBadge />}
          </div>
          <p className="text-white/70 text-sm">{subtitle || ACOLYTE_BRAND.subtitle}</p>
          {showPositioning && (
            <p className="text-white/60 text-[13px] mt-2 max-w-2xl leading-relaxed border-l-2 border-white/20 pl-3">
              {ACOLYTE_BRAND.positioning}
            </p>
          )}
        </div>
        {right && <div className="flex-shrink-0">{right}</div>}
      </div>
    </div>
  );
}