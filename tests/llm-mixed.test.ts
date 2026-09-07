import { describe, it, expect } from 'vitest'
import { parseLlmMixed } from '../src/parsers/llm-mixed'
import { renderToMarkdown } from '../src/renderers/markdown'

describe('LLM Mixed Stream Parser', () => {
  it('heals unclosed code fences automatically', () => {
    const broken = 'Here is code:\n```typescript\nconst x = 42;\nconsole.log(x);'
    const doc = parseLlmMixed(broken)
    const codeBlock = doc.children.find((b) => b.type === 'codeBlock')
    expect(codeBlock).toBeDefined()
    if (codeBlock && codeBlock.type === 'codeBlock') {
      expect(codeBlock.language).toBe('typescript')
      expect(codeBlock.value).toContain('const x = 42;')
    }
  })

  it('normalizes bracketed LaTeX math delimiters to standard KaTeX blocks', () => {
    const raw = 'The equation is:\n\\[ a^2 + b^2 = c^2 \\]\nand inline \\( x \\in \\mathbb{R} \\).'
    const doc = parseLlmMixed(raw)
    const md = renderToMarkdown(doc)
    expect(md).toContain('a^2 + b^2 = c^2')
  })

  it('converts ASCII box tables to semantic tables', () => {
    const raw = `
+-------+--------+
| Item  | Status |
+-------+--------+
| Alpha | Done   |
| Beta  | Active |
+-------+--------+
`
    const doc = parseLlmMixed(raw)
    const table = doc.children.find((b) => b.type === 'table')
    expect(table).toBeDefined()
    if (table && table.type === 'table') {
      expect(table.rows.length).toBeGreaterThanOrEqual(2)
    }
  })

  it('converts isolated single-dollar lines to display math blocks', () => {
    const raw = 'The equation is:\n$\n\\frac{a}{b} = c\n$\nAnd done.'
    const doc = parseLlmMixed(raw)
    const mathBlock = doc.children.find((b) => b.type === 'mathBlock')
    expect(mathBlock).toBeDefined()
    if (mathBlock && mathBlock.type === 'mathBlock') {
      expect(mathBlock.value).toContain('\\frac{a}{b} = c')
    }
  })

  it('trims inner whitespace from inline math delimiters', () => {
    const raw = 'Calculate $  x^2 + y^2 = r^2  $ in polar coordinates.'
    const doc = parseLlmMixed(raw)
    const md = renderToMarkdown(doc)
    expect(md).toContain('$x^2 + y^2 = r^2$')
  })

  it('separates adjacent text from headings and tables', () => {
    const raw = 'Some paragraph text.\n### Subheading\nAttached text.\n| A | B |\n|---|---|\n| 1 | 2 |'
    const doc = parseLlmMixed(raw)
    const heading = doc.children.find((b) => b.type === 'heading')
    const table = doc.children.find((b) => b.type === 'table')
    expect(heading).toBeDefined()
    expect(table).toBeDefined()
  })
})
