import { describe, it, expect } from 'vitest'
import { renderMathToSemanticHtml } from '../src/utils/mathSemantic'
import { latexToUnicode } from '../src/utils/mathUnicode'
import { renderToHtml } from '../src/renderers/html'
import { renderToPlainText } from '../src/renderers/text'
import { parseMarkdown } from '../src/parsers/markdown'

describe('End-to-End Clipboard Copy & Math Preservation', () => {
  const sampleMarkdown = `1. Key Mathematical Formulations

The linear regression cost function (Mean Squared Error) is defined as:

$$J(\\theta) = \\frac{1}{2m} \\sum_{i=1}^m (h_\\theta(x^{(i)}) - y^{(i)})^2$$

The famous mass-energy equivalence $E = mc^2$ shows the relationship between mass and energy.`

  it('generates rich text clipboard payload where fractions NEVER collapse into 12m and exponents never become mc2', () => {
    const doc = parseMarkdown(sampleMarkdown)
    const htmlOutput = renderToHtml(doc, { includeWrapper: false, mathMode: 'semantic' })
    const plainOutput = renderToPlainText(doc, { mathMode: 'unicode' })

    // Simulate what standard document apps (LibreOffice, OneNote, Word) do:
    // When an app strips CSS or parses tags:
    expect(htmlOutput).toContain('math-frac')
    expect(htmlOutput).toContain('<sup')
    expect(htmlOutput).toContain('<sub')

    // HTML payload contains proper semantic superscript and fraction elements
    expect(htmlOutput).toContain('>2</sup>')
    expect(htmlOutput).toContain('math-frac')

    // Plain text clipboard data:
    expect(plainOutput).toContain('J(θ) = 1/2m ∑ᵢ₌₁ᵐ (h_θ(x⁽ⁱ⁾) - y⁽ⁱ⁾)²')
    expect(plainOutput).toContain('E = mc²')
    expect(plainOutput).not.toContain('12m')
    expect(plainOutput).not.toContain('mc2')
  })

  it('selection copy logic produces semantic HTML and unicode text', () => {
    const latex1 = 'J(\\theta) = \\frac{1}{2m} \\sum_{i=1}^m (h_\\theta(x^{(i)}) - y^{(i)})^2'
    const latex2 = 'E = mc^2'

    const semantic1 = renderMathToSemanticHtml(latex1, true)
    const semantic2 = renderMathToSemanticHtml(latex2, false)
    const unicode1 = latexToUnicode(latex1)
    const unicode2 = latexToUnicode(latex2)

    // Verification of semantic HTML
    expect(semantic1).toContain('math-frac')
    expect(semantic1).toContain('border-bottom: 1px solid currentColor')
    expect(semantic1).toContain('mso-hide: all')
    expect(semantic2).toContain('<sup')
    expect(semantic2).toContain('>2</sup>')

    // Verification of Unicode text
    expect(unicode1).toBe('J(θ) = 1/2m ∑ᵢ₌₁ᵐ (h_θ(x⁽ⁱ⁾) - y⁽ⁱ⁾)²')
    expect(unicode2).toBe('E = mc²')
  })
})
