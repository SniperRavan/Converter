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

  it('dedents terminal transcript copies so 4-space indented lines become real headings and lists instead of code blocks', () => {
    const transcript = `
    #### 1. Auto-Detect Routing Priority Fix

    • File: index.ts:32-52
    • What was there before:
`
    const doc = parseLlmMixed(transcript)
    const heading = doc.children.find((b) => b.type === 'heading')
    const list = doc.children.find((b) => b.type === 'list')
    const codeBlock = doc.children.find((b) => b.type === 'codeBlock')

    expect(heading).toBeDefined()
    expect(list).toBeDefined()
    // Must NOT be treated as an indented code block
    expect(codeBlock).toBeUndefined()
  })

  it('preserves genuine 4-space indented code blocks when document body has zero indent', () => {
    const normalDoc = `Here is normal text:

    const code = 123
    console.log(code)
`
    const doc = parseLlmMixed(normalDoc)
    const codeBlock = doc.children.find((b) => b.type === 'codeBlock')
    expect(codeBlock).toBeDefined()
  })

  it('separates standalone title words from subsequent paragraphs without welding them', () => {
    const raw = `Resources
If you've ever asked ChatGPT, Claude, or DeepSeek to convert a document to Word, you already know the pain.`
    const doc = parseLlmMixed(raw)
    expect(doc.children.length).toBe(2)
    expect(doc.children[0].type).toBe('paragraph')
    expect(doc.children[1].type).toBe('paragraph')

    // First paragraph should only contain "Resources", not welded together
    const p1 = doc.children[0] as any
    expect(p1.children[0].value).toBe('Resources')
  })

  it('does not split normal soft-wrapped paragraph sentences', () => {
    const raw = `This is a paragraph that was written in vim or emacs
and wrapped onto the second line naturally.`
    const doc = parseLlmMixed(raw)
    // Should remain a single paragraph with joined text
    expect(doc.children.length).toBe(1)
    expect(doc.children[0].type).toBe('paragraph')
  })

  it('does not split soft-wrapped sentences that end in verbs or continue with lowercase words', () => {
    const raw = `Note that this differs
from the previous version in several ways.`
    const doc = parseLlmMixed(raw)
    expect(doc.children.length).toBe(1)
    expect(doc.children[0].type).toBe('paragraph')
  })

  it('preserves code block relative alignment when an interior line has column-0 content', () => {
    const transcript = `
    Here is a script:
    \`\`\`bash
    cat <<EOF
EOF
    \`\`\`
`
    const doc = parseLlmMixed(transcript)
    const code = doc.children.find((b) => b.type === 'codeBlock') as any
    expect(code).toBeDefined()
    // The relative indent between cat <<EOF (indented) and EOF (at column 0) must be preserved
    expect(code.value).toContain('EOF')
  })

  it('dedents lines with mixed leading spaces and tabs', () => {
    const mixed = " \t#### Heading With Mixed Indent\n \t• First item"
    const doc = parseLlmMixed(mixed)
    const heading = doc.children.find((b) => b.type === 'heading')
    const list = doc.children.find((b) => b.type === 'list')
    expect(heading).toBeDefined()
    expect(list).toBeDefined()
  })

  it('dedents per paragraph block so a column-0 line does not disable dedent for indented blocks', () => {
    const mixed = `    #### Indented Heading

Zero indent line here.

    #### Another Indented Heading

    Paragraph two is indented too.`
    const doc = parseLlmMixed(mixed)
    const headings = doc.children.filter((b) => b.type === 'heading')
    const codeBlocks = doc.children.filter((b) => b.type === 'codeBlock')

    // Both indented headings should be recognized as headings, not code blocks
    expect(headings.length).toBe(2)
    expect(codeBlocks.length).toBe(0)
  })

  it('preserves tabs inside code blocks without expanding them to spaces', () => {
    const text = "```go\nfunc main() {\n\tprintln()\n}\n```"
    const doc = parseLlmMixed(text)
    const code = doc.children.find((b) => b.type === 'codeBlock') as any
    expect(code).toBeDefined()
    expect(code.value).toContain('\tprintln()')
  })

  it('preserves loose nested lists without flattening them to top-level', () => {
    const loose = `1. Step

   - sub a
   - sub b`
    const doc = parseLlmMixed(loose)
    const list = doc.children.find((b) => b.type === 'list') as any
    expect(list).toBeDefined()
    expect(list.ordered).toBe(true)
    expect(list.items.length).toBe(1)
    const nested = list.items[0].children.find((c: any) => c.type === 'list')
    expect(nested).toBeDefined()
  })

  it('does not corrupt LaTeX delimiters, HTML tags, or directory trees inside fenced code', () => {
    const text = `\`\`\`bash
dir/
├── index.ts
│   └── app.ts
<div><b>test</b></div>
\\[ x = 1 \\]
2024: Released
\`\`\``
    const doc = parseLlmMixed(text)
    const code = doc.children.find((b) => b.type === 'codeBlock') as any
    expect(code).toBeDefined()
    expect(code.value).toContain('├── index.ts')
    expect(code.value).toContain('│   └── app.ts')
    expect(code.value).toContain('<div><b>test</b></div>')
    expect(code.value).toContain('\\[ x = 1 \\]')
    expect(code.value).toContain('2024: Released')
  })

  it('renders nested mathBlock and codeBlock inside list items to HTML and Markdown', async () => {
    const { renderToHtml } = await import('../src/renderers/html')
    const { renderToMarkdown } = await import('../src/renderers/markdown')
    const { renderToPlainText } = await import('../src/renderers/text')

    const md = `1. Differentiate:

   $$
   f'(x) = 2x
   $$`
    const doc = parseLlmMixed(md)
    const html = renderToHtml(doc)
    expect(html).toContain('math-block')

    const plain = renderToPlainText(doc)
    expect(plain).toContain("f'(x) = 2x")

    const roundtrip = renderToMarkdown(doc)
    expect(roundtrip).toContain('$$')
  })

  it('preserves a single list item with multiple continuation blocks without dedenting them to top-level', () => {
    const md = `1. Step one

   Continuation paragraph one.

   Continuation paragraph two.

   Continuation paragraph three.`
    const doc = parseLlmMixed(md)
    expect(doc.children.length).toBe(1)
    const list = doc.children[0] as any
    expect(list.type).toBe('list')
    expect(list.items.length).toBe(1)
    // All three continuation paragraphs should remain nested inside the list item
    expect(list.items[0].children.length).toBe(4)
  })

  it('handles 4-backtick outer fences enclosing 3-backtick inner fences without premature closure', () => {
    const raw = `\`\`\`\`markdown
Here is an example:
\`\`\`js
const a = 1
\`\`\`
All done.
\`\`\`\``
    const doc = parseLlmMixed(raw)
    const code = doc.children.find((b) => b.type === 'codeBlock') as any
    expect(code).toBeDefined()
    expect(code.value).toContain('```js')
    expect(code.value).toContain('const a = 1')
    expect(code.value).toContain('All done.')
  })
})
