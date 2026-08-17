import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const slugify = (text) =>
  String(text || '').toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const EMPTY = {
  title: '', slug: '', excerpt: '', content: '', cover_image_url: '',
  tags: '', author_name: 'Kipuka Team', status: 'Draft', published_date: '',
  meta_title: '', meta_description: '',
};

// Admin create/edit form for a blog post. Content is Markdown.
export default function BlogPostEditorModal({ open, onOpenChange, post, onSave, saving }) {
  const [form, setForm] = useState(EMPTY);
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState('');
  const isEdit = !!post?.id;

  useEffect(() => {
    if (!open) return;
    setError('');
    setSlugTouched(!!post?.id);
    setForm(post?.id ? {
      title: post.title || '', slug: post.slug || '', excerpt: post.excerpt || '',
      content: post.content || '', cover_image_url: post.cover_image_url || '',
      tags: (post.tags || []).join(', '), author_name: post.author_name || 'Kipuka Team',
      status: post.status || 'Draft', published_date: post.published_date || '',
      meta_title: post.meta_title || '', meta_description: post.meta_description || '',
    } : EMPTY);
  }, [open, post]);

  const set = (field) => (e) => {
    const value = e.target.value;
    setForm((f) => {
      const next = { ...f, [field]: value };
      if (field === 'title' && !slugTouched) next.slug = slugify(value);
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !slugify(form.slug)) { setError('Title and a valid slug are required.'); return; }
    setError('');
    const payload = {
      title: form.title.trim(),
      slug: slugify(form.slug),
      excerpt: form.excerpt.trim(),
      content: form.content,
      cover_image_url: form.cover_image_url.trim(),
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      author_name: form.author_name.trim() || 'Kipuka Team',
      status: form.status,
      published_date: form.status === 'Published' && !form.published_date
        ? new Date().toISOString().slice(0, 10)
        : (form.published_date || undefined),
      meta_title: form.meta_title.trim(),
      meta_description: form.meta_description.trim(),
    };
    const saveError = await onSave(payload);
    if (saveError) setError(saveError);
  };

  const label = 'block text-xs font-bold text-slate-600 mb-1';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Post' : 'New Blog Post'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={label} htmlFor="bp-title">Title *</label>
              <input id="bp-title" className="form-input" value={form.title} onChange={set('title')} required />
            </div>
            <div>
              <label className={label} htmlFor="bp-slug">URL Slug *</label>
              <input id="bp-slug" className="form-input" value={form.slug}
                onChange={(e) => { setSlugTouched(true); setForm((f) => ({ ...f, slug: e.target.value })); }} required />
              <p className="mt-1 text-[11px] text-slate-400">/blog/{slugify(form.slug) || 'your-slug'}</p>
            </div>
            <div>
              <label className={label} htmlFor="bp-author">Author</label>
              <input id="bp-author" className="form-input" value={form.author_name} onChange={set('author_name')} />
            </div>
            <div className="sm:col-span-2">
              <label className={label} htmlFor="bp-excerpt">Excerpt (shown on the blog index and used for SEO)</label>
              <textarea id="bp-excerpt" className="form-input" rows={2} value={form.excerpt} onChange={set('excerpt')} />
            </div>
            <div className="sm:col-span-2">
              <label className={label} htmlFor="bp-content">Content (Markdown)</label>
              <textarea id="bp-content" className="form-input font-mono text-xs" rows={14} value={form.content} onChange={set('content')} />
            </div>
            <div>
              <label className={label} htmlFor="bp-cover">Cover Image URL</label>
              <input id="bp-cover" className="form-input" value={form.cover_image_url} onChange={set('cover_image_url')} />
            </div>
            <div>
              <label className={label} htmlFor="bp-tags">Tags (comma separated)</label>
              <input id="bp-tags" className="form-input" value={form.tags} onChange={set('tags')} placeholder="CMMC, NIST 800-171" />
            </div>
            <div>
              <label className={label} htmlFor="bp-status">Status</label>
              <select id="bp-status" className="form-input" value={form.status} onChange={set('status')}>
                <option value="Draft">Draft</option>
                <option value="Published">Published</option>
                <option value="Archived">Archived</option>
              </select>
            </div>
            <div>
              <label className={label} htmlFor="bp-date">Publish Date</label>
              <input id="bp-date" type="date" className="form-input" value={form.published_date} onChange={set('published_date')} />
            </div>
            <div>
              <label className={label} htmlFor="bp-mtitle">SEO Meta Title (optional)</label>
              <input id="bp-mtitle" className="form-input" value={form.meta_title} onChange={set('meta_title')} />
            </div>
            <div>
              <label className={label} htmlFor="bp-mdesc">SEO Meta Description (optional)</label>
              <input id="bp-mdesc" className="form-input" value={form.meta_description} onChange={set('meta_description')} />
            </div>
          </div>
          {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => onOpenChange(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Post'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}