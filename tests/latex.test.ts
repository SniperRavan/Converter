import { describe, it, expect } from 'vitest'
import { parseLatex } from '../src/parsers/latex'
import { renderToMarkdown } from '../src/renderers/markdown'

describe('LaTeX Parser & AST Engine', () => {
  it('parses academic documents with abstract and references', () => {
    const latex = `
\\documentclass{article}
\\title{Sample Paper}
\\author{Jane Doe}
\\date{\\today}
\\begin{document}
\\maketitle
\\begin{abstract}
This is a study on AST document compilation.
\\end{abstract}
\\section{Introduction}
Document processing is essential.
\\begin{thebibliography}{9}
\\bibitem{paper1} Knuth, \\textit{The TeXbook}, 1984.
\\end{thebibliography}
\\end{document}
`
    const doc = parseLatex(latex)
    expect(doc.metadata.title).toBe('Sample Paper')
    expect(doc.metadata.author).toBe('Jane Doe')
    expect(doc.metadata.date).toBeTruthy()
    expect(doc.metadata.date).not.toContain('\\today')

    const md = renderToMarkdown(doc)
    expect(md).toContain('# Sample Paper')
    expect(md).toContain('## Abstract')
    expect(md).toContain('> This is a study on AST document compilation.')
    expect(md).toContain('## References')
    expect(md).toContain('Knuth, *The TeXbook*, 1984.')
  })

  it('parses display equations cleanly into mathBlock nodes', () => {
    const latex = `
\\begin{document}
Here is an equation:
$$ E = mc^2 $$
and another one:
\\[ \\int_0^\\infty e^{-x} dx = 1 \\]
\\end{document}
`
    const doc = parseLatex(latex)
    const mathBlocks = doc.children.filter((n) => n.type === 'mathBlock')
    expect(mathBlocks.length).toBe(2)
    if (mathBlocks[0].type === 'mathBlock') {
      expect(mathBlocks[0].value.trim()).toBe('E = mc^2')
    }
  })

  it('preserves escaped percentage symbols and strips actual comments', () => {
    const latex = `
\\begin{document}
Achieved a 99.5\\% accuracy rate. % This is an internal comment
Second line without comments.
\\end{document}
`
    const doc = parseLatex(latex)
    const md = renderToMarkdown(doc)
    expect(md).toContain('99.5%')
    expect(md).not.toContain('This is an internal comment')
  })

  it('handles Overleaf resume macros (Jake\'s resume template)', () => {
    const resume = `
\\section{Experience}
\\resumeSubHeadingListStart
  \\resumeSubheading
    {Software Engineer}{Jan 2024 -- Present}
    {Tech Corp}{San Francisco, CA}
    \\resumeItemListStart
      \\resumeItem{Architected in-browser compiler serving 50k users.}
      \\resumeItem{Reduced latency by 40\\% using web workers.}
    \\resumeItemListEnd
\\resumeSubHeadingListEnd
`
    const doc = parseLatex(resume)
    const md = renderToMarkdown(doc)
    expect(md).toContain('## Experience')
    expect(md).toContain('Software Engineer')
    expect(md).toContain('Tech Corp')
    expect(md).toContain('Architected in-browser compiler')
  })

  it('expands common inline macros, formatting, and dashes', () => {
    const text = 'Use \\textbf{bold}, \\textit{italic}, \\underline{underline}, and an em---dash.'
    const doc = parseLatex(`\\begin{document}${text}\\end{document}`)
    const md = renderToMarkdown(doc)
    expect(md).toContain('**bold**')
    expect(md).toContain('*italic*')
    expect(md).toContain('*underline*')
    expect(md).toContain('em—dash')
  })
})
