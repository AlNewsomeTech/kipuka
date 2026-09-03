import Reveal from '@/components/landing/Reveal';

// Editorial landing-page section: small uppercase kicker → bold heading →
// lead paragraph → body. `center` renders the manifesto variant.
const TONES = {
  default: { wrap: 'bg-white border-slate-200', kicker: 'text-slate-400', title: 'text-slate-900', lead: 'text-slate-600' },
  brand: { wrap: 'bg-[#0F1E3C] border-[#0F1E3C]', kicker: 'text-white/60', title: 'text-white', lead: 'text-white/80' },
  info: { wrap: 'bg-blue-50 border-blue-200', kicker: 'text-blue-700', title: 'text-blue-950', lead: 'text-blue-900' },
  success: { wrap: 'bg-emerald-50 border-emerald-200', kicker: 'text-emerald-700', title: 'text-emerald-950', lead: 'text-emerald-900' },
  warning: { wrap: 'bg-amber-50 border-amber-200', kicker: 'text-amber-700', title: 'text-amber-900', lead: 'text-amber-900' },
  danger: { wrap: 'bg-red-50 border-red-200', kicker: 'text-red-700', title: 'text-red-900', lead: 'text-red-800' },
  accent: { wrap: 'bg-violet-50 border-violet-200', kicker: 'text-violet-700', title: 'text-violet-950', lead: 'text-violet-950' },
  dark: { wrap: 'bg-slate-900 border-slate-900', kicker: 'text-slate-400', title: 'text-white', lead: 'text-slate-300' },
};

export default function GuideSection({ index = 0, tone = 'default', icon: Icon, kicker, title, lead, center = false, children, className = '' }) {
  const t = TONES[tone] || TONES.default;
  return (
    <Reveal delay={Math.min(index * 0.06, 0.36)} className={`h-full ${className}`}>
      <section className={`h-full rounded-2xl border p-6 sm:p-9 ${t.wrap} ${center ? 'text-center' : ''}`}>
        {kicker && (
          <div className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] ${t.kicker} ${center ? 'justify-center' : ''}`}>
            {Icon && <Icon className="w-3.5 h-3.5" />}{kicker}
          </div>
        )}
        {title && <h2 className={`mt-2 text-xl sm:text-2xl font-extrabold tracking-tight leading-tight ${t.title}`}>{title}</h2>}
        {lead && <p className={`mt-3 text-base sm:text-lg leading-relaxed whitespace-pre-line ${t.lead} ${center ? 'mx-auto max-w-3xl' : ''}`}>{lead}</p>}
        {children && <div className={kicker || title || lead ? 'mt-6' : ''}>{children}</div>}
      </section>
    </Reveal>
  );
}