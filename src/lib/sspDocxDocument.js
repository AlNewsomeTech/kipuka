import JSZip from 'jszip';
import { sanitizeHtml } from '@/lib/sanitizeHtml';

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const header = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const xml = (value) => String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]);
const run = (value, props = '') => `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ''}<w:t xml:space="preserve">${xml(value)}</w:t></w:r>`;
const paragraph = (runs, props = '') => `<w:p>${props ? `<w:pPr>${props}</w:pPr>` : ''}${runs}</w:p>`;

// A genuine OOXML document, not HTML renamed as .docx; all text stays editable.
export function createSspDocxDocument(footerText) {
  const zip = new JSZip();
  const body = [];
  const relationships = [
    { id: 'rId1', type: 'styles', target: 'styles.xml' },
    { id: 'rId2', type: 'numbering', target: 'numbering.xml' },
    { id: 'rId3', type: 'footer', target: 'footer.xml' },
  ];
  let imageCount = 0;
  const relation = (type, target, external = false) => {
    const id = `rId${relationships.length + 1}`;
    relationships.push({ id, type, target, external });
    return id;
  };
  const inline = (node, props = '') => {
    if (node.nodeType === 3) return run(node.textContent.replace(/\s+/g, ' '), props);
    if (node.nodeType !== 1 || ['UL', 'OL', 'TABLE'].includes(node.tagName)) return '';
    if (node.tagName === 'BR') return '<w:r><w:br/></w:r>';
    if (node.tagName === 'IMG') return run(node.getAttribute('alt') || '[Image — see source document]', props);
    const flags = { B: '<w:b/>', STRONG: '<w:b/>', I: '<w:i/>', EM: '<w:i/>', U: '<w:u w:val="single"/>' };
    const children = Array.from(node.childNodes).map((child) => inline(child, props + (flags[node.tagName] || ''))).join('');
    if (node.tagName === 'A' && /^(https?:|mailto:)/i.test(node.getAttribute('href') || '')) {
      return `<w:hyperlink r:id="${relation('hyperlink', node.getAttribute('href'), true)}">${children}</w:hyperlink>`;
    }
    return children;
  };
  const blocks = (node, depth = 0, listType = null) => {
    if (node.nodeType === 3) return node.textContent.trim() ? paragraph(run(node.textContent)) : '';
    if (node.nodeType !== 1) return '';
    const tag = node.tagName;
    if (tag === 'TABLE') {
      const rows = Array.from(node.querySelectorAll('tr')).filter((row) => row.closest('table') === node);
      const columnCount = Math.max(1, ...rows.map((row) => Array.from(row.children).reduce((sum, cell) => sum + (Number(cell.getAttribute('colspan')) || 1), 0)));
      const grid = `<w:tblGrid>${Array.from({ length: columnCount }, () => `<w:gridCol w:w="${Math.floor(9360 / columnCount)}"/>`).join('')}</w:tblGrid>`;
      return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map((edge) => `<w:${edge} w:val="single" w:sz="4" w:color="999999"/>`).join('')}</w:tblBorders></w:tblPr>${grid}${rows.map((row) => `<w:tr>${Array.from(row.children).filter((cell) => ['TD', 'TH'].includes(cell.tagName)).map((cell) => `<w:tc><w:tcPr>${Number(cell.getAttribute('colspan')) > 1 ? `<w:gridSpan w:val="${Number(cell.getAttribute('colspan'))}"/>` : ''}</w:tcPr>${Array.from(cell.childNodes).map((child) => blocks(child)).join('') || '<w:p/>'}</w:tc>`).join('')}</w:tr>`).join('')}</w:tbl><w:p/>`;
    }
    if (['UL', 'OL'].includes(tag)) return Array.from(node.children).map((child) => blocks(child, depth, tag)).join('');
    if (tag === 'LI') {
      const bullet = node.getAttribute('data-list') === 'bullet' || listType === 'UL';
      const nested = Array.from(node.children).filter((child) => ['UL', 'OL'].includes(child.tagName)).map((child) => blocks(child, depth + 1)).join('');
      const indent = Math.min(8, depth + (Number((node.className || '').match(/ql-indent-(\d+)/)?.[1]) || 0));
      return paragraph(inline(node), `<w:numPr><w:ilvl w:val="${indent}"/><w:numId w:val="${bullet ? 2 : 1}"/></w:numPr>`) + nested;
    }
    if (/^H[1-6]$/.test(tag)) return paragraph(inline(node), `<w:pStyle w:val="Heading${Math.min(3, Number(tag[1]))}"/>`);
    if (tag === 'P' || tag === 'BLOCKQUOTE') {
      const alignment = (node.className || '').match(/ql-align-(center|right|justify)/)?.[1];
      return paragraph(inline(node), alignment ? `<w:jc w:val="${alignment === 'justify' ? 'both' : alignment}"/>` : '');
    }
    if (['BODY', 'DIV', 'SECTION'].includes(tag)) return Array.from(node.childNodes).map((child) => blocks(child, depth, listType)).join('');
    return paragraph(inline(node));
  };
  return {
    text(value, style = '') { body.push(paragraph(run(value), style ? `<w:pStyle w:val="${style}"/>` : '')); },
    html(value) {
      const doc = new DOMParser().parseFromString(sanitizeHtml(String(value || '')), 'text/html');
      body.push(blocks(doc.body));
    },
    async image(url, title) {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Could not load diagram: ${title}`);
      const blob = await response.blob();
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const extension = bytes[0] === 137 && bytes[1] === 80 ? 'png' : bytes[0] === 255 && bytes[1] === 216 ? 'jpg' : null;
      if (!extension) { this.text(`${title}: image format cannot be embedded; see the diagram in the project.`); this.html(`<p><a href="${xml(url)}">Open diagram</a></p>`); return; }
      const objectUrl = URL.createObjectURL(blob);
      let dimensions;
      try {
        dimensions = await new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve({ w: image.naturalWidth, h: image.naturalHeight }); image.onerror = () => reject(new Error(`Could not read diagram: ${title}`)); image.src = objectUrl; });
      } finally { URL.revokeObjectURL(objectUrl); }
      const scale = Math.min(5943600 / dimensions.w, 6858000 / dimensions.h);
      const cx = Math.round(dimensions.w * scale), cy = Math.round(dimensions.h * scale);
      const name = `image${++imageCount}.${extension}`;
      zip.file(`word/media/${name}`, bytes);
      const id = relation('image', `media/${name}`);
      body.push(`<w:p><w:r><w:drawing><wp:inline><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${imageCount}" name="${xml(title)}"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${imageCount}" name="${xml(title)}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${id}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`);
    },
    async blob() {
      zip.file('[Content_Types].xml', `${header}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/><Override PartName="/word/footer.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>`);
      zip.file('_rels/.rels', `${header}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${R}/officeDocument" Target="word/document.xml"/></Relationships>`);
      zip.file('word/_rels/document.xml.rels', `${header}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${relationships.map((r) => `<Relationship Id="${r.id}" Type="${R}/${r.type}" Target="${xml(r.target)}"${r.external ? ' TargetMode="External"' : ''}/>`).join('')}</Relationships>`);
      zip.file('word/styles.xml', `${header}<w:styles xmlns:w="${W}"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="140"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>${['Title', 'Heading1', 'Heading2', 'Heading3'].map((name, i) => `<w:style w:type="paragraph" w:styleId="${name}"><w:name w:val="${name}"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="160"/>${i ? `<w:outlineLvl w:val="${i - 1}"/>` : ''}</w:pPr><w:rPr><w:b/><w:sz w:val="${[36, 30, 26, 24][i]}"/></w:rPr></w:style>`).join('')}</w:styles>`);
      zip.file('word/numbering.xml', `${header}<w:numbering xmlns:w="${W}">${[1, 2].map((id) => `<w:abstractNum w:abstractNumId="${id}"><w:multiLevelType w:val="multilevel"/>${Array.from({ length: 9 }, (_, level) => `<w:lvl w:ilvl="${level}"><w:start w:val="1"/><w:numFmt w:val="${id === 2 ? 'bullet' : 'decimal'}"/><w:lvlText w:val="${id === 2 ? '•' : `%${level + 1}.`}"/><w:pPr><w:ind w:left="${720 * (level + 1)}" w:hanging="360"/></w:pPr></w:lvl>`).join('')}</w:abstractNum>`).join('')}<w:num w:numId="1"><w:abstractNumId w:val="1"/></w:num><w:num w:numId="2"><w:abstractNumId w:val="2"/></w:num></w:numbering>`);
      zip.file('word/footer.xml', `${header}<w:ftr xmlns:w="${W}">${paragraph(run(footerText, '<w:sz w:val="14"/>'))}<w:p>${run('Draft • Page ', '<w:sz w:val="14"/>')}<w:fldSimple w:instr="PAGE"><w:r><w:t>1</w:t></w:r></w:fldSimple></w:p></w:ftr>`);
      zip.file('word/document.xml', `${header}<w:document xmlns:w="${W}" xmlns:r="${R}" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>${body.join('')}<w:sectPr><w:footerReference w:type="default" r:id="rId3"/><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>`);
      return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', compression: 'DEFLATE' });
    },
  };
}