import { describe, it, expect } from 'vitest'
import { renderMathToSemanticHtml } from '../src/utils/mathSemantic'
import { latexToUnicode } from '../src/utils/mathUnicode'
import { parseMarkdown } from '../src/parsers/markdown'
import { renderToHtml } from '../src/renderers/html'

describe('Universal Semantic HTML Math & Fallbacks', () => {
  it('converts cost function equation into high-fidelity semantic HTML without collapsing into 12m or mc2', () => {
    const latex = 'J(\\theta) = \\frac{1}{2m} \\sum_{i=1}^m (h_\\theta(x^{(i)}) - y^{(i)})^2'
    const html = renderMathToSemanticHtml(latex, true)

    // 1. Fractions must have two-story layout AND hidden fallback slash
    expect(html).toContain('math-frac')
    expect(html).toContain('border-bottom: 1px solid currentColor')
    expect(html).toContain('mso-hide: all')
    expect(html).toContain('>') // numerator and denominator
    expect(html).toContain('display: none') // fallback slash

    // 2. Exponents must use standard <sup> tags preserved by rich text editors
    expect(html).toContain('<sup')
    expect(html).toContain('>2</sup>')
    expect(html).toContain('>m</em></sup>')

    // 3. Subscripts must use standard <sub> tags preserved by rich text editors
    expect(html).toContain('<sub')
    expect(html).toContain('θ</em></sub>')

    // 4. Variables must be styled
    expect(html).toContain('<em style="font-style: italic;">J</em>')
    expect(html).toContain('<em style="font-style: italic;">θ</em>')

    // 5. Stripping all HTML tags simulates a dumb clipboard receiver:
    // It MUST produce a slash '/' between 1 and 2m, NEVER '12m'!
    const strippedText = html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ')
    expect(strippedText).not.toContain('12m')
    expect(strippedText).toContain('1/2')
  })

  it('converts E = mc^2 into semantic HTML with proper superscript', () => {
    const latex = 'E = mc^2'
    const html = renderMathToSemanticHtml(latex, false)

    expect(html).toContain('<sup')
    expect(html).toContain('>2</sup>')
    expect(html).toContain('Cambria Math')
    expect(html).toContain('<em style="font-style: italic;">E</em>')
    expect(html).toContain('<em style="font-style: italic;">c</em>')
  })

  it('renders markdown document with semantic mathMode without raw mathml collapsing', () => {
    const md = `1. Key Mathematical Formulations

The linear regression cost function (Mean Squared Error) is defined as:

$$J(\\theta) = \\frac{1}{2m} \\sum_{i=1}^m (h_\\theta(x^{(i)}) - y^{(i)})^2$$

The famous mass-energy equivalence $E = mc^2$ shows the relationship between mass and energy.`

    const doc = parseMarkdown(md)
    const html = renderToHtml(doc, { includeWrapper: false, mathMode: 'semantic' })

    // Must NOT contain bare raw MathML that collapses in Google Docs / OneNote
    expect(html).not.toContain('<math xmlns')
    expect(html).toContain('math-frac')
    expect(html).toContain('<sup')
    expect(html).toContain('<sub')
    expect(html).toContain('>2</sup>')
  })

  it('converts complex formulas to readable Unicode math in plain text', () => {
    expect(latexToUnicode('E = mc^2')).toBe('E = mc²')
    expect(
      latexToUnicode('J(\\theta) = \\frac{1}{2m} \\sum_{i=1}^m (h_\\theta(x^{(i)}) - y^{(i)})^2')
    ).toBe('J(θ) = 1/2m ∑ᵢ₌₁ᵐ (h_θ(x⁽ⁱ⁾) - y⁽ⁱ⁾)²')
    expect(latexToUnicode('\\sigma(z) = \\frac{1}{1 + e^{-z}}')).toBe('σ(z) = 1/(1 + e⁻ᶻ)')
  })
})
