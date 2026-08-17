// Shared editorial rules and SEO keyword plan for the Kipuka marketing blog.
// Imported by generateBlogArticle. Keep all writing rules here so the drafting
// prompt and the automated style check never drift apart.

// ---------------------------------------------------------------------------
// Primary and secondary keyword plan (agreed with the app owner).
// generateBlogArticle rotates topics through this list when the BlogTopic
// queue is empty.
// ---------------------------------------------------------------------------
export const PRIMARY_KEYWORDS = [
  'CMMC compliance software',
  'CMMC compliance platform',
  'CMMC 2.0 requirements',
  'CMMC Level 1 self-assessment',
  'CMMC Level 2 requirements',
  'NIST SP 800-171 compliance',
  'CMMC for MSPs',
];

export const SECONDARY_KEYWORDS = [
  'SPRS score calculation',
  'how to submit an SPRS score',
  'POA&M for CMMC',
  'CUI vs FCI scoping',
  'CMMC evidence collection',
  'CMMC assessment objectives',
  'System Security Plan for CMMC',
  'C3PAO assessment preparation',
  'CMMC scoping guide',
  'Microsoft 365 GCC High for CUI',
];

// Long-tail article ideas used as the fallback topic rotation. Each entry pairs
// a working title with the keyword the article should rank for.
export const TOPIC_ROTATION = [
  { title: 'CMMC 2.0 Requirements: What Contractors Must Do', keyword: 'CMMC 2.0 requirements' },
  { title: 'How to Complete a CMMC Level 1 Self-Assessment', keyword: 'CMMC Level 1 self-assessment' },
  { title: 'CMMC Level 2 Requirements: A Practical Checklist', keyword: 'CMMC Level 2 requirements' },
  { title: 'How to Calculate and Submit Your SPRS Score', keyword: 'SPRS score calculation' },
  { title: 'CUI and FCI: How to Set Your CMMC Assessment Scope', keyword: 'CUI vs FCI scoping' },
  { title: 'What a POA&M Can and Cannot Do Under CMMC', keyword: 'POA&M for CMMC' },
  { title: 'How to Collect Evidence for CMMC Assessment Objectives', keyword: 'CMMC evidence collection' },
  { title: 'How to Write a System Security Plan for CMMC', keyword: 'System Security Plan for CMMC' },
  { title: 'How to Prepare for a C3PAO Assessment', keyword: 'C3PAO assessment preparation' },
  { title: 'Can You Use Commercial Microsoft 365 for CUI?', keyword: 'Microsoft 365 GCC High for CUI' },
  { title: 'CMMC for MSPs: How to Deliver Compliance Work at Scale', keyword: 'CMMC for MSPs' },
  { title: 'NIST SP 800-171 and CMMC: How the Two Fit Together', keyword: 'NIST SP 800-171 compliance' },
  { title: 'How Much Does CMMC Certification Cost a Small Business?', keyword: 'CMMC certification cost' },
  { title: 'How Long Does CMMC Level 2 Certification Take?', keyword: 'CMMC Level 2 timeline' },
  { title: 'CMMC Compliance Checklist for DoD Subcontractors', keyword: 'CMMC compliance checklist' },
];

