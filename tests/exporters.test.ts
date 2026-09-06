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
})
