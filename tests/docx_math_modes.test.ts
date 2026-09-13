import { describe, it, expect } from 'vitest'
import { parseMarkdown } from '../src/parsers/markdown'
import { renderToDocx } from '../src/renderers/docx'
import { unzipSync, strFromU8 } from 'fflate'

describe('DOCX Math Rendering Modes (Word Web & LibreOffice Compatibility)', () => {
  const sampleMathMarkdown = `
# Math Test

Inline formula: $E = mc^2$ and $A \\rightarrow B$.

$$\\text{MSE} = \\frac{1}{n} \\sum_{i=1}^n (y_i - \\hat{y}_i)^2$$
  `

  it('defaults to universal compatible mode when no options are provided', () => {
    const doc = parseMarkdown(sampleMathMarkdown)
    const bytes = renderToDocx(doc)
    const unzipped = unzipSync(new Uint8Array(bytes))
    const docXml = strFromU8(unzipped['word/document.xml'])

    // Default must be universal runs so Word Web and LibreOffice work out-of-the-box
    expect(docXml).not.toContain('<m:oMath')
    expect(docXml).toContain('<w:vertAlign w:val="superscript"/>')
    expect(docXml).toContain('→')
  })

  it('renders native OMML when desktop mode is explicitly requested', () => {
    const doc = parseMarkdown(sampleMathMarkdown)
    const bytes = renderToDocx(doc, { mathMode: 'omml' })
    const unzipped = unzipSync(new Uint8Array(bytes))
    const docXml = strFromU8(unzipped['word/document.xml'])

    expect(docXml).toContain('<m:oMath')
    expect(docXml).toContain('<m:oMathPara>')
    expect(docXml).toContain('E=m')
    expect(docXml).toContain('→')
  })

  it('renders universal styled OpenXML runs in compatible / web mode for Word Online and LibreOffice', () => {
    const doc = parseMarkdown(sampleMathMarkdown)
    const bytes = renderToDocx(doc, { mathMode: 'compatible' })
    const unzipped = unzipSync(new Uint8Array(bytes))
    const docXml = strFromU8(unzipped['word/document.xml'])

    // Must NOT contain m:oMath so Word for the Web does not replace with [Equation] placeholders
    expect(docXml).not.toContain('<m:oMath')
    expect(docXml).not.toContain('<m:oMathPara>')

    // Must contain formatted superscript runs
    expect(docXml).toContain('<w:vertAlign w:val="superscript"/>')
    expect(docXml).toContain('c</w:t></w:r><w:r><w:rPr>')
    expect(docXml).toContain('<w:t xml:space="preserve">2</w:t></w:r>')

    // Must contain arrow and math symbols
    expect(docXml).toContain('→')
    expect(docXml).toContain('∑')
    expect(docXml).toContain('MSE')
  })

  it('correctly handles combining accents and matrices in compatible mode', () => {
    const markdown = 'Formula with accents $\\hat{y}$ and $\\vec{v}$ and matrix $\\begin{matrix} 1 & 2 \\\\ 3 & 4 \\end{matrix}$'
    const doc = parseMarkdown(markdown)
    const bytes = renderToDocx(doc, { mathMode: 'compatible' })
    const unzipped = unzipSync(new Uint8Array(bytes))
    const docXml = strFromU8(unzipped['word/document.xml'])

    // Combining circumflex \u0302 for hat
    expect(docXml).toContain('y\u0302')
    // Combining arrow \u20D7 for vec
    expect(docXml).toContain('v\u20D7')
    // Matrix formatted with bracket and separators
    expect(docXml).toContain('[')
    expect(docXml).toContain(']')
  })

  it('includes fontTable with Linux/Word fallback mappings in the docx package', () => {
    const doc = parseMarkdown(sampleMathMarkdown)
    const bytes = renderToDocx(doc)
    const unzipped = unzipSync(new Uint8Array(bytes))

    expect(unzipped['word/fontTable.xml']).toBeDefined()
    const fontXml = strFromU8(unzipped['word/fontTable.xml'])
    expect(fontXml).toContain('Cambria Math')
    expect(fontXml).toContain('DejaVu Sans')
    expect(fontXml).toContain('w:altName')
  })
})