// ---------------------------------------------------------------------------
// Writing rules. ASD-STE100 (Simplified Technical English) plus the owner's
// voice rules. This text goes straight into the drafting prompt.
// ---------------------------------------------------------------------------
export const STYLE_GUIDE = `
WRITING STANDARD: ASD-STE100 (Simplified Technical English), adapted for a
technical marketing article.

ASD-STE100 rules you must follow:
- One idea per sentence. Maximum 20 words per sentence in descriptive text.
  Maximum 20 words per step in an instruction.
- Use the active voice. Name the person or system that does the action.
- Use the simplest verb tense. Prefer the present tense.
- Use one word for one meaning. Do not swap synonyms for variety. "Requirement"
  stays "requirement" through the whole article.
- Use approved, plain vocabulary. Replace jargon with the common word.
- Write instructions as commands: "Record the setting." Not: "The setting
  should be recorded."
- Use articles (a, an, the). Do not drop them to save words.
- Do not use noun stacks longer than three words.
- Keep paragraphs to three sentences or fewer.
- Do not use slang, idioms, or figures of speech.

VOICE RULES (mandatory, no exceptions):
- Never use an em dash (—) or an en dash (–). Use a period, a comma, or a
  colon instead.
- Never use the construction "it is not X, it is Y", "this is not X, it is Y",
  "not just X but Y", or any variant of that pattern.
- Never open with "In today's world", "In an era of", "Let's dive in",
  "Buckle up", or any similar warm-up line. Start with the answer.
- Do not use these words or phrases: leverage, seamless, robust, unlock,
  elevate, empower, game-changer, cutting-edge, navigate the landscape,
  ever-evolving, delve, tapestry, testament, realm, journey, moreover,
  furthermore, additionally, in conclusion, at the end of the day.
- Do not use rhetorical questions as headings.
- Do not use emojis.
- No hype. State what is true. If a rule has an exception, say the exception.
- Write to a working technician or a compliance lead. Assume competence.
  Explain the requirement, not the reader's feelings.

STRUCTURE RULES:
You return the article as an ordered list of blocks. Never write Markdown
symbols inside a block. Never put "#", "##", "-", or "*" in any text field.
Block types you may use:
- "paragraph": one to three sentences of prose in the "text" field.
- "heading": a section heading in the "text" field. Maximum 5 headings.
- "subheading": use only when one section truly needs two parts. Rare.
- "bullets": 3 to 6 short items in the "items" field. One sentence each.
- "steps": 3 to 6 ordered actions in the "items" field. One command each.
- "table": "headers" and "rows". Use it only to compare two or three things
  across the same attributes. Maximum one table per article.
Composition rules:
- The first two blocks are paragraphs that answer the title directly. No
  preamble and no heading before them.
- Every heading is followed by at least one paragraph before any list.
- Never place two list blocks next to each other.
- At least 60 percent of the blocks are paragraphs. The article reads as prose
  with lists used for real sequences and real sets, not as a stack of lists.
- The last section is a heading "What to do next" followed by one paragraph and
  one "steps" block of 3 or 4 actions.
REQUIRED BLOCK PLAN (follow it exactly, in this order):
1. Two "paragraph" blocks that answer the title. 3 sentences each.
2. Five body sections. Each body section is one "heading" block followed by
   THREE "paragraph" blocks of 3 sentences each. In two of the five sections,
   add one "bullets" or "steps" block after the second paragraph.
3. One "table" block, only if a real comparison helps the reader.
4. A final "heading" block with the text "What to do next", then one
   "paragraph" block, then one "steps" block of 3 or 4 actions.
That plan produces about 22 blocks and about 1100 words. An article shorter
than 900 words is a failure, so write the full 3 sentences in every paragraph
block and never merge two sections into one.

SEO RULES:
- Use the target keyword in the title, in the first 2 sentences, in at least
  one heading, and 3 to 5 times in the body. Never force it.
- Write headings as the phrases a reader would search for.
- Keep the meta description to 150 to 158 characters and make it a plain
  statement of what the article answers.

ACCURACY RULES:
- Kipuka is a CMMC deployment and evidence management platform. Describe only
  platform capability: guided control implementation, evidence capture,
  readiness reporting, and document generation.
- Never promise a certification result, an assessment outcome, a score, or a
  timeline.
- Never state a legal or contractual conclusion. Point the reader to the
  official CMMC and NIST source material for the authoritative wording.
- Do not invent statistics, dates, deadlines, dollar amounts, or citations. If
  a number is not certain, describe it in words without a figure.
`.trim();

// ---------------------------------------------------------------------------
// Automated style check. Runs on every generated draft. Any violation sends
// the article to Draft with a note instead of publishing it.
// ---------------------------------------------------------------------------
const BANNED_WORDS = [
  'leverage', 'seamless', 'robust', 'unlock', 'elevate', 'empower',
  'game-changer', 'cutting-edge', 'ever-evolving', 'delve', 'tapestry',
  'testament', 'moreover', 'furthermore', 'in conclusion',
  'at the end of the day', "in today's world", 'buckle up', 'dive in',
];

