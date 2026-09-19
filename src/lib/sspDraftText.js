const retiredNotice = 'Pac-Sec standard implementation — draft for review. The following describes the control-specific implementation baseline, not verified deployment or an assessment finding';
const plain = (value) => value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ').replace(/&mdash;|&#8212;/gi, '—').replace(/\s+/g, ' ').trim().replace(/\.$/, '');

// Remove only the exact retired notice, not the user's implementation narrative.
export function cleanSspDraftText(value) {
  const html = String(value || '').replace(/<p(?:\s[^>]*)?>[\s\S]*?<\/p>/gi, (block) => plain(block) === retiredNotice ? '' : block);
  return html.replace(/Pac-Sec standard implementation (?:—|&mdash;|&#8212;) draft for review\.\s+The following describes the control-specific implementation\s+baseline, not verified deployment or an assessment finding\.?/g, '');
}