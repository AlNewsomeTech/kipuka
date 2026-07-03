import { FlaskConical, Sparkles, Lightbulb } from 'lucide-react';
import { DEMO_BANNER_TEXT } from '@/lib/demoData';

// Persistent demo banner shown above every demo page.
export function DemoBanner() {
  return (
    <div className="sticky top-0 z-20 flex items-center gap-2.5 bg-amber-500 text-slate-900 px-4 py-2.5 rounded-lg shadow-sm mb-5">
      <FlaskConical className="w-4 h-4 flex-shrink-0" />
      <span className="text-sm font-bold">{DEMO_BANNER_TEXT}</span>
    </div>
  );
}

// Small "SAMPLE" chip to tag individual demo records.
export function SampleChip({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded ${className}`}>
      Sample
    </span>
  );
}

// Section shell with title + optional DarkHorizon badge.
export function DemoSection({ id, title, icon: Icon, darkHorizon, children }) {
  return (
    <section id={id} className="bg-white rounded-xl border border-slate-200 p-5 mb-5 scroll-mt-24">
      <div className="flex items-center gap-2 mb-4">
        {Icon && <Icon className="w-5 h-5 text-[#0F1E3C]" />}
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
        <SampleChip className="ml-1" />
        {darkHorizon && (
          <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold text-purple-600 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
            <Sparkles className="w-3 h-3" /> DarkHorizon.AI
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

// Blue value statement callout used at the bottom of each module.
export function ValueStatement({ children }) {
  return (
    <div className="mt-4 flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
      <Lightbulb className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
      <p className="text-sm text-blue-900 leading-relaxed">{children}</p>
    </div>
  );
}

// Generates a watermarked "DEMO ONLY" text export and triggers a download.
// Never sends anything externally — a client-side Blob download only.
export function downloadDemoReport(reportTitle, bodyLines = []) {
  const line = '='.repeat(60);
  const content = [
    line,
    '  DEMO ONLY — SAMPLE DATA — NOT FOR REAL CLIENT USE',
    line,
    '',
    `Report: ${reportTitle}`,
    'Organization: Acme Defense Components (ADC) — DEMO',
    'Prepared by: Pacific Global Security Group',
    'Powered by: DarkHorizon.AI',
    `Generated: ${new Date().toLocaleString()}`,
    '',
    line,
    ...bodyLines,
    '',
    line,
    '  DEMO ONLY — This document contains fictional sample data.',
    '  Do not submit, affirm, or share as a real assessment artifact.',
    line,
  ].join('\n');
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `DEMO-ONLY-${reportTitle.replace(/[^a-z0-9]+/gi, '-')}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}