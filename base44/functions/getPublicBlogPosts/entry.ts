import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Public, unauthenticated, READ-ONLY endpoint for the marketing blog.
// Serves ONLY Published BlogPost records with a whitelisted field set —
// drafts, archived posts, and all other app data are never exposed.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));
    const slug = typeof payload?.slug === 'string' ? payload.slug.trim().slice(0, 200) : '';

    const publicFields = (p) => ({
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt || '',
      cover_image_url: p.cover_image_url || '',
      tags: Array.isArray(p.tags) ? p.tags.slice(0, 10) : [],
      author_name: p.author_name || 'Kipuka Team',
      published_date: p.published_date || p.created_date,
    });

    if (slug) {
      const matches = await base44.asServiceRole.entities.BlogPost.filter(
        { slug, status: 'Published' }, '-published_date', 1,
      );
      const post = matches[0];
      if (!post) return Response.json({ error: 'Post not found' }, { status: 404 });
      return Response.json({
        post: {
          ...publicFields(post),
          content: post.content || '',
          meta_title: post.meta_title || post.title,
          meta_description: post.meta_description || post.excerpt || '',
        },
      });
    }

    const posts = await base44.asServiceRole.entities.BlogPost.filter(
      { status: 'Published' }, '-published_date', 50,
    );
    return Response.json({ posts: posts.map(publicFields) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}