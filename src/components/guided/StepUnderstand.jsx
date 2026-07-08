import { BookOpen, Lightbulb } from 'lucide-react';

// Step 1 UNDERSTAND — plain-English summary + why it matters (max ~3 sentences).
export default function StepUnderstand({ libEntry }) {
  const summary = libEntry?.plain_english_summary || libEntry?.requirement_text || libEntry?.control_title;
  const why = libEntry?.why_it_matters;
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-4 h-4 text-[#0F1E3C]" />
          <h3 className="text-sm font-bold text-slate-800">What this control means</h3>
        </div>
        <div className="prose prose-sm max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: summary }} />
      </div>

      {why && (
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-blue-900">Why this matters</h3>
          </div>
          <p className="text-sm text-blue-900/90 leading-relaxed">{why}</p>
        </div>
      )}
    </div>
  );
}