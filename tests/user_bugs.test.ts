import { describe, it, expect } from 'vitest'
import { DOMParser } from 'linkedom'
if (typeof globalThis.DOMParser === 'undefined') {
  globalThis.DOMParser = DOMParser as any
}
import { parseLatex } from '../src/parsers/latex'
import { parseMarkdown } from '../src/parsers/markdown'
import { parseUniversalDocument } from '../src/parsers'
import { detectInputFormat } from '../src/parsers/detector'
import { renderToHtml } from '../src/renderers/html'
import { renderToMarkdown } from '../src/renderers/markdown'
import { renderToLatex } from '../src/renderers/latex'

describe('User Reported Issues Investigation', () => {
  const fullResumeTex = `\\documentclass[letterpaper,11pt]{article}
\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[english]{babel}
\\usepackage{tabularx}
\\usepackage{fontawesome5}

\\titleformat{\\section}{\\scshape\\raggedright\\large}{}{0em}{}[\\titlerule]

\\begin{document}
\\begin{center}
    \\textbf{\\Huge \\scshape John Doe} \\\\ \\vspace{1pt}
    \\small \\faPhone*~ 123-456-7890 ~|~ \\faEnvelope*~ \\href{mailto:john@example.com}{john@example.com} ~|~ 
    \\faLinkedin*~ \\href{https://linkedin.com/in/johndoe}{linkedin.com/in/johndoe} ~|~
    \\faGithub*~ \\href{https://github.com/johndoe}{github.com/johndoe}
\\end{center}

%-----------INTERESTS & HOBBIES-----------
\\section{Interests \\& Hobbies}
\\vspace{2pt}
\\noindent\\small{\\faHeadphones*~ Listening to Music \\hfill \\faBookOpen~ Reading Books \\hfill \\faLaptopCode~ Exploring Emerging Technologies
  \\hspace{2cm}}

\\end{document}`

  it('renders all 3 hobbies in resume HTML with proper spacing and alignment', () => {
    const doc = parseLatex(fullResumeTex)
    const html = renderToHtml(doc)
    expect(html).toContain('Listening to Music')
    expect(html).toContain('Reading Books')
    expect(html).toContain('Exploring Emerging Technologies')
    // Ensure all 3 are inside the hobbies container
    expect(html).toMatch(/Listening to Music[\s\S]*?Reading Books[\s\S]*?Exploring Emerging Technologies/)
  })

  it('detects HTML format for resume HTML output', () => {
    const doc1 = parseLatex(fullResumeTex)
    const html1 = renderToHtml(doc1)
    const detected = detectInputFormat(html1)
    expect(detected.primaryFormat).toBe('html')
  })

  it('detects HTML format for standard markdown-to-html output', () => {
    const md = `# My Heading
This is a paragraph with [a link](https://example.com) and some **bold** text.`
    const doc = parseMarkdown(md)
    const html = renderToHtml(doc)
    const detected = detectInputFormat(html)
    expect(detected.primaryFormat).toBe('html')
  })

  it('round-trip LaTeX -> HTML -> AST -> HTML preserves structure without leaking styles', () => {
    const doc1 = parseLatex(fullResumeTex)
    const html1 = renderToHtml(doc1)
    const doc2 = parseUniversalDocument(html1, 'auto')
    expect(doc2.metadata.sourceFormat).toBe('html')
    // No style tag leaking as text paragraph
    const leakedStyle = doc2.children.find(
      c => c.type === 'paragraph' && (c as any).children?.[0]?.value?.includes('.resume-sheet')
    )
    expect(leakedStyle).toBeUndefined()
    expect(doc2.children.length).toBeGreaterThan(0)
    const html2 = renderToHtml(doc2)
    expect(html2).toContain('John Doe')
    expect(html2).toContain('Interests &amp; Hobbies')
    expect(html2).toContain('Listening to Music')
  })

  it('round-trip Markdown -> HTML -> AST -> Markdown', () => {
    const mdInput = `# Data Structures and Algorithms

Computer science fundamentals include **trees**, **graphs**, and hash tables.

## 1. Complexity

Linear search has $O(n)$ time complexity.

| Algorithm | Best | Worst |
|---|---|---|
| QuickSort | O(n log n) | O(n^2) |
| MergeSort | O(n log n) | O(n log n) |
`
    const doc1 = parseMarkdown(mdInput)
    const html1 = renderToHtml(doc1)
    
    const detected = detectInputFormat(html1)
    expect(detected.primaryFormat).toBe('html')

    const doc2 = parseUniversalDocument(html1, 'auto')
    expect(doc2.metadata.sourceFormat).toBe('html')
    const md2 = renderToMarkdown(doc2)
    expect(md2).toContain('# Data Structures and Algorithms')
    expect(md2).toContain('Complexity')
    expect(md2).toContain('QuickSort')
  })

  it('round-trip Markdown -> LaTeX -> AST -> Markdown', () => {
    const mdInput = `# Architecture Overview

This section describes the microservice layout.

## Services
- Auth Gateway
- Payment Processor
`
    const doc1 = parseMarkdown(mdInput)
    const tex1 = renderToLatex(doc1)
    const detected = detectInputFormat(tex1)
    expect(detected.primaryFormat).toBe('latex')

    const doc2 = parseUniversalDocument(tex1, 'auto')
    expect(doc2.metadata.sourceFormat).toBe('latex')
    const md2 = renderToMarkdown(doc2)
    expect(md2).toContain('Architecture Overview')
    expect(md2).toContain('Auth Gateway')
  })

  it('normalizes colon-indexed lists with zero-width spaces into proper ordered lists without collapsing', () => {
    const rawListInput = `0: "Jake’s resume template"
\u200B
1: "Customized CurVe CV"
\u200B
2: "Ethan’s resume template"
\u200B
3: "Software engineer resume template"
\u200B
20: "Standard resume template"`

    const doc = parseUniversalDocument(rawListInput, 'auto')
    expect(doc.children.length).toBeGreaterThanOrEqual(1)
    
    // Must be parsed as a list, NOT a single collapsed paragraph
    const listBlock = doc.children.find(c => c.type === 'list') as any
    expect(listBlock).toBeDefined()
    expect(listBlock.items.length).toBe(5)
    
    const html = renderToHtml(doc)
    expect(html).toContain('Jake’s resume template')
    expect(html).toContain('Customized CurVe CV')
    expect(html).toContain('<li>')
    // Must not collapse template"1:
    expect(html).not.toMatch(/template["”]1:/)

    const md = renderToMarkdown(doc)
    expect(md).toContain('Jake’s resume template')
    expect(md).toContain('Customized CurVe CV')
  })

  it('parses Awesome-CV macros (\\cvskill, \\cvhonor)', () => {
    const tex = `\\documentclass{article}
\\begin{document}
\\section{Skills}
\\cvskill{Languages}{TypeScript, Python, Rust, C++}
\\cvskill{Frameworks}{React, Vite, Node.js}

\\section{Honors}
\\cvhonor{1st Place}{AI Hackathon}{San Francisco}{2025}
\\end{document}`

    const doc = parseLatex(tex)
    const md = renderToMarkdown(doc)
    expect(md).toContain('**Languages**: TypeScript, Python, Rust, C++')
    expect(md).toContain('**Frameworks**: React, Vite, Node.js')
    expect(md).toContain('**1st Place**')
    expect(md).toContain('*AI Hackathon*')
    expect(md).toContain('(2025)')
  })

  it('parses billryan/resume macros (\\datedsubsection, \\datedline, \\role)', () => {
    const tex = `\\documentclass{article}
\\begin{document}
\\section{Experience}
\\datedsubsection{Google Inc., Mountain View}{2023 -- Present}
\\role{Senior Software Engineer}{Distributed Systems}
\\datedline{Promoted to Tech Lead}{2024}
\\end{document}`

    const doc = parseLatex(tex)
    const md = renderToMarkdown(doc)
    expect(md).toContain('Google Inc., Mountain View')
    expect(md).toContain('(2023 – Present)')
    expect(md).toContain('*Senior Software Engineer*')
    expect(md).toContain('(Distributed Systems)')
    expect(md).toContain('Promoted to Tech Lead')
    expect(md).toContain('(2024)')
  })

  it('expands \\newcommand and \\def macros before parsing', () => {
    const tex = `\\documentclass{article}
\\newcommand{\\R}{\\mathbb{R}}
\\def\\myproject{Convertion Core}
\\begin{document}
\\section{Mathematical Model}
Let $x \\in \\R^n$ be a vector. The system \\myproject{} computes AST nodes.
\\end{document}`

    const doc = parseLatex(tex)
    const md = renderToMarkdown(doc)
    expect(md).toContain('\\mathbb{R}')
    expect(md).toContain('Convertion Core')
  })
})
