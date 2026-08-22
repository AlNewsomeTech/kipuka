// Shared clarity rules for the curated CMMC runbook rewrite.
//
// Goal: every stored step must be understandable by a business user or junior
// technician with no CMMC or product-administration background. Keep only the
// actions needed to complete, check, and document the work. These rules are
// enforced on the model output before any stored record is changed.

export const MIGRATION_KEY = 'RUNBOOK-CLARITY-STE-V6-MICROSOFT-FIRST';
export const REWRITE_VERSION = 6;
export const MAX_WORDS_PER_STEP = 26;
export const MIN_STEPS = 6;
export const MAX_STEPS = 24;

export const URL_RE = /https?:\/\/[^\s)"']+/g;

// Internal destinations the runbooks are allowed to name. Everything else must
// come from the source text.
const INTERNAL_DESTINATIONS = [
  'this cmmc project',
  'guided implementation',
  'capture & upload',
  'asset inventory',
  'needs work',
  'poa&m',
  'evidence',
  'readiness',
  'assessment',
  'preliminary scope',
  'final inventory',
  'scoping',
  'inventory',
  'mock assessment',
  'shared responsibility',
  'policies',
  'documentation',
  'reports',
  'diagrams',
  'security tooling',
  'maintenance',
  'ssp',
  'sprs',
  'incident',
];

const VAGUE_PHRASES = [
  'where applicable',
  'as appropriate',
  'as needed',
  'if necessary',
  'etc.',
  'and so on',
  'appropriate personnel',
  'relevant settings',
  'suitable',
  'ensure that',
];

const AMBIGUOUS_PRODUCT = ['kipuka', 'project workspace'];

// Generic UI words that are not navigation targets and never need to be
// present in the source text.
const GENERIC_UI = new Set([
  'save', 'create', 'new', 'next', 'back', 'add', 'edit', 'delete', 'remove',
  'ok', 'yes', 'no', 'done', 'apply', 'close', 'cancel', 'submit', 'review',
  'review + create', 'review and create', 'overview', 'settings', 'properties',
  'export', 'download', 'upload', 'search', 'filter', 'refresh', 'enabled',
  'disabled', 'on', 'off', 'report only', 'all', 'none', 'select all',
  'sign in', 'sign out', 'copy', 'paste', 'print', 'open', 'view', 'name',
  'description', 'status', 'assignments', 'users', 'groups', 'devices',
]);

// Words that can only begin a statement, never an instruction.
const STATEMENT_OPENERS = new Set([
  'the', 'a', 'an', 'this', 'that', 'these', 'those', 'it', 'they', 'there',
  'all', 'each', 'every', 'any', 'evidence', 'access', 'logs', 'users',
  'devices', 'accounts', 'data', 'cui', 'fci', 'policies', 'records',
]);

const IMPERATIVE_VERBS = new Set([
  'open', 'select', 'click', 'choose', 'expand', 'go', 'navigate', 'sign',
  'confirm', 'verify', 'check', 'review', 'compare', 'count', 'read',
  'set', 'enter', 'type', 'add', 'create', 'assign', 'apply', 'enable',
  'disable', 'turn', 'remove', 'delete', 'rename', 'edit', 'update',
  'record', 'write', 'name', 'save', 'copy', 'paste', 'export', 'download',
  'upload', 'attach', 'capture', 'take', 'mark', 'note', 'list', 'keep',
  'use', 'repeat', 'ask', 'tell', 'send', 'filter', 'search', 'scroll',
  'wait', 'continue', 'finish', 'stop', 'do', 'if', 'for', 'in', 'on',
  'change', 'block', 'allow', 'deny', 'require', 'reset', 'restrict',
  'revoke', 'grant', 'suspend', 'lock', 'unlock', 'document', 'log',
  'escalate', 'notify', 'inform', 'schedule', 'plan', 'define', 'describe',
  'pick', 'toggle', 'switch', 'run', 'start', 'install', 'configure',
  'connect', 'disconnect', 'join', 'print', 'share', 'link', 'map', 'tag',
  'label', 'sort', 'group', 'replace', 'restore', 'archive', 'retain',
  'clear', 'close', 'submit', 'approve', 'reject', 'withdraw', 'seal',
  'raise', 'open', 'file', 'store', 'move', 'return', 'leave', 'exclude',
  'include', 'limit', 'test', 'try', 'show', 'hide', 'expand', 'collapse',
]);

