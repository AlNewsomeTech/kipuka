import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import PublicHeader from '@/components/landing/PublicHeader';
import PublicFooter from '@/components/landing/PublicFooter';
import DemoRequestModal from '@/components/landing/DemoRequestModal';
import BlogPostCard from '@/components/blog/BlogPostCard';

// Public SEO blog index. Reads ONLY published posts through the public
// read-only backend function — no protected application data.
export default function BlogIndex() {
  const [posts, setPosts] = useState(null);
  const [demoOpen, setDemoOpen] = useState(false);

  useEffect(() => {
    document.title = 'Blog — CMMC Compliance Insights | Kipuka';
    let cancelled = false;
    base44.functions.invoke('getPublicBlogPosts', {})
      .then((res) => { if (!cancelled) setPosts(res.data?.posts || []); })
      .catch(() => { if (!cancelled) setPosts([]); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-[#060c18] font-body text-white antialiased">
      <PublicHeader onRequestDemo={() => setDemoOpen(true)} />
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#67d1f0]">Kipuka Blog</p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-white">CMMC Compliance Insights</h1>
          <p className="mt-4 text-base leading-relaxed text-[#8fa3bd]">
            Practical guidance on CMMC 2.0, NIST SP 800-171, evidence collection, and getting
            defense contractors assessment-ready.
          </p>
        </div>

        {posts === null ? (
          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading articles">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-80 animate-pulse rounded-2xl border border-[#1c2c44] bg-[#0a1424]" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="mt-14 rounded-2xl border border-[#1c2c44] bg-[#0a1424] p-12 text-center">
            <h2 className="text-lg font-bold text-white">Articles are on the way</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-[#8fa3bd]">
              We are preparing practical CMMC readiness content. Check back soon.
            </p>
          </div>
        ) : (
          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => <BlogPostCard key={post.slug} post={post} />)}
          </div>
        )}
      </main>
      <PublicFooter onRequestDemo={() => setDemoOpen(true)} />
      <DemoRequestModal open={demoOpen} onOpenChange={setDemoOpen} />
    </div>
  );
}