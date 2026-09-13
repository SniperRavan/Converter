import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { DOMParser } from 'linkedom'
;(globalThis as any).DOMParser = DOMParser
import { parseUniversalDocument } from '../src/parsers'
import { parseHtml } from '../src/parsers/html'
import { renderToHtml } from '../src/renderers/html'
import { renderToMarkdown } from '../src/renderers/markdown'
import { renderToLatex } from '../src/renderers/latex'
import { renderToPlainText } from '../src/renderers/text'
import { renderToDocx } from '../src/renderers/docx'
import { latexToUnicode } from '../src/utils/mathUnicode'

describe('Black-Box: End-to-End User Conversion Scenarios', () => {
  it('Scenario 1: ChatGPT AI Math -> Word & MathML', () => {
    const chatGptOutput = `
Here is the step-by-step mathematical proof:

$$
\\lim_{x \\to 0} \\frac{\\sin(x)}{x} = 1
$$

Using L'Hopital's rule:
\\[
\\frac{d}{dx}[\\sin x] = \\cos x
\\]
Therefore the result holds.
    `
    const doc = parseUniversalDocument(chatGptOutput, 'llm-mixed')
    const htmlWord = renderToHtml(doc, { mathMode: 'mathml', includeWrapper: false })

    expect(htmlWord).toContain('<math')
    expect(htmlWord).toContain('sin')
    expect(htmlWord).toContain('cos')
    expect(doc.stats.mathExpressions).toBeGreaterThanOrEqual(2)
  })

  it('Scenario 2: Overleaf LaTeX Resume -> Word Docx conversion', () => {
    const latexCv = `
\\documentclass[11pt,a4paper]{article}
\\title{John Doe - Senior Software Engineer}
\\author{johndoe@example.com}
\\begin{document}
\\section{Experience}
\\textbf{Staff Engineer} at Google (2020 - Present)
\\begin{itemize}
  \\item Architected distributed telemetry pipeline handling 2M events/sec.
  \\item Reduced end-to-end processing latency by 45%.
\\end{itemize}
\\end{document}
    `
    const doc = parseUniversalDocument(latexCv, 'latex')
    const docxBytes = renderToDocx(doc)

    expect(docxBytes.length).toBeGreaterThan(500)
    const textOutput = renderToPlainText(doc)
    expect(textOutput).toContain('Experience')
    expect(textOutput).toContain('Staff Engineer')
    expect(textOutput).toContain('Architected distributed telemetry pipeline')
  })

  it('Scenario 3: Markdown Notes with GFM Tables -> Clean HTML & Word', () => {
    const markdownNotes = `
# System Performance Benchmark

| Cluster | P99 Latency | Throughput |
| :--- | :---: | ---: |
| US-East | 12ms | 45k req/s |
| EU-West | 18ms | 38k req/s |

> Note: All measurements verified under sustained load.
    `
    const doc = parseUniversalDocument(markdownNotes, 'markdown')
    const htmlOutput = renderToHtml(doc, { includeWrapper: true, cleanTables: true })

    expect(htmlOutput).toContain('<table')
    expect(htmlOutput).toContain('>Cluster</th>')
    expect(htmlOutput).toContain('>12ms</td>')
    expect(htmlOutput).toContain('<blockquote>')
  })

  it('Scenario 4: Multi-Target Copy Payload Verification', () => {
    const input = '# Summary\n\nEquation: $E = mc^2$'
    const doc = parseUniversalDocument(input, 'markdown')

    // 1. MathML for MS Word
    const wordPayload = renderToHtml(doc, { mathMode: 'mathml', includeWrapper: false })
    expect(wordPayload).toContain('<math')

    // 2. Unicode clean text
    const unicodePayload = renderToPlainText(doc, { mathMode: 'unicode' })
    expect(unicodePayload).toContain('Summary')
    expect(unicodePayload).toContain('E = mc²')

    // 3. LaTeX target
    const latexPayload = renderToLatex(doc, { includePreamble: false })
    expect(latexPayload).toContain('E = mc^2')
  })

  it('Scenario 5: Line and Column calculation logic matches editor coordinates', () => {
    const text = 'Line 1\nLine 2 is longer\nLine 3 here'
    
    // Simulate cursor placed on 'longer' in Line 2 (index 17)
    const pos = text.indexOf('longer')
    const textBefore = text.substring(0, pos)
    const line = textBefore.split('\n').length
    const lineStart = textBefore.lastIndexOf('\n') + 1
    const col = pos - lineStart + 1

    expect(line).toBe(2)
    expect(col).toBe(11)
  })

  it('Scenario 6: Production build HTML integrity check', () => {
    const distHtmlPath = path.resolve(__dirname, '../dist/index.html')
    if (fs.existsSync(distHtmlPath)) {
      const html = fs.readFileSync(distHtmlPath, 'utf8')
      expect(html).toContain('<!doctype html>')
      expect(html).toContain('viewport')
      expect(html).toContain('Converter')
    }
  })

  it('Scenario 7: Advanced Unicode Math Conversion (Hats, Dirac Bra-kets, Scripts, Integrals)', () => {
    expect(latexToUnicode('\\hat{H}')).toBe('Ĥ')
    expect(latexToUnicode('\\mathcal{H}')).toBe('ℋ')
    expect(latexToUnicode('\\hbar')).toBe('ℏ')
    expect(latexToUnicode('|\\psi_i\\rangle')).toBe('|ψᵢ⟩')
    expect(latexToUnicode('\\ket{0}')).toBe('|0⟩')
    expect(latexToUnicode('\\bra{\\psi}')).toBe('⟨ψ|')
    expect(latexToUnicode('\\braket{\\phi|\\psi}')).toBe('⟨φ|ψ⟩')
    expect(latexToUnicode('\\left\\langle \\psi \\right\\rangle')).toBe('⟨ ψ ⟩')
    expect(latexToUnicode('E^2 = (pc)^2 + (m_0 c^2)^2')).toBe('E² = (pc)² + (m₀ c²)²')
    expect(
      latexToUnicode('\\mathcal{Z} = \\int \\mathcal{D}\\phi \\, \\exp\\left( \\frac{i}{\\hbar} \\int d^4x \\, \\mathcal{L}[\\phi, \\partial_\\mu \\phi] \\right)')
    ).toBe('𝒵 = ∫ 𝒟φ exp( i/ℏ ∫ d⁴x ℒ[φ, ∂_μ φ] )')
  })

  it('Scenario 8: HTML container & article parsing retains all structural blocks', () => {
    const htmlInput = `
      <article>
        <h1>Consensus Protocols</h1>
        <p>Distributed transactions.</p>
        <blockquote><p>Safety over liveness.</p></blockquote>
        <table>
          <thead><tr><th>Protocol</th><th>Latency</th></tr></thead>
          <tbody><tr><td>Raft</td><td>2 RTT</td></tr></tbody>
        </table>
        <pre><code class="language-go">func Ping() string { return "pong" }</code></pre>
      </article>
    `
    const doc = parseHtml(htmlInput)
    expect(doc.children.length).toBe(5)
    expect(doc.children[0].type).toBe('heading')
    expect(doc.children[1].type).toBe('paragraph')
    expect(doc.children[2].type).toBe('blockquote')
    expect(doc.children[3].type).toBe('table')
    expect(doc.children[4].type).toBe('codeBlock')

    const md = renderToMarkdown(doc)
    expect(md).toContain('# Consensus Protocols')
    expect(md).toContain('| Protocol | Latency |')
    expect(md).toContain('| Raft | 2 RTT |')
    expect(md).toContain('```go')
  })
})