const NAV_VERB_RE =
  /(?:go to|open|select|choose|click|expand|under|navigate to|in the)\s+((?:[A-Z][\w&+.-]*(?:\s+[A-Z][\w&+.-]*)*)(?:\s*>\s*[A-Z][\w&+.-]*(?:\s+[A-Z][\w&+.-]*)*)*)/g;

function words(text: string): number {
  return String(text || '').trim().split(/\s+/).filter(Boolean).length;
}

// The source text still says "Kipuka" / "project workspace" in places. Normalize
// it before the rewrite so the model never copies an ambiguous target, and so
// the resulting internal wording counts as source-backed, not invented.
export function normalizeSourceStep(text: string): string {
  return String(text || '')
    .replace(/\bKipuka(?:\s+by\s+Pac-Sec)?\b/gi, 'this CMMC project')
    .replace(/\b(?:the\s+)?project workspace\b/gi, 'this CMMC project');
}

// Deterministic slash removal, so a stray "denied/failure" is fixed rather than
// failing an otherwise good rewrite. URLs are protected.
export function expandSlashes(text: string): string {
  const urls: string[] = [];
  const masked = String(text || '').replace(URL_RE, (m) => {
    urls.push(m);
    return `\u0000${urls.length - 1}\u0000`;
  });
  const word = '[A-Za-z&][A-Za-z&.-]*';
  const fixed = masked
    .replace(/\bN\/A\b/g, 'not applicable')
    .replace(/\band\/or\b/gi, 'or')
    .replace(new RegExp(`(${word})\\/(${word})\\/(${word})`, 'g'), '$1, $2, or $3')
    .replace(new RegExp(`(${word})\\/(${word})`, 'g'), '$1 or $2');
  return fixed.replace(/\u0000(\d+)\u0000/g, (_, i) => urls[Number(i)] ?? '');
}

// Model output cleanup that is safe and deterministic: fix slashes and split a
// semicolon into the two separate actions it was hiding.
export function normalizeModelSteps(steps: string[]): string[] {
  const out: string[] = [];
  for (const raw of steps) {
    const text = expandSlashes(String(raw || '').trim());
    if (!text) continue;
    const halves = text.split(/;\s*/).map((h) => h.trim()).filter(Boolean);
    const splittable = halves.length > 1 && halves.every((h) => h.split(/\s+/).length >= 3);
    for (const piece of splittable ? halves : [text]) {
      out.push(/[.!?]$/.test(piece) ? piece : `${piece}.`);
    }
  }
  return out;
}

