import { Link } from 'react-router-dom';
import { format } from 'date-fns';

// Public blog index card. Dark landing-site styling.
export default function BlogPostCard({ post }) {
  return (
    <Link
      to={`/blog/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-[#1c2c44] bg-[#0a1424] transition-colors hover:border-[#479dcf] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#67d1f0]"
    >
      {post.cover_image_url ? (
        <img src={post.cover_image_url} alt="" className="h-44 w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-44 w-full items-center justify-center bg-gradient-to-br from-[#0d1a2e] to-[#132746]" aria-hidden="true">
          <img src="/kipuka-fishhook.svg" alt="" className="h-14 w-auto opacity-40" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-6">
        {post.tags?.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {post.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded-full bg-[#132746] px-2.5 py-1 text-[11px] font-bold text-[#8fd0f2]">{tag}</span>
            ))}
          </div>
        )}
        <h2 className="text-lg font-bold leading-snug text-white group-hover:text-[#8fd0f2]">{post.title}</h2>
        {post.excerpt && <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[#8fa3bd]">{post.excerpt}</p>}
        <p className="mt-auto pt-4 text-xs font-semibold text-[#64789a]">
          {post.author_name}
          {post.published_date && <> &middot; {format(new Date(post.published_date), 'MMMM d, yyyy')}</>}
        </p>
      </div>
    </Link>
  );
}