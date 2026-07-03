import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { LifeBuoy, ChevronRight, ArrowLeft } from 'lucide-react';
import { HELP_ARTICLES, articleBySlug } from '@/lib/helpContent';
import SupportRequestForm from '@/components/help/SupportRequestForm';
import ConfidentialityFooter from '@/components/legal/ConfidentialityFooter';

export default function HelpCenter() {
  const { slug } = useParams();
  const article = slug ? articleBySlug(slug) : null;

  if (slug && article) {
    const Icon = article.icon;
    return (
      <div className="space-y-4">
        <Link to="/help" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700">
          <ArrowLeft className="w-4 h-4" /> All Help Articles
        </Link>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[#0F1E3C] flex items-center justify-center">
              <Icon className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">{article.title}</h1>
          </div>
          <div className="prose prose-slate prose-sm max-w-none prose-headings:font-bold prose-h2:text-lg prose-h3:text-base">
            <ReactMarkdown>{article.body}</ReactMarkdown>
          </div>
        </div>
        {article.isContact && <SupportRequestForm />}
        <ConfidentialityFooter />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2.5">
          <LifeBuoy className="w-5 h-5 text-[#0F1E3C]" />
          <h1 className="text-lg font-bold text-slate-900">Help Center</h1>
        </div>
        <p className="text-sm text-slate-500 mt-1">Guides for CMMC, evidence, the SSP builder, POA&M, SPRS/PIEE, reports, and more.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {HELP_ARTICLES.map((a) => {
          const Icon = a.icon;
          return (
            <Link key={a.slug} to={`/help/${a.slug}`}
              className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 hover:shadow-sm transition flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4.5 h-4.5 text-[#0F1E3C]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800">{a.title}</h3>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{a.summary}</p>
              </div>
            </Link>
          );
        })}
      </div>

      <ConfidentialityFooter />
    </div>
  );
}