export function stepIssues(step: string): string[] {
  const text = String(step || '').trim();
  const issues: string[] = [];
  if (!text) return ['empty step'];

  // A single action that enumerates many items (roles, log fields, asset types)
  // is clearer as one step than as ten. Allow those to run longer.
  // A step may quote a required result verbatim after a colon. Shortening that
  // quote would change the requirement, so only the instruction before the
  // colon is measured.
  const measured = text.includes(': ') ? text.split(': ')[0] : text;
  // The display layer (splitInstructions) shows each sentence as its own
  // instruction line, so the limit applies per sentence, not per stored step.
  for (const sentence of measured.split(/(?<=[.!?])\s+/)) {
    const commas = (sentence.match(/,/g) || []).length;
    const limit = commas >= 4 ? 42 : MAX_WORDS_PER_STEP;
    if (words(sentence) > limit) {
      issues.push(`over ${limit} words`);
      break;
    }
  }

  const lower = text.toLowerCase();
  const withoutUrls = text.replace(URL_RE, ' ');
  if (withoutUrls.includes('/')) issues.push('slash instead of a word');
  if (/\band then\b/i.test(text)) issues.push('two actions in one step');
  for (const phrase of VAGUE_PHRASES) {
    if (lower.includes(phrase)) issues.push(`vague wording: ${phrase}`);
  }
  // "as required" is vague on its own but precise when it names the authority.
  if (/\bas required\b/i.test(text) && !/\bas required by\b/i.test(text)) {
    issues.push('vague wording: as required');
  }
  for (const phrase of AMBIGUOUS_PRODUCT) {
    if (lower.includes(phrase)) issues.push(`ambiguous destination: ${phrase}`);
  }
  // Only the instruction itself must be active. A step that opens with an
  // imperative verb is already a direct order to the technician, even when it
  // later quotes a requirement ("Set the result to: logs are protected").
  // Passive voice only matters when the whole step is a statement about a
  // subject ("The audit logs are protected"). A step that opens with a verb
  // ("Decide whether CUI may be stored...") or with a condition ("When a user
  // is terminated, block sign-in") is already a direct order, so its internal
  // passive wording is correct English and must not block the rewrite.
  const firstWord = (text.match(/^([A-Za-z]+)/) || [])[1]?.toLowerCase() || '';
  const isStatementForm = STATEMENT_OPENERS.has(firstWord);
  const isCriteria = /\b(?:passing|failing)\b/i.test(text) || /\bmeans\b/i.test(text);
  if (isStatementForm && !isCriteria
    && /\b(?:is|are|was|were|be|been|being)\s+[a-z]+(?:ed|en)\b/i.test(text)) {
    issues.push('passive voice');
  }
  if (/\[[A-Z ]+\]/.test(text)) issues.push('placeholder text left in step');
  return issues;
}

// Controls whose steps create a new policy, rule, profile, or written procedure
// must tell the technician the exact name to use.
export function requiresNaming(variant: any): boolean {
  const text = JSON.stringify(variant?.steps || []).toLowerCase();
  return /(create|add|new)\s+(a\s+)?(policy|rule|profile|query|group|baseline|procedure|plan|standard)/.test(text);
}

function navSegments(step: string): string[] {
  const found: string[] = [];
  for (const match of String(step || '').matchAll(NAV_VERB_RE)) {
    for (const part of match[1].split('>')) {
      const seg = part.trim().replace(/[.,:;]+$/, '');
      if (seg) found.push(seg);
    }
  }
  return found;
}

export function validateRewrite(
  sourceSteps: string[],
  newSteps: string[],
  opts: { requireNaming?: boolean; allowedNavSource?: string[]; variantKey?: string } = {},
): string[] {
  const failures: string[] = [];
  if (!newSteps.length) return ['no steps returned'];
  if (newSteps.length < MIN_STEPS) failures.push(`fewer than ${MIN_STEPS} steps`);
  if (newSteps.length > MAX_STEPS) failures.push(`more than ${MAX_STEPS} steps`);

  newSteps.forEach((step, index) => {
    for (const issue of stepIssues(step)) failures.push(`step ${index + 1}: ${issue}`);
  });

  const newText = newSteps.join('\n');
  const newLower = newText.toLowerCase();
  if (new Set(newSteps.map((step) => step.toLowerCase().replace(/\W+/g, ' ').trim())).size !== newSteps.length) {
    failures.push('duplicate steps');
  }

  // Every portal URL in the source must survive the rewrite.
  const sourceUrls = new Set(sourceSteps.join('\n').match(URL_RE) || []);
  for (const url of sourceUrls) {
    if (!newText.includes(url)) failures.push(`dropped portal address: ${url}`);
  }

  // Navigation targets must exist in the source text. Inventing a menu path is
  // the single most damaging failure mode for a technician.
  const corpus = [
    ...sourceSteps,
    ...(opts.allowedNavSource || []),
    ...INTERNAL_DESTINATIONS,
  ].join('\n').toLowerCase();
  const reported = new Set<string>();
  for (const step of newSteps) {
    for (const seg of navSegments(step)) {
      const key = seg.toLowerCase();
      if (GENERIC_UI.has(key) || reported.has(key)) continue;
      if (!corpus.includes(key)) {
        reported.add(key);
        failures.push(`invented navigation target: ${seg}`);
      }
    }
  }

  if (!/needs work|poa&m/i.test(newText)) {
    failures.push('no instruction for what to do when the check fails');
  }
  if (!newLower.includes('capture')) {
    failures.push('no instruction to capture the evidence');
  }
  if (opts.requireNaming && !newText.includes('CompanyName_')) {
    failures.push('missing the exact required name for the new item');
  }
  return failures;
}

