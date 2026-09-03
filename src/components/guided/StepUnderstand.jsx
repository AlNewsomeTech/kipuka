import { BookOpen, Lightbulb } from 'lucide-react';
import GuideSection from '@/components/guided/GuideSection';

// Step 1 UNDERSTAND — plain-English summary + why it matters (max ~3 sentences).
export default function StepUnderstand({ libEntry }) {
  const summary = libEntry?.plain_english_summary || libEntry?.requirement_text || libEntry?.control_title;
  const why = libEntry?.why_it_matters;
  return (
    <div className="space-y-5">
      <GuideSection index={0} icon={BookOpen} kicker="What this control means">
        <div
          className="prose prose-slate max-w-none text-slate-800 prose-p:text-lg prose-p:leading-relaxed prose-li:text-base"
          dangerouslySetInnerHTML={{ __html: summary }}
        />
      </GuideSection>

      {why && <GuideSection index={1} tone="info" icon={Lightbulb} kicker="Why this matters" lead={why} />}
    </div>
  );
}