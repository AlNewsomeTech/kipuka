import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  STYLE_GUIDE,
  TOPIC_ROTATION,
  PRIMARY_KEYWORDS,
  SECONDARY_KEYWORDS,
  findStyleViolations,
  renderArticle,
  sanitizeText,
  slugify,
} from '../../shared/blogStyleGuide.ts';
import { BLOG_WORKFLOW_SECRET } from '../../shared/blogWorkflowAuth.ts';

// Writes one SEO article for the public Kipuka blog in ASD-STE100 style.
//
// Two callers:
//   1. The "Blog Content Schedule" workflow (no user session). It may publish a
//      clean article automatically.
//   2. An admin from Blog Manager with { publish: false }. Always a Draft.
//
// Every draft passes an automated style check. If the check still fails after
// one rewrite attempt, the article is saved as a Draft with the reasons in its
// notes so a human can fix it. Nothing broken is ever published.

const AUTO_THROTTLE_HOURS = 6;

function buildPrompt(topic, existingTitles) {
  return [
    'You write technical articles for the Kipuka blog. Kipuka is a CMMC 2.0',
    'deployment and evidence management platform used by MSPs, compliance',
    'consultants, and defense contractors.',
    '',
    `ARTICLE TOPIC: ${topic.working_title}`,
    `PRIMARY TARGET KEYWORD: ${topic.target_keyword}`,
    topic.notes ? `EDITOR NOTES: ${topic.notes}` : '',
    '',
    'Related keywords you may use naturally where they fit:',
    `${PRIMARY_KEYWORDS.join(', ')}, ${SECONDARY_KEYWORDS.join(', ')}.`,
    '',
    existingTitles.length
      ? `Do NOT repeat these already published articles: ${existingTitles.slice(0, 25).join(' | ')}.`
      : '',
    '',
    'Follow every rule below exactly. The rules are not optional.',
    '',
    STYLE_GUIDE,
    '',
    'Return the article as an ordered array of blocks in "content_blocks".',
    'Do not repeat the article title inside the blocks.',
  ].filter(Boolean).join('\n');
}