export function rewritePrompt(args: {
  controlId: string;
  controlTitle: string;
  variantKey: string;
  variant: any;
  requireNaming: boolean;
  previousFailures?: string[];
}): string {
  const { controlId, controlTitle, variantKey, variant, requireNaming, previousFailures } = args;
  const steps = (Array.isArray(variant?.steps) ? variant.steps : []).map(
    (s: any, i: number) => `${i + 1}. ${s}`,
  ).join('\n');

  return `You rewrite CMMC implementation runbook steps for a business user or junior technician with no CMMC or product-administration background.

CONTROL: ${controlId} - ${controlTitle}
ENVIRONMENT VARIANT: ${variantKey}
OUTCOME: ${variant?.outcome || ''}
WHERE TO GO: ${variant?.where_to_go?.name || ''} ${variant?.where_to_go?.url || ''}
SETTING OR DECISION: ${variant?.setting_to_change || ''}

CURRENT STEPS (rewrite these, keep the same technical meaning):
${steps}

RULES (all mandatory):
1. Write in ASD-STE100 Simplified Technical English.
2. One action per step. Never join two actions with "and then" or a semicolon.
3. Keep each step at or under 24 words. A step that lists many items may reach 42 words.
4. Use active voice and the imperative: "Select X", not "X should be selected".
5. Never use a slash between words. Write "or".
6. Never use vague wording: where applicable, as appropriate, as needed, if necessary, etc.
7. Keep only actions the user must perform, check, or document. Remove repeated reminders and duplicate evidence directions.
8. NEVER invent a menu name, blade, tab, or path. Use only navigation names that appear in the text above.
9. Keep every portal address (https://...) exactly as written.
10. Do not use placeholder brackets like [SYSTEM].
11. For internal destinations in this platform, write "this CMMC project" and then the page name, for example "Open this CMMC project and go to Capture & Upload".
12. Never write the product name "Kipuka" or the phrase "project workspace".
13. Include a step that verifies the result and states what a pass looks like on screen.
14. Include a step that says: if the check fails, set the control to Needs Work and create a POA&M item.
15. End with steps that capture the evidence and finish on Capture & Upload.
16. Use 8 to 20 steps when possible. Never return fewer than 6 or more than 24 steps.
17. Define an acronym in plain words the first time it appears. Use the acronym alone only after that.
18. Before a change can interrupt access or service, state what the change affects and tell the user to confirm an approved maintenance window.
19. State the account role or permission needed to open each external administration page.
20. Use Microsoft 365 Commercial as the recommended implementation baseline for every variant, including the fallback variant.
21. Name the exact Microsoft admin center, page, menu path, required role, and setting when the source provides them.
22. Prefer Entra, Intune, Defender, Purview, SharePoint, Exchange, Teams, and OneDrive controls over vendor-neutral substitutes.
23. Do not repeat a step or restate the same confirmation in different words.
${requireNaming ? '24. When a step creates a new policy, rule, profile, group, or written procedure, tell the technician to use the exact name shown in the Policy and configuration names panel, in the format CompanyName_PolicyType_CONTROLID_ControlLocation_YYYY-MM-DD. Include the literal text CompanyName_ in that step.' : ''}
${previousFailures?.length ? `\nYOUR PREVIOUS ATTEMPT WAS REJECTED. Fix exactly these problems:\n- ${previousFailures.join('\n- ')}` : ''}

Return JSON only: { "steps": ["...", "..."] }`;
}