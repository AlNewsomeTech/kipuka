import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Newspaper, Plus, Pencil, Trash2, Eye, Globe, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import BlogPostEditorModal from '@/components/blog/BlogPostEditorModal';
import GenerateArticleButton from '@/components/blog/GenerateArticleButton';
import BlogTopicQueue from '@/components/blog/BlogTopicQueue';
import EmptyState from '@/components/EmptyState';

const statusPill = {
  Published: 'bg-green-100 text-green-700',
  Draft: 'bg-amber-100 text-amber-800',
  Archived: 'bg-slate-100 text-slate-600',
};

// Admin manager for the public SEO blog. Posts here are served on the
// public /blog pages once Published.
export default function BlogAdmin() {
  const [posts, setPosts] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = async () => {
    const rows = await base44.entities.BlogPost.list('-created_date', 200);
    setPosts(rows);
  };
  useEffect(() => { load(); }, []);

  const handleSave = async (payload) => {
    setSaving(true);
    try {
      const duplicate = (posts || []).find((p) => p.slug === payload.slug && p.id !== editingPost?.id);
      if (duplicate) return `The slug "${payload.slug}" is already used by "${duplicate.title}".`;
      if (editingPost?.id) await base44.entities.BlogPost.update(editingPost.id, payload);
      else await base44.entities.BlogPost.create(payload);
      setEditorOpen(false);
      setEditingPost(null);
      await load();
      return null;
    } catch (err) {
      return err?.message || 'Save failed.';
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (post) => {
    const publishing = post.status !== 'Published';
    await base44.entities.BlogPost.update(post.id, {
      status: publishing ? 'Published' : 'Draft',
      published_date: publishing ? (post.published_date || new Date().toISOString().slice(0, 10)) : post.published_date,
    });
    await load();
  };

  const handleDelete = async (post) => {
    await base44.entities.BlogPost.delete(post.id);
    setConfirmDelete(null);
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="page-kicker">Marketing / SEO</p>
          <h1 className="page-title">Blog Manager</h1>
          <p className="page-subtitle mt-1">
            Published posts appear on the public site at <Link to="/blog" className="font-semibold text-brand hover:underline">/blog</Link>. Drafts stay private.
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <GenerateArticleButton onGenerated={load} />
          <button type="button" className="btn-primary" onClick={() => { setEditingPost(null); setEditorOpen(true); }}>
            <Plus className="h-4 w-4" /> New Post
          </button>
        </div>
      </div>

      <BlogTopicQueue />

      {posts === null ? (
        <div className="app-surface flex items-center justify-center p-16">
          <div className="h-7 w-7 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
        </div>
      ) : posts.length === 0 ? (
        <div className="app-surface p-10">
          <EmptyState
            icon={Newspaper}
            title="No blog posts yet"
            description="Create your first post, or set up a content agent to publish articles on a schedule."
            action={<button type="button" className="btn-primary" onClick={() => setEditorOpen(true)}><Plus className="h-4 w-4" /> New Post</button>}
          />
        </div>
      ) : (
        <div className="app-surface divide-y divide-slate-100 overflow-hidden">
          {posts.map((post) => (
            <div key={post.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${statusPill[post.status] || statusPill.Draft}`}>{post.status}</span>
                  <span className="truncate text-sm font-bold text-slate-800">{post.title}</span>
                </div>
                <p className="mt-1 truncate text-xs text-slate-500">
                  /blog/{post.slug}
                  {post.published_date && <> &middot; {format(new Date(post.published_date), 'MMM d, yyyy')}</>}
                  {post.author_name && <> &middot; {post.author_name}</>}
                </p>
              </div>
              <div className="flex flex-shrink-0 items-center gap-1.5">
                {post.status === 'Published' && (
                  <Link to={`/blog/${post.slug}`} title="View on public site" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800">
                    <Eye className="h-4 w-4" />
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => togglePublish(post)}
                  title={post.status === 'Published' ? 'Unpublish (back to Draft)' : 'Publish'}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                >
                  {post.status === 'Published' ? <FileText className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => { setEditingPost(post); setEditorOpen(true); }}
                  title="Edit"
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                {confirmDelete === post.id ? (
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => handleDelete(post)} className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-red-700">Delete</button>
                    <button type="button" onClick={() => setConfirmDelete(null)} className="rounded-lg px-2 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100">Cancel</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setConfirmDelete(post.id)} title="Delete" className="rounded-lg p-2 text-red-500 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <BlogPostEditorModal
        open={editorOpen}
        onOpenChange={(v) => { setEditorOpen(v); if (!v) setEditingPost(null); }}
        post={editingPost}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  );
}