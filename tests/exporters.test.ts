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
    const bytes = renderToDocx(doc)

    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.byteLength).toBeGreaterThan(500)

    // Unzip and inspect document.xml
    const unzipped = unzipSync(bytes)
    expect(unzipped['word/document.xml']).toBeDefined()
    expect(unzipped['[Content_Types].xml']).toBeDefined()
    expect(unzipped['_rels/.rels']).toBeDefined()

    const docXml = strFromU8(unzipped['word/document.xml'])
    expect(docXml).toContain('Machine Learning Fundamentals')
    // Contains OMML Office Math
    expect(docXml).toContain('<m:oMath')
    expect(docXml).toContain('J(θ)=')
    // Contains native Word table
    expect(docXml).toContain('<w:tbl>')
    expect(docXml).toContain('Transformer-Base')
    expect(docXml).toContain('<w:tblHeader/>')
  })
})
