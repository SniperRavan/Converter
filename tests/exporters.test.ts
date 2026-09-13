import { describe, it, expect } from 'vitest'
import { parseMarkdown } from '../src/parsers/markdown'
import { renderToMarkdown } from '../src/renderers/markdown'
import { renderToHtml } from '../src/renderers/html'
import { renderToLatex } from '../src/renderers/latex'
import { renderToPlainText } from '../src/renderers/text'

describe('AST Exporters & Roundtrip Compilation', () => {
  it('renders markdown with headers, lists, code, and blockquotes', () => {
    const source = `# Title

> Quotation text

* Bullet 1
* Bullet 2

\`\`\`typescript
const greeting = "Hello World";
\`\`\`
`
    const doc = parseMarkdown(source)
    const md = renderToMarkdown(doc)
    expect(md).toContain('# Title')
    expect(md).toContain('> Quotation text')
    expect(md).toContain('- Bullet 1')
    expect(md).toContain('```typescript')
  })

  it('compiles AST to clean HTML with safe markup', () => {
    const source = '# Header\n\nParagraph with **bold** and *italic*.'
    const doc = parseMarkdown(source)
    const html = renderToHtml(doc, { includeWrapper: false })
    expect(html).toContain('<h1>Header</h1>')
    expect(html).toContain('<strong>bold</strong>')
    expect(html).toContain('<em>italic</em>')
  })

  it('compiles AST to LaTeX document structure', () => {
    const source = '# Introduction\n\nSome important facts.'
    const doc = parseMarkdown(source)
    const latex = renderToLatex(doc)
    expect(latex).toContain('\\section{Introduction}')
    expect(latex).toContain('Some important facts.')
  })

  it('compiles AST to plain text with unicode math', () => {
    const source = '# Heading\n\nFormula: $x^2 + y^2 = r^2$'
    const doc = parseMarkdown(source)
    const text = renderToPlainText(doc, { mathMode: 'unicode' })
    expect(text).toContain('Heading')
    expect(text).toContain('=======')
    expect(text).toContain('x² + y² = r²')
  })

  it('renders clean tables without overflow container for Word compatibility', () => {
    const source = '| Col A | Col B |\n|---|---|\n| Val 1 | Val 2 |'
    const doc = parseMarkdown(source)
    const html = renderToHtml(doc, { includeWrapper: false, cleanTables: true })
    expect(html).not.toContain('class="table-container"')
    expect(html).toContain('<table border="1"')
    expect(html).toContain('mso-table-lspace')
  })

  it('compiles AST with math and tables to valid Office OpenXML (.docx) bytes', async () => {
    const { renderToDocx } = await import('../src/renderers/docx')
    const { unzipSync, strFromU8 } = await import('fflate')

    const source = `# Machine Learning Fundamentals

The linear regression cost function is:
$$J(\\theta) = \\frac{1}{2m} \\sum_{i=1}^m (h_\\theta(x^{(i)}) - y^{(i)})^2$$

Equivalence: $E=mc^2$

| Model Architecture | Parameters | Accuracy (%) |
|---|---|---|
| Transformer-Base | 110M | 94.2 |
`
    const doc = parseMarkdown(source)
    const bytes = renderToDocx(doc, { mathMode: 'omml' })

    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.byteLength).toBeGreaterThan(500)

    // Unzip and inspect document.xml
    const unzipped = unzipSync(bytes)
    expect(unzipped['word/document.xml']).toBeDefined()
    expect(unzipped['[Content_Types].xml']).toBeDefined()
    expect(unzipped['_rels/.rels']).toBeDefined()

    const docXml = strFromU8(unzipped['word/document.xml'])
    expect(docXml).toContain('Machine Learning Fundamentals')
    // Heading styling must be applied to text runs
    expect(docXml).toMatch(/<w:rPr><w:b\/><w:color w:val="003884"\/><w:sz w:val="36"\/><\/w:rPr><w:t xml:space="preserve">Machine Learning Fundamentals<\/w:t>/)
    // Contains native OMML Office Math directly inside paragraph (native Word & Google Docs standard)
    expect(docXml).not.toContain('<mc:AlternateContent>')
    expect(docXml).toContain('<m:oMath')
    expect(docXml).toContain('J(θ)=')
    // Inline math must also be native OMML
    expect(docXml).toContain('E=m')
    // Contains native Word table with explicit grid and cell widths
    expect(docXml).toContain('<w:tbl>')
    expect(docXml).toContain('<w:tblGrid>')
    expect(docXml).toContain('<w:gridCol')
    expect(docXml).toContain('<w:tcW')
    expect(docXml).toContain('Transformer-Base')
    expect(docXml).toContain('<w:tblHeader/>')
  })

  it('correctly extracts title from markdown and promotes it cleanly in LaTeX preamble', () => {
    const md = `# Quantum Computing Architecture

An overview of quantum algorithms.

## 1. Hamiltonian Simulation

Details here.`
    const doc = parseMarkdown(md)
    expect(doc.metadata.title).toBe('Quantum Computing Architecture')

    const latex = renderToLatex(doc, { includePreamble: true })
    expect(latex).toContain('\\title{Quantum Computing Architecture}')
    expect(latex).not.toContain('Converted Document')
    expect(latex).not.toContain('author{Convertion}')
    expect(latex).toContain('\\maketitle')
    // Must NOT duplicate the title as \section
    expect(latex).not.toContain('\\section{Quantum Computing Architecture}')
    // Subsections promoted to sections
    expect(latex).toContain('\\section{1. Hamiltonian Simulation}')
  })

  it('normalizes math spacing when touching alphanumeric words', () => {
    const raw = 'Interoperability: Markdown $\\rightarrow$AST$\\rightarrow$ Multiple formats. Transition: final$|\\psi\\rangle$ and $\\hat{H}$governs state.'
    const doc = parseMarkdown(raw)
    const md = renderToMarkdown(doc)
    expect(md).toContain('$\\rightarrow$ AST $\\rightarrow$')
    expect(md).toContain('final $|\\psi\\rangle$')
    expect(md).toContain('$\\hat{H}$ governs')
  })

  it('ensures docx math export has zero bare text and zero undefined styles in OMML', async () => {
    const { renderToDocx } = await import('../src/renderers/docx')
    const { unzipSync, strFromU8 } = await import('fflate')

    const md = `$$F(k) = \\sum_{n=0}^{N-1} f(n) e^{-i 2\\pi k n / N}$$`
    const doc = parseMarkdown(md)
    const bytes = renderToDocx(doc, { mathMode: 'omml' })
    const unzipped = unzipSync(bytes)
    const docXml = strFromU8(unzipped['word/document.xml'])

    expect(docXml).not.toContain('m:val="undefined"')
    // Bare text check: (n) must be wrapped in <m:r><m:t>
    expect(docXml).toContain('<m:r><m:t xml:space="preserve">(n)</m:t></m:r>')
    expect(docXml).toContain('<m:oMath')
  })

  it('renders HTML with mathMode katex containing KaTeX HTML classes', () => {
    const md = `Inline $x^2 + y^2 = z^2$ and block:\n\n$$E = mc^2$$`
    const doc = parseMarkdown(md)
    const html = renderToHtml(doc, { includeWrapper: false, mathMode: 'katex' })
    expect(html).toContain('class="katex"')
    expect(html).toContain('class="katex-html"')
  })

  it('renders docx with native OMML equations compatible with Microsoft Word and Google Docs', async () => {
    const { renderToDocx } = await import('../src/renderers/docx')
    const { SAMPLE_DOCUMENT } = await import('../src/store/useConverterStore')
    const doc = parseMarkdown(SAMPLE_DOCUMENT)
    const bytes = renderToDocx(doc, { mathMode: 'omml' })
    const { unzipSync, strFromU8 } = await import('fflate')
    const unzipped = unzipSync(bytes)
    const docXml = strFromU8(unzipped['word/document.xml'])

    // Native OMML Office Math is emitted directly without mc:AlternateContent (which Word discards)
    expect(docXml).not.toContain('<mc:AlternateContent>')
    expect(docXml).not.toContain('mc:Ignorable="m"')
    expect(docXml).toContain('<m:oMathPara>')
    expect(docXml).toContain('<m:oMathParaPr>')
    expect(docXml).toContain('<m:jc m:val="center"/>')
    expect(docXml).toContain('<m:oMath')
    expect(docXml).toContain('J(θ)=')
    // Inline math must also be native OMML
    expect(docXml).toContain('E=m')
    expect(docXml).toContain('→')
  })

  it('verifies LibreOffice successfully converts generated docx to pdf without errors', async () => {
    const { execSync } = await import('child_process')
    const fs = await import('fs')

    // Skip if LibreOffice or pdftotext is not installed (e.g., in CI runners)
    try {
      execSync('which libreoffice && which pdftotext', { stdio: 'ignore' })
    } catch {
      return
    }

    const { renderToDocx } = await import('../src/renderers/docx')
    const { SAMPLE_DOCUMENT } = await import('../src/store/useConverterStore')

    const doc = parseMarkdown(SAMPLE_DOCUMENT)
    const bytes = renderToDocx(doc)
    const tmpDocx = '/tmp/test_verify_libreoffice.docx'
    const tmpPdf = '/tmp/test_verify_libreoffice.pdf'

    const path = await import('path')
    const sampleDocxPath = path.resolve(__dirname, '../.local/example/samples/machine-learning-fundamentals.docx')
    if (fs.existsSync(sampleDocxPath)) {
      fs.writeFileSync(sampleDocxPath, bytes)
    }

    fs.writeFileSync(tmpDocx, bytes)
    try {
      execSync(`libreoffice --headless --convert-to pdf --outdir /tmp ${tmpDocx}`, { stdio: 'pipe' })
      expect(fs.existsSync(tmpPdf)).toBe(true)
      const text = execSync(`pdftotext ${tmpPdf} -`, { stdio: 'pipe' }).toString()

      // The headings, body, table content, and text must be intact
      expect(text).toContain('Machine Learning Fundamentals')
      expect(text).toContain('Transformer-Base')
      expect(text).toContain('Privacy-First')
    } finally {
      if (fs.existsSync(tmpDocx)) fs.unlinkSync(tmpDocx)
      if (fs.existsSync(tmpPdf)) fs.unlinkSync(tmpPdf)
    }
  })

  it('formats HTML for Word clipboard without corrupting thead and without extra empty table row', async () => {
    const { formatForWordClipboard } = await import('../src/utils/exporters')
    const rawHtml = `<table border="1"><thead><tr><th>Header 1</th><th>Header 2</th></tr></thead><tbody><tr><td>Val 1</td><td>Val 2</td></tr></tbody></table>`
    const clipboard = formatForWordClipboard(rawHtml)

    // Must NOT have a corrupted stray <th before <tr>
    expect(clipboard).not.toContain('<th style="border: 1pt solid #cbd5e1; background-color: #f1f5f9; padding: 6pt 8pt; font-weight: bold;"><tr>')
    expect(clipboard).toContain('<thead><tr>')
    expect(clipboard).toContain('<th')
  })
})


