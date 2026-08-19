// ASD-STE100 (Simplified Technical English) presentation rules for runbook copy.
//
// This module NEVER edits stored ControlLibrary data. It normalizes the wording
// at display time so a technician reads short, single-action instructions.
//
// Rules applied here:
//  - One instruction per line (STE: one instruction per sentence).
//  - No slash to join words (STE: one word, one meaning).
//  - Plain product wording instead of internal workspace names.

const PLACEHOLDER = '\u0000';

// URLs, portal paths, and date/time masks must survive slash expansion.
const PROTECTED = [
  /https?:\/\/\S+/g,
  /\b[\w.-]+\.(?:com|net|org|gov|mil|io)\/\S*/g,
  /\b(?:YYYY|MM|DD|HH)(?:[/](?:YYYY|MM|DD|HH|SS|mm|ss)){1,3}\b/g,
];

function protect(text) {
  const kept = [];
  let out = String(text || '');
  for (const pattern of PROTECTED) {
    out = out.replace(pattern, (match) => {
      kept.push(match);
      return `${PLACEHOLDER}${kept.length - 1}${PLACEHOLDER}`;
    });
  }
  return { out, kept };
}

function restore(text, kept) {
  return text.replace(
    new RegExp(`${PLACEHOLDER}(\\d+)${PLACEHOLDER}`, 'g'),
    (_, index) => kept[Number(index)] ?? '',
  );
}

// STE does not allow the slash as a connector. "denied/failure" becomes
// "denied or failure"; three-part groups become a comma list.
export function expandSlashes(value) {
  const { out, kept } = protect(value);
  const word = '[A-Za-z&][A-Za-z&.-]*';
  const expanded = out
    .replace(/\bN\/A\b/g, 'not applicable')
    .replace(/\band\/or\b/gi, 'or')
    .replace(new RegExp(`(${word})\\/(${word})\\/(${word})`, 'g'), '$1, $2, or $3')
    .replace(new RegExp(`(${word})\\/(${word})`, 'g'), '$1 or $2');
  return restore(expanded, kept);
}

// Internal product names are not useful navigation for a technician.
export function cleanRunbookText(value) {
  return expandSlashes(
    String(value || '')
      .replace(/\bKipuka(?:\s+by\s+Pac-Sec)?\b/gi, 'this CMMC project')
      .replace(/\b(?:the\s+)?project workspace\b/gi, 'this CMMC project')
      .replace(/\.\s+shown at the top/gi, ' shown at the top')
      .replace(/\bStep 4\b/g, 'Step 3')
      .replace(/\bStep 5\b/g, 'Step 4')
      // Some stored steps contain a stray double period mid-text.
      .replace(/\.{2,}(?=\s|$)/g, '.')
      .replace(/\s{2,}/g, ' '),
  );
}

// Splits one stored step into separate single-action instructions.
// Sentence boundaries and semicolons are the only split points, so no
// authored meaning is invented or dropped.
export function splitInstructions(value) {
  const cleaned = cleanRunbookText(value).trim();
  if (!cleaned) return [];

  const sentences = cleaned.split(/(?<=[.!?])\s+/);
  const parts = [];
  for (const sentence of sentences) {
    const pieces = sentence.split(/;\s*/).map((piece) => piece.trim()).filter(Boolean);
    // Only accept a semicolon split when both sides are real instructions.
    const usable = pieces.length > 1 && pieces.every((piece) => piece.split(/\s+/).length >= 3);
    for (const piece of usable ? pieces : [sentence.trim()]) {
      const text = piece.trim();
      if (!text) continue;
      parts.push(/[.!?]$/.test(text) ? text : `${text}.`);
    }
  }
  return parts.length ? parts : [cleaned];
}