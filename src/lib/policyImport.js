// Policy template importer helpers. Parses uploaded .docx files (or a .zip of
// .docx files) into markdown, normalizes the "<Company Name>" placeholder to the
// {{company_name}} merge variable, and derives a policy name from the filename.
import mammoth from 'mammoth';
import JSZip from 'jszip';

// The 14 NIST 800-171 family names + supplemental buckets, for the category dropdown.
export const IMPORT_CATEGORIES = [
  'Access Control',
  'Awareness and Training',
  'Audit and Accountability',
  'Configuration Management',
  'Identification and Authentication',
  'Incident Response',
  'Maintenance',
  'Media Protection',
  'Personnel Security',
  'Physical Protection',
  'Risk Assessment',
  'Security Assessment',
  'System and Communications Protection',
  'System and Information Integrity',
  'Supplemental',
  'Legacy — review applicability',
];

// Convert "Access_Control-Policy.docx" -> "Access Control Policy".
export function policyNameFromFilename(filename) {
  const base = (filename || '').replace(/\.[^.]+$/, '');
  const spaced = base.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return spaced.replace(/\b\w/g, (c) => c.toUpperCase());
}

// Replace every "<Company Name>" spacing/case variant with {{company_name}}.
export function normalizeCompanyPlaceholder(text) {
  return (text || '').replace(/<\s*company\s*name\s*>/gi, '{{company_name}}');
}

// Convert mammoth HTML output to lightweight markdown preserving headings/lists.
function htmlToMarkdown(html) {
  let md = html || '';
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gis, (_, t) => `# ${strip(t)}\n\n`);
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gis, (_, t) => `## ${strip(t)}\n\n`);
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gis, (_, t) => `### ${strip(t)}\n\n`);
  md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gis, (_, t) => `#### ${strip(t)}\n\n`);
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gis, (_, t) => `- ${strip(t)}\n`);
  md = md.replace(/<\/(ul|ol)>/gi, '\n');
  md = md.replace(/<(ul|ol)[^>]*>/gi, '');
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gis, (_, t) => `${strip(t)}\n\n`);
  md = md.replace(/<br\s*\/?>/gi, '\n');
  md = md.replace(/<[^>]+>/g, '');
  md = md.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
  return md.replace(/\n{3,}/g, '\n\n').trim();
}
function strip(t) { return (t || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(); }

// Parse a single .docx ArrayBuffer into { markdown }.
async function parseDocxBuffer(arrayBuffer) {
  const { value } = await mammoth.convertToHtml({ arrayBuffer });
  return normalizeCompanyPlaceholder(htmlToMarkdown(value));
}

// Parse an uploaded File (either a .docx or a .zip of .docx) into an array of
// { filename, policy_name, body } draft records.
export async function parseUploadedPolicyFiles(files) {
  const drafts = [];
  for (const file of files) {
    const name = file.name || '';
    if (/\.zip$/i.test(name)) {
      const zip = await JSZip.loadAsync(file);
      const entries = Object.values(zip.files).filter((f) => !f.dir && /\.docx$/i.test(f.name));
      for (const entry of entries) {
        const buf = await entry.async('arraybuffer');
        const body = await parseDocxBuffer(buf);
        const short = entry.name.split('/').pop();
        drafts.push({ filename: short, policy_name: policyNameFromFilename(short), body });
      }
    } else if (/\.docx$/i.test(name)) {
      const buf = await file.arrayBuffer();
      const body = await parseDocxBuffer(buf);
      drafts.push({ filename: name, policy_name: policyNameFromFilename(name), body });
    }
    // silently skip unsupported files
  }
  return drafts;
}

// Family code from a category name (for family_code stamping). '' for supplemental/legacy.
const FAMILY_CODES = {
  'Access Control': 'AC', 'Awareness and Training': 'AT', 'Audit and Accountability': 'AU',
  'Configuration Management': 'CM', 'Identification and Authentication': 'IA', 'Incident Response': 'IR',
  'Maintenance': 'MA', 'Media Protection': 'MP', 'Personnel Security': 'PS', 'Physical Protection': 'PE',
  'Risk Assessment': 'RA', 'Security Assessment': 'CA', 'System and Communications Protection': 'SC',
  'System and Information Integrity': 'SI',
};
export function familyCodeForCategory(category) {
  return FAMILY_CODES[category] || '';
}