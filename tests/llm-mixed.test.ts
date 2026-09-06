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
})