const ARTICLE_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    slug: { type: 'string' },
    excerpt: { type: 'string' },
    meta_title: { type: 'string' },
    meta_description: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    content_blocks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['paragraph', 'heading', 'subheading', 'bullets', 'steps', 'table'] },
          text: { type: 'string' },
          items: { type: 'array', items: { type: 'string' } },
          headers: { type: 'array', items: { type: 'string' } },
          rows: { type: 'array', items: { type: 'array', items: { type: 'string' } } },
        },
        required: ['type'],
      },
    },
  },
  required: ['title', 'excerpt', 'meta_description', 'content_blocks'],
};

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));

    // ---- Authorization -----------------------------------------------------
    // Two allowed callers, both verified explicitly:
    //   1. A signed-in platform admin (Blog Manager). Always saves a Draft.
    //   2. The "Blog Content Schedule" workflow, which proves itself with the
    //      shared workflow secret. Only this path may auto-publish, and it is
    //      throttled below. The absence of a user session is NEVER treated as
    //      proof of a scheduled run — anonymous callers are rejected.
    const user = await base44.auth.me().catch(() => null);
    const isAdmin = Boolean(user && user.role === 'admin');
    const isWorkflow = payload?.workflow_secret === BLOG_WORKFLOW_SECRET;
    if (!isAdmin && !isWorkflow) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const scheduled = !isAdmin;
    const publish = scheduled ? payload?.publish !== false : false;

    const svc = base44.asServiceRole;

    if (scheduled) {
      const recent = await svc.entities.BlogPost.list('-created_date', 1);
      const last = recent[0];
      if (last?.created_date) {
        const ageHours = (Date.now() - new Date(last.created_date).getTime()) / 36e5;
        if (ageHours < AUTO_THROTTLE_HOURS) {
          return Response.json(
            { ok: false, skipped: true, reason: `A post was created ${ageHours.toFixed(1)} hours ago. Throttled.` },
            { status: 200 },
          );
        }
      }
    }

    // ---- Pick the topic ----------------------------------------------------
    const existing = await svc.entities.BlogPost.list('-created_date', 200);
    const existingSlugs = new Set(existing.map((p) => p.slug));
    const existingTitles = existing.map((p) => p.title);

    let topicRecord = null;
    let topic = null;

    if (payload?.working_title) {
      topic = {
        working_title: String(payload.working_title).slice(0, 200),
        target_keyword: String(payload.target_keyword || '').slice(0, 120) || PRIMARY_KEYWORDS[0],
        notes: String(payload.notes || '').slice(0, 1000),
      };
    } else {
      const queued = await svc.entities.BlogTopic.filter({ status: 'Queued' }, 'created_date', 1);
      topicRecord = queued[0] || null;
      if (topicRecord) {
        topic = {
          working_title: topicRecord.working_title,
          target_keyword: topicRecord.target_keyword || PRIMARY_KEYWORDS[0],
          notes: topicRecord.notes || '',
        };
      } else {
        const unused = TOPIC_ROTATION.filter((t) => !existingSlugs.has(slugify(t.title)));
        const pick = unused[0] || TOPIC_ROTATION[existing.length % TOPIC_ROTATION.length];
        topic = { working_title: pick.title, target_keyword: pick.keyword, notes: '' };
      }
    }

    // ---- Draft, check style, one rewrite attempt ---------------------------
    let article = await svc.integrations.Core.InvokeLLM({
      prompt: buildPrompt(topic, existingTitles),
      response_json_schema: ARTICLE_SCHEMA,
    });

    let content = sanitizeText(renderArticle(article?.content_blocks));
    let violations = findStyleViolations(content);

    if (violations.length) {
      const rewritePrompt = [
        'You wrote the article below. It failed the house style check.',
        '',
        `STYLE PROBLEMS TO FIX:\n- ${violations.join('\n- ')}`,
        '',
        'Rewrite the whole article so it obeys every rule. Keep the same topic,',
        'the same target keyword, and the same factual content. Change only what',
        'the rules require.',
        '',
        STYLE_GUIDE,
        '',
        `TITLE: ${article?.title || topic.working_title}`,
        `TARGET KEYWORD: ${topic.target_keyword}`,
        '',
        'CURRENT ARTICLE:',
        content,
      ].join('\n');

      const retry = await svc.integrations.Core.InvokeLLM({
        prompt: rewritePrompt,
        response_json_schema: ARTICLE_SCHEMA,
      });
      const retryContent = sanitizeText(renderArticle(retry?.content_blocks));
      const retryViolations = findStyleViolations(retryContent);
      if (retryContent && retryViolations.length <= violations.length) {
        article = { ...article, ...retry };
        content = retryContent;
        violations = retryViolations;
      }
    }

    // ---- Save --------------------------------------------------------------
    const title = sanitizeText(article?.title || topic.working_title).slice(0, 200);
    let slug = slugify(article?.slug || title);
    if (!slug) slug = slugify(topic.working_title) || `article-${Date.now()}`;
    if (existingSlugs.has(slug)) slug = `${slug}-${new Date().toISOString().slice(0, 10)}`;

    const clean = violations.length === 0;
    const status = publish && clean ? 'Published' : 'Draft';

    const tags = Array.isArray(article?.tags)
      ? article.tags.map((t) => String(t).slice(0, 40)).slice(0, 6)
      : [topic.target_keyword];

    const post = await svc.entities.BlogPost.create({
      title,
      slug,
      excerpt: sanitizeText(article?.excerpt).slice(0, 400),
      content,
      tags,
      author_name: 'Kipuka Team',
      status,
      published_date: status === 'Published' ? new Date().toISOString().slice(0, 10) : undefined,
      meta_title: sanitizeText(article?.meta_title || title).slice(0, 200),
      meta_description: sanitizeText(article?.meta_description || article?.excerpt).slice(0, 300),
    });

    if (topicRecord) {
      await svc.entities.BlogTopic.update(topicRecord.id, {
        status: 'Used',
        used_post_slug: slug,
        used_date: new Date().toISOString(),
      });
    }

    console.log(`Blog article "${title}" saved as ${status}. Style problems: ${violations.length}`);

    return Response.json({
      ok: true,
      post: { id: post.id, title, slug, status },
      target_keyword: topic.target_keyword,
      style_violations: violations,
      needs_review: !clean,
      message: clean
        ? (status === 'Published' ? 'Article published.' : 'Article saved as a draft for review.')
        : 'Article saved as a draft because it failed the house style check.',
    });
  } catch (error) {
    console.error('generateBlogArticle failed', error?.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}