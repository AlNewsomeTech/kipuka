import DOMPurify from 'dompurify';

// Single trust boundary for entity-derived HTML rendered with
// dangerouslySetInnerHTML. Rich-text fields (ReactQuill) are stored as HTML
// and several entities allow open create, so every sink must sanitize.
export function sanitizeHtml(html) {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    // Strip event handlers and any script-ish constructs even if a future
    // ReactQuill build allows them.
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onchange', 'onsubmit', 'formaction'],
  });
}

export default sanitizeHtml;