/**
 * Export helpers for Word (.docx/.doc), PDF, HTML, and Markdown
 */

export function exportToWord(htmlBody: string, title = 'document') {
  const docHtml = `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
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
    body {
      font-family: 'Calibri', 'Arial', sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #0f172a;
      margin: 1in;
    }
    h1 { font-size: 22pt; font-weight: bold; color: #1e293b; margin-top: 18pt; margin-bottom: 6pt; }
    h2 { font-size: 16pt; font-weight: bold; color: #334155; margin-top: 14pt; margin-bottom: 4pt; }
    h3 { font-size: 13pt; font-weight: bold; color: #475569; margin-top: 10pt; margin-bottom: 3pt; }
    p { margin: 6pt 0; }
    table {
      border-collapse: collapse;
      width: 100%;
      margin: 12pt 0;
    }
    th, td {
      border: 1pt solid #cbd5e1;
      padding: 6pt 8pt;
      text-align: left;
    }
    th {
      background-color: #f8fafc;
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
      border: 1pt solid #e2e8f0;
      padding: 8pt;
      margin: 10pt 0;
    }
    blockquote {
      border-left: 3pt solid #3b82f6;
      padding-left: 10pt;
      margin: 8pt 0;
      color: #475569;
      font-style: italic;
    }
  </style>
</head>
<body>
  ${htmlBody}
</body>
</html>`

  const blob = new Blob(['\ufeff', docHtml], { type: 'application/msword' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.doc`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function exportToPdf(htmlBody: string, title = 'document') {
  const printWindow = window.open('', '_blank')
  if (!printWindow) return

  printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 40px;
      color: #0f172a;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
    }
    h1 { font-size: 2rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
    h2 { font-size: 1.5rem; margin-top: 24px; }
    h3 { font-size: 1.25rem; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
    th { background: #f8fafc; }
    code { font-family: monospace; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; }
    pre { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; }
    blockquote { border-left: 4px solid #3b82f6; padding-left: 14px; color: #475569; margin: 16px 0; }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  ${htmlBody}
  <script>
    window.onload = () => {
      window.print();
      setTimeout(() => window.close(), 1000);
    };
  </script>
</body>
</html>`)
  printWindow.document.close()
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
