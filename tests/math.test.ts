import { describe, it, expect } from 'vitest'
import { latexToUnicode } from '../src/utils/mathUnicode'
import { parseLatex } from '../src/parsers/latex'
import { renderToHtml } from '../src/renderers/html'

describe('Math Representation & Unicode Engine', () => {
  it('converts common superscripts and subscripts to Unicode', () => {
    expect(latexToUnicode('E = mc^2')).toBe('E = mc²')
    expect(latexToUnicode('x_1 + x_2 = 10')).toBe('x₁ + x₂ = 10')
    expect(latexToUnicode('a^{12}')).toBe('a¹²')
  })

  it('converts Greek letters and mathematical operators', () => {
    expect(latexToUnicode('\\alpha + \\beta = \\gamma')).toBe('α + β = γ')
    expect(latexToUnicode('\\int f(x) dx')).toBe('∫ f(x) dx')
    expect(latexToUnicode('x \\approx y \\neq z')).toBe('x ≈ y ≠ z')
    expect(latexToUnicode('x \\le 5 \\ge 1')).toBe('x ≤ 5 ≥ 1')
  })

  it('renders MathML output when mathMode is mathml', () => {
    const doc = parseLatex('\\begin{document}$$ x^2 + y^2 = r^2 $$\\end{document}')
    const html = renderToHtml(doc, { includeWrapper: false, mathMode: 'mathml' })
    expect(html).toContain('<math')
    expect(html).toContain('</math>')
  })

  it('renders visual fallback with unicode alt when mathMode is images', () => {
    const doc = parseLatex('\\begin{document}$$ E = mc^2 $$\\end{document}')
    const html = renderToHtml(doc, { includeWrapper: false, mathMode: 'images' })
    expect(html).toContain('<img')
    expect(html).toContain('alt="E = mc²"')
  })
})
