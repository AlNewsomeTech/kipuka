import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import { ArrowLeft } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import PublicHeader from '@/components/landing/PublicHeader';
import PublicFooter from '@/components/landing/PublicFooter';
import DemoRequestModal from '@/components/landing/DemoRequestModal';

function setMetaDescription(content) {
  let tag = document.querySelector('meta[name="description"]');
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('name', 'description');
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
}

// Public article page. Reads a single published post via the public
// read-only backend function; drafts return 404.
export default function BlogPostPage() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPost(null);
    setNotFound(false);
    base44.functions.invoke('getPublicBlogPosts', { slug })
      .then((res) => {
        if (cancelled) return;
        const p = res.data?.post;
        if (!p) { setNotFound(true); return; }
        setPost(p);
        document.title = `${p.meta_title || p.title} | Kipuka Blog`;
        if (p.meta_description) setMetaDescription(p.meta_description);
      })
      .catch(() => { if (!cancelled) setNotFound(true); });
    return () => { cancelled = true; };
  }, [slug]);

  return (
    <div className="min-h-screen bg-[#060c18] font-body text-white antialiased">
      <PublicHeader onRequestDemo={() => setDemoOpen(true)} />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <Link to="/blog" className="inline-flex items-center gap-2 text-sm font-bold text-[#8fd0f2] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#67d1f0]">
          <ArrowLeft className="h-4 w-4" /> All articles
        </Link>

        {notFound ? (
          <div className="mt-12 rounded-2xl border border-[#1c2c44] bg-[#0a1424] p-12 text-center">
            <h1 className="text-xl font-bold text-white">Article not found</h1>
            <p className="mt-2 text-sm text-[#8fa3bd]">This article may have been moved or unpublished.</p>
            <Link to="/blog" className="mt-6 inline-block rounded-xl bg-[#479dcf] px-5 py-2.5 text-sm font-bold text-[#04101f] hover:bg-[#67d1f0]">Browse the blog</Link>
          </div>
        ) : post === null ? (
          <div className="mt-12 space-y-4" aria-label="Loading article">
            <div className="h-10 w-3/4 animate-pulse rounded-lg bg-[#0d1a2e]" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-[#0d1a2e]" />
            <div className="h-64 animate-pulse rounded-2xl bg-[#0a1424]" />
          </div>
        ) : (
          <article className="mt-8">
            <header>
              {post.tags?.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-[#132746] px-2.5 py-1 text-[11px] font-bold text-[#8fd0f2]">{tag}</span>
                  ))}
                </div>
              )}
              <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">{post.title}</h1>
              <p className="mt-4 text-sm font-semibold text-[#64789a]">
                {post.author_name}
                {post.published_date && <> &middot; {format(new Date(post.published_date), 'MMMM d, yyyy')}</>}
              </p>
            </header>
            {post.cover_image_url && (
              <img src={post.cover_image_url} alt="" className="mt-8 w-full rounded-2xl border border-[#1c2c44] object-cover" />
            )}
            <div className="prose prose-invert mt-10 max-w-none prose-headings:font-bold prose-headings:text-white prose-p:text-[#b9c8dc] prose-a:text-[#67d1f0] prose-strong:text-white prose-li:text-[#b9c8dc] prose-blockquote:border-[#479dcf] prose-blockquote:text-[#8fa3bd]">
              <ReactMarkdown>{post.content}</ReactMarkdown>
            </div>
            <div className="mt-14 rounded-2xl border border-[#1c2c44] bg-[#0a1424] p-8 text-center">
              <h2 className="text-lg font-bold text-white">Ready to make your CMMC plan executable?</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-[#8fa3bd]">See how Kipuka turns compliance requirements into guided, evidence-backed execution.</p>
              <button
                type="button"
                onClick={() => setDemoOpen(true)}
                className="mt-5 rounded-xl bg-[#479dcf] px-5 py-2.5 text-sm font-bold text-[#04101f] hover:bg-[#67d1f0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
              >
                Request a Demo
              </button>
            </div>
          </article>
        )}
      </main>
      <PublicFooter onRequestDemo={() => setDemoOpen(true)} />
      <DemoRequestModal open={demoOpen} onOpenChange={setDemoOpen} />
    </div>
  );
}