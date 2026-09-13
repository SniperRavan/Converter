import { renderToDocx, type DocxRenderOptions } from '../renderers/docx'
import { renderToHtml } from '../renderers/html'
import type { NormalizedDocument } from '../core/types'
import { mml2omml } from 'mathml2omml'
import { convertMathMlToSemanticHtml } from './mathSemantic'

/**
 * Export helpers for Word (.docx/.doc), PDF, HTML, and Markdown
 */

export function exportToDocx(doc: NormalizedDocument, title?: string, options?: DocxRenderOptions) {
  const finalTitle = title || doc.metadata?.title || 'document'
  const bytes = renderToDocx(doc, options)
  const blob = new Blob([bytes as unknown as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${finalTitle.toLowerCase().replace(/[^a-z0-9_-]+/g, '-')}.docx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function exportToWord(htmlBody: string, title?: string, doc?: NormalizedDocument, options?: DocxRenderOptions) {
  const finalTitle = title || doc?.metadata?.title || 'document'
  if (doc) {
    exportToDocx(doc, finalTitle, options)
    return
  }

  // Fallback for direct HTML-based .doc export with OMML and table protection
  let processedHtml = htmlBody
    // Strip table-container div so Word does not collapse table columns
    .replace(/<div class="table-container"[^>]*>\s*([\s\S]*?)\s*<\/div>/gi, '$1')
    .replace(/<table(?![^>]*border=)[^>]*>/gi, '<table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; width: 100%; margin: 12pt 0; border: 1pt solid #cbd5e1; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">')
    .replace(/<th\b(?![^>]*style=)[^>]*>/gi, '<th style="border: 1pt solid #cbd5e1; background-color: #f1f5f9; padding: 6pt 8pt; font-weight: bold;">')
    .replace(/<td\b(?![^>]*style=)[^>]*>/gi, '<td style="border: 1pt solid #cbd5e1; padding: 6pt 8pt;">')

  // Convert MathML equations to OMML for Word HTML compatibility
  processedHtml = processedHtml.replace(/<math[\s\S]*?<\/math>/gi, (match) => {
    try {
      const isDisplay = match.includes('display="block"')
      const omml = mml2omml(match)
      if (isDisplay) {
        return `<p class="MsoNormal" align="center" style="text-align:center;"><m:oMathPara>${omml}</m:oMathPara></p>`
      }
      return omml
    } catch {
      return match
    }
  })

  const docHtml = `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns:m='http://schemas.openxmlformats.org/officeDocument/2006/math' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset='utf-8'>
  <title>${title}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page {
      size: letter portrait;
      margin: 0.75in;
      mso-header-margin: 0.3in;
      mso-footer-margin: 0.3in;
    }
    body {
      font-family: 'Calibri', 'Segoe UI', 'Arial', sans-serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #0f172a;
      margin: 0.75in;
    }
    h1 {
      font-size: 22pt;
      font-weight: bold;
      color: #003884;
      margin-top: 0;
      margin-bottom: 6pt;
      text-align: center;
    }
    h2 {
      font-size: 13pt;
      font-weight: bold;
      color: #003884;
      margin-top: 14pt;
      margin-bottom: 4pt;
      border-bottom: 1.5pt solid #003884;
      padding-bottom: 2pt;
      text-transform: uppercase;
      letter-spacing: 0.5pt;
    }
    h3 {
      font-size: 11.5pt;
      font-weight: bold;
      color: #1e293b;
      margin-top: 8pt;
      margin-bottom: 3pt;
    }
    p { margin: 3pt 0 6pt 0; }
    p[align="center"] { text-align: center; }
    ul, ol {
      margin: 3pt 0 6pt 0;
      padding-left: 20pt;
    }
    li { margin-bottom: 3pt; }
    hr {
      border: none;
      border-top: 1pt solid #cbd5e1;
      margin: 10pt 0;
    }
    .page-break {
      page-break-before: always;
      mso-break-type: section-break;
      clear: both;
      height: 0;
      margin: 0;
    }
    .tikz-figure {
      margin: 12pt auto;
      text-align: center;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 10pt 0;
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    th, td {
      border: 1pt solid #cbd5e1;
      padding: 6pt 8pt;
      text-align: left;
    }
    th {
      background-color: #f1f5f9;
      font-weight: bold;
    }
    code {
      font-family: 'Consolas', 'Courier New', monospace;
      font-size: 9.5pt;
      background-color: #f1f5f9;
      padding: 2pt 4pt;
    }
    pre {
      font-family: 'Consolas', 'Courier New', monospace;
      font-size: 9.5pt;
      background-color: #f8fafc;
      border-left: 2pt solid #cbd5e1;
      padding: 8pt 12pt;
      margin: 8pt 0;
    }
    blockquote {
      border-left: 2.5pt solid #94a3b8;
      padding-left: 10pt;
      margin: 6pt 0;
      color: #475569;
      font-style: italic;
    }
    a {
      color: #2563eb;
      text-decoration: none;
    }
  </style>
</head>
<body>
  ${processedHtml}
</body>
</html>`

  const blob = new Blob(['\ufeff', docHtml], { type: 'application/msword' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${finalTitle.toLowerCase().replace(/[^a-z0-9_-]+/g, '-')}.doc`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Formats HTML into Microsoft Word-compatible clipboard markup.
 * Uses Universal Semantic HTML and Word MSO styling to guarantee fractions, superscripts,
 * subscripts, and tables paste cleanly into Microsoft Word without corruption or flattening.
 */
export function formatForWordClipboard(htmlBody: string): string {
  let processedHtml = htmlBody
    .replace(/<div class="table-container"[^>]*>\s*([\s\S]*?)\s*<\/div>/gi, '$1')
    .replace(/<table(?![^>]*border=)[^>]*>/gi, '<table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; width: 100%; margin: 12pt 0; border: 1pt solid #cbd5e1; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">')
    .replace(/<th\b(?![^>]*style=)[^>]*>/gi, '<th style="border: 1pt solid #cbd5e1; background-color: #f1f5f9; padding: 6pt 8pt; font-weight: bold;">')
    .replace(/<td\b(?![^>]*style=)[^>]*>/gi, '<td style="border: 1pt solid #cbd5e1; padding: 6pt 8pt;">')

  // Convert any raw MathML to Semantic HTML so Word clipboard paste does not flatten it
  processedHtml = processedHtml.replace(/<math[\s\S]*?<\/math>/gi, (match) => {
    return convertMathMlToSemanticHtml(match)
  })

  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
<head>
  <meta charset="utf-8">
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    body {
      font-family: Calibri, 'Segoe UI', Arial, sans-serif;
      font-size: 11pt;
      color: #0f172a;
      line-height: 1.5;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 12pt 0;
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    th {
      border: 1pt solid #cbd5e1;
      background-color: #f1f5f9;
      padding: 6pt 8pt;
      font-weight: bold;
    }
    td {
      border: 1pt solid #cbd5e1;
      padding: 6pt 8pt;
    }
    .math-block {
      text-align: center;
      margin: 12pt 0;
      font-family: 'Cambria Math', 'STIX Two Math', 'Times New Roman', serif;
    }
    .math-inline {
      font-family: 'Cambria Math', 'STIX Two Math', 'Times New Roman', serif;
    }
    .math-frac {
      display: inline-block;
      vertical-align: -0.38em;
      text-align: center;
    }
  </style>
</head>
<body>
<!--StartFragment-->
${processedHtml}
<!--EndFragment-->
</body>
</html>`
}

export function exportToPdf(htmlBody: string, title = 'document', doc?: NormalizedDocument) {
  const content = doc ? renderToHtml(doc, { includeWrapper: false, mathMode: 'katex' }) : htmlBody
  const htmlDoc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
  <style>
    @page {
      size: auto;
      margin: 15mm 20mm;
    }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 32px;
      color: #0f172a;
      line-height: 1.55;
      max-width: 820px;
      margin: 0 auto;
      -webkit-font-smoothing: antialiased;
    }
    h1 { font-size: 1.85rem; text-align: center; color: #003884; margin-bottom: 6px; }
    h2 { font-size: 1.15rem; font-weight: 700; color: #003884; border-bottom: 2px solid #003884; padding-bottom: 3px; margin-top: 18px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
    h3 { font-size: 1.05rem; font-weight: 600; color: #1e293b; margin-top: 8px; margin-bottom: 3px; }
    p { margin: 4px 0; }
    p[align="center"] { text-align: center; }
    ul, ol { margin: 4px 0 8px 0; padding-left: 20px; }
    li { margin-bottom: 3px; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; }
    th { background: #f8fafc; font-weight: 600; }
    code { font-family: 'Consolas', 'Courier New', monospace; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
    pre { background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px; font-family: 'Consolas', monospace; font-size: 0.9em; }
    blockquote { border-left: 4px solid #003884; padding-left: 12px; color: #475569; margin: 12px 0; }
    .math-block { margin: 16px 0; text-align: center; }
    .katex-display { margin: 16px 0; text-align: center; }
    .katex { font-size: 1.08em; text-rendering: auto; }
    math { font-size: 1.05em; }
    .page-break {
      page-break-before: always;
      break-before: page;
      height: 0;
      margin: 0;
      border: none;
    }
    .tikz-figure {
      margin: 16px auto;
      text-align: center;
    }
    @media print {
      body {
        padding: 0;
        max-width: none;
        color: #000;
        background: #fff;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .page-break {
        page-break-before: always !important;
        break-before: page !important;
        height: 0 !important;
        margin: 0 !important;
        border: none !important;
        padding: 0 !important;
      }
      .tikz-figure {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      table, tr, td, th {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .math-block, .katex-display, pre, blockquote, .latex-formula {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      h1, h2, h3, h4, h5, h6 {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }
    }
  </style>
</head>
<body>
  ${content}
  <script>
    const doPrint = () => {
      window.focus();
      window.print();
    };
    window.addEventListener('afterprint', () => {
      try { window.close(); } catch (_) {}
    });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => setTimeout(doPrint, 150)).catch(doPrint);
    } else {
      window.addEventListener('load', () => setTimeout(doPrint, 250));
    }
  </script>
</body>
</html>`

  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(htmlDoc)
    printWindow.document.close()
    return
  }

  // BUG-09 Fallback: if browser blocks window.open popup, print via hidden iframe
  try {
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    iframe.style.visibility = 'hidden'
    document.body.appendChild(iframe)

    const iframeDoc = iframe.contentWindow?.document
    if (iframeDoc) {
      iframeDoc.write(htmlDoc)
      iframeDoc.close()
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus()
          iframe.contentWindow?.print()
        } finally {
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe)
            }
          }, 2000)
        }
      }, 500)
      return
    }
  } catch (err) {
    console.error('PDF print fallback failed:', err)
  }

  if (typeof window !== 'undefined') {
    alert('Popup blocked. Please allow popups or use your browser\'s Print dialog to export as PDF.')
  }
}

export function exportToFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
