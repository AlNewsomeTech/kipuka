import { Lightbulb } from 'lucide-react';
import GuideSection from '@/components/guided/GuideSection';
import { sanitizeHtml } from '@/lib/sanitizeHtml';

// Step 1 UNDERSTAND — manifesto layout: the plain-English summary as a large
// centered statement, then why it matters (max ~3 sentences).
export default function StepUnderstand({ libEntry }) {
  const summary = libEntry?.plain_english_summary || libEntry?.requirement_text || libEntry?.control_title;
  const why = libEntry?.why_it_matters;
  return (
    <div className="space-y-6">
      <GuideSection index={0} kicker="What this control means" center>
        <div
          className="prose prose-slate max-w-3xl mx-auto prose-p:my-0 prose-p:text-xl sm:prose-p:text-2xl prose-p:font-semibold prose-p:leading-snug prose-p:tracking-tight prose-p:text-slate-800 prose-li:text-base prose-li:leading-relaxed"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(summary) }}
        />
      </GuideSection>

      {why && <GuideSection index={1} tone="info" icon={Lightbulb} kicker="Why this matters" lead={why} center />}
    </div>
  );
}