export function findStyleViolations(text: string): string[] {
  const problems: string[] = [];
  const body = String(text || '');
  const lower = body.toLowerCase();

  if (body.includes('\u2014')) problems.push('Contains an em dash.');
  if (body.includes('\u2013')) problems.push('Contains an en dash.');

  // "not X, it is Y" / "not just X but Y" family.
  const notXButY = [
    /\bis not\b[^.!?]{1,80}\bit(?:'s| is)\b/i,
    /\bnot just\b[^.!?]{1,80}\bbut\b/i,
    /\bnot only\b[^.!?]{1,80}\bbut\b/i,
    /\bisn't\b[^.!?]{1,80}\bit's\b/i,
  ];
  if (notXButY.some((re) => re.test(body))) {
    problems.push('Uses a "not X, it is Y" construction.');
  }

  const foundBanned = BANNED_WORDS.filter((w) => lower.includes(w));
  if (foundBanned.length) problems.push(`Uses banned wording: ${foundBanned.join(', ')}.`);

  if (/^\s*#\s/m.test(body)) problems.push('Uses a level-1 "#" heading in the body.');
  if (/^\s*\*\s/m.test(body)) problems.push('Uses "*" bullets instead of "-".');

  const headingCount = (body.match(/^\s*##\s/gm) || []).length;
  if (headingCount > 8) problems.push(`Has ${headingCount} section headings, which is too many.`);
  if (headingCount < 2) problems.push('Has fewer than 2 section headings.');

  // Two lists back to back, and a bare list at the very end.
  if (/^\s*(?:-|\d+\.)\s.*\n\s*\n\s*(?:-|\d+\.)\s/m.test(body)) {
    problems.push('Has two lists directly back to back.');
  }
  // The article is meant to close on the numbered "What to do next" steps, so
  // only an unordered list at the very end is a problem.
  const tail = body.trimEnd().split('\n').slice(-1)[0] || '';
  if (/^\s*-\s/.test(tail)) problems.push('Ends on a bare bullet list.');

  const words = body.split(/\s+/).filter(Boolean).length;
  if (words < 700) problems.push(`Only ${words} words, which is below the 900 word target.`);
  if (words > 1800) problems.push(`${words} words, which is above the 1400 word target.`);

  const longSentences = body
    .replace(/```[\s\S]*?```/g, '')
    .split(/(?<=[.!?])\s+/)
    .filter((s) => !/^\s*(?:-|\d+\.|#|\|)/.test(s))
    .filter((s) => s.split(/\s+/).filter(Boolean).length > 30);
  if (longSentences.length > 2) {
    problems.push(`${longSentences.length} sentences run past 30 words, against the ASD-STE100 limit.`);
  }

  return problems;
}

// ---------------------------------------------------------------------------
// Deterministic Markdown rendering.
// The writer returns structured blocks, not raw Markdown. This keeps spacing,
// heading levels, and bullet characters correct every time, and stops the
// article from arriving as one unbroken block of text.
// ---------------------------------------------------------------------------
export function renderArticle(blocks: any[]): string {
  const out: string[] = [];
  for (const block of Array.isArray(blocks) ? blocks : []) {
    const type = String(block?.type || 'paragraph');
    const text = String(block?.text || '').trim();
    const items = (Array.isArray(block?.items) ? block.items : [])
      .map((i) => String(i).trim())
      .filter(Boolean);

    if (type === 'heading' && text) out.push(`## ${text}`);
    else if (type === 'subheading' && text) out.push(`### ${text}`);
    else if (type === 'bullets' && items.length) out.push(items.map((i) => `- ${i}`).join('\n'));
    else if (type === 'steps' && items.length) out.push(items.map((i, n) => `${n + 1}. ${i}`).join('\n'));
    else if (type === 'table') {
      const headers = (Array.isArray(block?.headers) ? block.headers : []).map((h) => String(h).trim());
      const rows = (Array.isArray(block?.rows) ? block.rows : []).map((r) =>
        (Array.isArray(r) ? r : []).map((c) => String(c).trim()));
      if (headers.length && rows.length) {
        out.push([
          `| ${headers.join(' | ')} |`,
          `| ${headers.map(() => '---').join(' | ')} |`,
          ...rows.map((r) => `| ${r.join(' | ')} |`),
        ].join('\n'));
      }
    } else if (text) out.push(text);
  }
  return out.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
}

// Removes dashes and stray heading levels that slipped through the writer.
export function sanitizeText(value: string): string {
  return String(value || '')
    .replace(/\u2014|\u2013/g, ', ')
    .replace(/\s+,\s+/g, ', ')
    .trim();
}

export function slugify(title: string): string {
  return String(title || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}