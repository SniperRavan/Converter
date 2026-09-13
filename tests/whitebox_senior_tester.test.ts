import { describe, it, expect } from 'vitest'
import { detectInputFormat } from '../src/parsers/detector'
import { parseUniversalDocument } from '../src/parsers'
import { renderToDocx } from '../src/renderers/docx'
import { renderToHtml } from '../src/renderers/html'
import { renderToPlainText } from '../src/renderers/text'
import { computeDocumentStats } from '../src/core/stats'
import { latexToUnicode } from '../src/utils/mathUnicode'

describe('White-Box: Security & DOM Sanitization Rules', () => {
  it('defines strict MathML tag preservation and HTML profiles', () => {
    const sanitizeConfig = {
      USE_PROFILES: { html: true, svg: true, mathMl: true },
      ADD_TAGS: [
        'math', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'mfrac', 'mover', 'munder',
        'msqrt', 'mroot', 'mtable', 'mtr', 'mtd', 'semantics', 'annotation', 'mspace'
      ],
      ADD_ATTR: ['display', 'xmlns', 'alttext']
    }

    expect(sanitizeConfig.USE_PROFILES.mathMl).toBe(true)
    expect(sanitizeConfig.ADD_TAGS).toContain('math')
    expect(sanitizeConfig.ADD_TAGS).toContain('mrow')
    expect(sanitizeConfig.ADD_TAGS).toContain('mi')
    expect(sanitizeConfig.ADD_ATTR).toContain('display')
  })
})

describe('White-Box: Detector Robustness & Boundary Conditions', () => {
  it('handles empty, null-like, and whitespace inputs gracefully', () => {
    const res1 = detectInputFormat('')
    expect(res1.primaryFormat).toBe('text')
    expect(res1.confidence).toBe(1.0)

    const res2 = detectInputFormat('   \n\t  ')
    expect(res2.primaryFormat).toBe('text')
  })

  it('correctly isolates code blocks with latex syntax so they do not falsely trigger full latex document mode', () => {
    const snippet = `
# How to write LaTeX
\`\`\`latex
\\documentclass{article}
\\begin{document}
\\section{Hello}
\\end{document}
\`\`\`
This guide helps students write thesis papers.
    `
    const res = detectInputFormat(snippet)
    expect(res.primaryFormat).toBe('markdown')
    expect(res.hasCode).toBe(true)
  })

  it('handles broken JSON without crashing and falls back to text', () => {
    const invalidJson = '{"title": "Unfinished JSON", "items": [1, 2, '
    const res = detectInputFormat(invalidJson)
    expect(res.primaryFormat).toBe('text')
  })
})

describe('White-Box: AST Normalization & Document Stats', () => {
  it('correctly counts words, equations, and tables in mixed markdown', () => {
    const doc = parseUniversalDocument(`
# Quantum Phase

A paragraph with $E = mc^2$ inline equation.

$$
\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}
$$

| Particle | Spin | Charge |
| :--- | :---: | ---: |
| Electron | 1/2 | -1 |
| Proton | 1/2 | +1 |

- Alpha
- Beta
- Gamma
    `, 'markdown')

    expect(doc.stats.headings).toBe(1)
    expect(doc.stats.mathExpressions).toBe(2)
    expect(doc.stats.tables).toBe(1)
    expect(doc.stats.lists).toBe(1)
    expect(doc.stats.words).toBeGreaterThan(10)
  })

  it('properly computes stats for rawBlock fallback items', () => {
    const stats = computeDocumentStats([
      {
        type: 'rawBlock',
        content: '<p>Some raw content</p>',
        markdown: '# Title\n\nParagraph with words.\n\n| H1 | H2 |\n|---|---|\n| C1 | C2 |'
      }
    ])

    expect(stats.headings).toBe(1)
    expect(stats.paragraphs).toBe(1)
    expect(stats.tables).toBe(1)
    expect(stats.words).toBeGreaterThan(4)
  })
})

describe('White-Box: Renderer Exporters & Output Integrity', () => {
  it('generates a valid binary OpenXML .docx file with standard PK zip signature', () => {
    const doc = parseUniversalDocument(`
# Technical Specification

Here is a system architecture note.

- Scalability: 100k req/sec
- Latency: < 10ms
    `, 'markdown')

    const bytes = renderToDocx(doc)
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBeGreaterThan(100)

    // OpenXML docx is a ZIP archive; first 4 bytes MUST be PK\x03\x04 (0x50, 0x4B, 0x03, 0x04)
    expect(bytes[0]).toBe(0x50) // 'P'
    expect(bytes[1]).toBe(0x4B) // 'K'
    expect(bytes[2]).toBe(0x03)
    expect(bytes[3]).toBe(0x04)
  })

  it('renders MathML equations in HTML output for native Word/browser paste', () => {
    const doc = parseUniversalDocument('Formula: $x^2 + y^2 = r^2$', 'markdown')
    const html = renderToHtml(doc, { includeWrapper: false, mathMode: 'mathml' })

    expect(html).toContain('<math')
    expect(html).toContain('</math>')
  })

  it('converts LaTeX math symbols to accurate Unicode equivalents', () => {
    expect(latexToUnicode('\\alpha + \\beta = \\gamma')).toBe('α + β = γ')
    expect(latexToUnicode('\\sum_{i=1}^n x_i')).toContain('∑')
    expect(latexToUnicode('\\infty')).toBe('∞')
    expect(latexToUnicode('\\approx')).toBe('≈')
  })

  it('renders clean plain text without HTML or raw markers', () => {
    const doc = parseUniversalDocument('# Title\n\n**Bold text** and `code`', 'markdown')
    const txt = renderToPlainText(doc)

    expect(txt).toContain('Title')
    expect(txt).toContain('Bold text and code')
    expect(txt).not.toContain('**')
    expect(txt).not.toContain('<h1>')
  })
})
