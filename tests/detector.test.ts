import { describe, it, expect } from 'vitest'
import { detectInputFormat } from '../src/parsers/detector'

describe('Input Format Detector', () => {
  it('detects LaTeX documents from preambles and environments', () => {
    const res = detectInputFormat('\\documentclass{article}\n\\begin{document}\nHello\n\\end{document}')
    expect(res.primaryFormat).toBe('latex')
  })

  it('detects Markdown documents with tables and math', () => {
    const md = '# Header\n\n| Name | Value |\n| --- | --- |\n| Test | 123 |\n\nFormula: $E = mc^2$'
    const res = detectInputFormat(md)
    expect(res.primaryFormat).toBe('markdown')
    expect(res.hasTables).toBe(true)
    expect(res.hasMath).toBe(true)
  })

  it('detects JSON AST structure', () => {
    const json = JSON.stringify({ type: 'document', children: [] })
    const res = detectInputFormat(json)
    expect(res.primaryFormat).toBe('json')
  })

  it('detects HTML documents', () => {
    const html = '<article><h1>Title</h1><p>Body paragraph</p></article>'
    const res = detectInputFormat(html)
    expect(res.primaryFormat).toBe('html')
  })

  it('classifies markdown discussing LaTeX commands as markdown, not latex', () => {
    const text = `
# Release Notes
• Added support for \\date{September 7, 2026} and \\begin{abstract}.
> npm test passed
### 3. Verification
Shallow projects claim 100% of compilation...
`
    const res = detectInputFormat(text)
    expect(res.primaryFormat).toBe('markdown')
  })

  it('routes clean markdown with tables and math to markdown parser, not llm-mixed', async () => {
    const { parseUniversalDocument } = await import('../src/parsers')
    const md = '# Header\n\n| Feature | Status |\n| --- | --- |\n| Math | Enabled |\n\nFormula: $J(\\theta) = \\frac{1}{2m}$'
    const doc = parseUniversalDocument(md, 'auto')
    expect(doc.metadata.sourceFormat).toBe('markdown')
  })

  it('detects indented headings and blockquotes as markdown, not plain text', () => {
    const indented = '    ## Indented Heading\n\n    Some paragraph text.\n\n    > A blockquote too.'
    const res = detectInputFormat(indented)
    expect(res.primaryFormat).toBe('markdown')
  })

  it('routes bold-plus-bullet-plus-math text to markdown parser in auto mode, not latex', async () => {
    const { parseUniversalDocument } = await import('../src/parsers')
    const content = '**Step 1:** Calculate the value of $x + y = z$.\n• Note down the result.'
    const doc = parseUniversalDocument(content, 'auto')
    expect(doc.metadata.sourceFormat).toBe('markdown')
  })

  it('does not misroute markdown containing LaTeX text commands in inline code to latex parser', async () => {
    const { parseUniversalDocument } = await import('../src/parsers')
    const content = 'Use `\\textbf{x}` for bold text in LaTeX.'
    const doc = parseUniversalDocument(content, 'auto')
    expect(doc.metadata.sourceFormat).toBe('markdown')
  })
})
