// Shared branding + disclaimer strings and PDF helpers for all Phase 4 exports.
// Keeps Pac-Sec / DarkHorizon.AI branding and confidentiality notices consistent.
import jsPDF from 'jspdf';

export const BRAND = {
  company: 'Pacific Global Security Group',
  product: 'CMMC Command Center',
  poweredBy: 'Powered by DarkHorizon.AI',
  confidential: 'CONFIDENTIAL & PROPRIETARY — Property of Pacific Global Security Group. Unauthorized distribution is prohibited.',
  disclaimer: 'Operational guidance only. Validate against official requirements.',
  poamDisclaimer: 'Not all gaps may be allowable for the target assessment path. The organization must validate official requirements before submission.',
};

const M = 48; // page margin
const LINE = 15;

// Strip HTML from richtext fields into plain text for PDF rendering.
export function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<\/(p|div|h[1-6]|li)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Create a branded PDF document with a cover header and footer callback.
export function createReportPdf({ title, project, org, generatedBy, poweredBy = true }) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const state = { y: M, page: 1, doc, pageW, pageH };

  const footer = () => {
    doc.setFontSize(7);
    doc.setTextColor(120);
    doc.text(BRAND.confidential, M, pageH - 28, { maxWidth: pageW - M * 2 });
    doc.text(BRAND.disclaimer, M, pageH - 16);
    doc.text(`Page ${state.page}`, pageW - M, pageH - 16, { align: 'right' });
    doc.setTextColor(0);
  };

  const newPage = () => { footer(); doc.addPage(); state.page += 1; state.y = M; };
  const ensure = (h) => { if (state.y + h > pageH - 60) newPage(); };

  // Header band
  doc.setFillColor(15, 30, 60);
  doc.rect(0, 0, pageW, 70, 'F');
  doc.setTextColor(255);
  doc.setFontSize(15); doc.setFont(undefined, 'bold');
  doc.text(BRAND.product, M, 34);
  doc.setFontSize(9); doc.setFont(undefined, 'normal');
  doc.text(BRAND.company, M, 50);
  if (poweredBy) doc.text(BRAND.poweredBy, pageW - M, 50, { align: 'right' });
  doc.setTextColor(0);
  state.y = 100;

  // Title block
  doc.setFontSize(20); doc.setFont(undefined, 'bold');
  doc.text(title, M, state.y); state.y += 26;
  doc.setFontSize(10); doc.setFont(undefined, 'normal'); doc.setTextColor(80);
  doc.text(`Organization: ${org?.organization_name || '—'}`, M, state.y); state.y += LINE;
  doc.text(`Project: ${project?.project_name || '—'}`, M, state.y); state.y += LINE;
  doc.text(`Generated: ${new Date().toLocaleString()}${generatedBy ? ` by ${generatedBy}` : ''}`, M, state.y); state.y += LINE;
  doc.setTextColor(0);
  state.y += 10;

  const api = {
    doc, state,
    heading(text) {
      ensure(30); state.y += 8;
      doc.setFontSize(13); doc.setFont(undefined, 'bold'); doc.setTextColor(15, 30, 60);
      doc.text(text, M, state.y); state.y += 6;
      doc.setDrawColor(200); doc.line(M, state.y, pageW - M, state.y); state.y += 12;
      doc.setTextColor(0);
    },
    text(body, opts = {}) {
      const size = opts.size || 10;
      doc.setFontSize(size); doc.setFont(undefined, opts.bold ? 'bold' : 'normal');
      const lines = doc.splitTextToSize(stripHtml(body) || '—', pageW - M * 2);
      lines.forEach((ln) => { ensure(LINE); doc.text(ln, M, state.y); state.y += LINE; });
    },
    label(l, v) {
      ensure(LINE);
      doc.setFontSize(10); doc.setFont(undefined, 'bold'); doc.text(`${l}: `, M, state.y);
      const w = doc.getTextWidth(`${l}: `);
      doc.setFont(undefined, 'normal'); doc.text(doc.splitTextToSize(String(v ?? '—'), pageW - M * 2 - w), M + w, state.y);
      state.y += LINE;
    },
    space(h = 8) { state.y += h; },
    ensure,
    // Embed a PNG/JPEG image (e.g. an exported diagram). Scales to page width.
    image(dataUrl, opts = {}) {
      if (!dataUrl) return;
      const maxW = pageW - M * 2;
      const w = Math.min(opts.width || maxW, maxW);
      const h = opts.height || w * 0.6;
      ensure(h + 10);
      try { doc.addImage(dataUrl, 'PNG', M, state.y, w, h); state.y += h + 10; }
      catch { /* skip unrenderable image */ }
    },
    save(filename) { footer(); doc.save(filename); },
    disclaimerNote(text) {
      ensure(30); state.y += 6;
      doc.setFontSize(8); doc.setTextColor(150, 60, 0); doc.setFont(undefined, 'italic');
      doc.splitTextToSize(text, pageW - M * 2).forEach((ln) => { ensure(12); doc.text(ln, M, state.y); state.y += 12; });
      doc.setTextColor(0); doc.setFont(undefined, 'normal');
    },
  };
  return api;
}

export function safeFileName(s) {
  return (s || 'report').replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '');
}