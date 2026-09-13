import { describe, it, expect } from 'vitest'
import { parseLatex } from '../src/parsers/latex'
import { renderToMarkdown } from '../src/renderers/markdown'
import { renderToHtml } from '../src/renderers/html'
import { renderToLatex } from '../src/renderers/latex'
import { renderToDocx } from '../src/renderers/docx'

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

  it('does not swallow document when an environment is unclosed or mentioned inline', () => {
    const raw = `
\\begin{document}
Paragraph 1 mentions \\begin{abstract} and \\begin{thebibliography} inline.

\\section{Methods}
Paragraph 2 after unclosed environment mentions.
\\end{document}
`
    const doc = parseLatex(raw)
    const md = renderToMarkdown(doc)
    expect(md).toContain('Paragraph 1 mentions')
    expect(md).toContain('## Methods')
    expect(md).toContain('Paragraph 2 after unclosed environment mentions.')
    expect(md).not.toContain('## References')
  })

  it('preserves percentages with numbers like 100% when stripping comments', () => {
    const raw = `
\\begin{document}
Claims 100% of compilation accuracy. % This is a real comment
Achieved 99.8% precision.
\\end{document}
`
    const doc = parseLatex(raw)
    const md = renderToMarkdown(doc)
    expect(md).toContain('Claims 100% of compilation accuracy.')
    expect(md).toContain('Achieved 99.8% precision.')
    expect(md).not.toContain('This is a real comment')
  })

  it('parses full real-world CV without leaking layout commands or broken headings', () => {
    const cv = `\\documentclass[a4paper,10pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[margin=0.45in]{geometry}
\\usepackage{titlesec}
\\usepackage{enumitem}
\\usepackage{hyperref}
\\usepackage{xcolor}
\\usepackage{fontawesome5}
\\usepackage{tabularx}

\\definecolor{primary}{rgb}{0.0, 0.22, 0.52}
\\definecolor{textblack}{rgb}{0.12, 0.12, 0.12}

\\begin{document}
\\pagestyle{empty}

\\begin{center}
    \\textbf{\\Huge \\scshape \\color{primary} Akash Das Dhibar} \\\\[4pt]
    \\small
    \\faMapMarker*~ dsijsdojf, asdijfa India ~|~
    \\faPhone*~ +91-32542346503251~|~
    \\href{mailto:test@gmail.com}{\\faEnvelope~ test@gmail.com} \\\\[2pt]
    \\href{https://sniperravan.github.io/sniperravan-portfolio/}{\\faGlobe~ sniperravan.github.io/portfolio} ~|~
    \\href{https://github.com/sniperravan}{\\faGithub~ github.com/sniperravan} ~|~
    \\href{https://linkedin.com/in/akash-das-dhibar}{\\faLinkedin~ linkedin.com/in/akash-das-dhibar}
\\end{center}

\\vspace{-4pt}

\\section{Summary}
\\small{Computer Science undergraduate with practical experience developing modern full-stack web applications, Chrome Manifest V3 extensions, and
desktop tools. Proficient in JavaScript/TypeScript, React, Node.js, and Linux system workflows, with proven initiative in open-source systems
architecture (C++/Qt) and building privacy-centric software.}
\\vspace{2pt}

\\section{Technical Skills}
\\resumeItemListStart
    \\item \\textbf{Languages:} JavaScript (ES6+), TypeScript, C/C++ (Basics), Python (Basics), HTML5, CSS3, Bash
    \\item \\textbf{Frontend Development:} React.js, Vite, Tailwind CSS, Framer Motion, Zustand, Progressive Web Apps (PWA)
    \\item \\textbf{Backend & Cloud Services:} Node.js, Express.js, Supabase, Firebase Authentication, Cloudinary, RESTful APIs
    \\item \\textbf{Developer Tools & OS:} Git, GitHub, Linux (Debian / Mint / Cinnamon), Neovim (Lua), Playwright, Vitest, Vercel, Render
    \\item \\textbf{Core Concepts:} Manifest V3 Browser Extensions, Plugin Architecture, Local-First Privacy, Open Source
\\resumeItemListEnd
\\vspace{2pt}

\\section{Key Projects}
    \\resumeSubHeadingListStart

      \\resumeProjectHeading
          {\\textbf{ReclaimX — Campus Lost & Found Web Platform} $|$ \\emph{HTML5, CSS3, JS, Node.js, Express, Supabase, Firebase}}{2024 -- 2025}
          \\resumeItemListStart
            \\resumeItem{Architected a full-stack campus Lost and Found progressive web platform featuring an automated weighted matching engine and
anti-fraud verification workflows.}
            \\resumeItem{Secured database operations using Supabase and integrated Firebase Authentication for verified student identity management.}
            \\resumeItem{Configured Cloudinary for image upload handling and deployed the client on Vercel and backend services on Render.}
          \\resumeItemListEnd

      \\resumeProjectHeading
          {\\textbf{Trace — Privacy-First AI Token Observability Extension} $|$ \\emph{React 19, TypeScript, Vite, Tailwind, Manifest V3}}{2025 --
2026}
          \\resumeItemListStart
            \\resumeItem{Built a local-native Chrome extension to track real-time AI token and context-window consumption across ChatGPT, Claude, and
Gemini.}
            \\resumeItem{Integrated Byte-Pair Encoding (BPE) tokenizers (\\texttt{gpt-tokenizer}) for accurate on-device token estimation without
transmitting user data to external cloud services.}
            \\resumeItem{Implemented global state management using Zustand and crafted a responsive, dark glassmorphic UI with Framer Motion
animations and provider-specific theme matching.}
          \\resumeItemListEnd

    \\resumeSubHeadingListEnd
\\vspace{2pt}

\\section{Open Source Contributions}
  \\resumeSubHeadingListStart

    \\resumeSubheading
      {Flameshot (C++ / Qt Open Source Screenshot Utility)}{GitHub}
      {Open Source Contributor — Dynamic Plugin Architecture}{2024 -- 2025}
      \\resumeItemListStart
        \\resumeItem{Authored Pull Request (\\textbf{\\#4905}) introducing a modular dynamic C++ plugin architecture using Qt's \\texttt{QPluginLoader},
enabling community extensions (OCR, AI tools) without bloating the core codebase.}
        \\resumeItem{Engineered the \\texttt{FlameshotPluginInterface} SDK, cross-platform library discovery (\\texttt{.so}, \\texttt{.dll}, \\texttt{.
dylib}), and a dedicated Plugins Manager configuration tab within the Flameshot GUI.}
        \\resumeItem{Addressed maintainer architectural goals outlined in \\textbf{RFC \\#2529}, providing developer documentation
(\\texttt{docs/PLUGINS.md}) and reference sample plugin implementations.}
      \\resumeItemListEnd

  \\resumeSubHeadingListEnd
\\vspace{2pt}

\\section{Education}
  \\resumeSubHeadingListStart
    \\resumeSubheading
      {MIT)}{london, world}
      {Bachelor of Technology in Computer Science and Engineering (Lateral Entry) $|$ \\textbf{CGPA: 6.81/10}}{2022 -- 2026}

    \\resumeSubheading
      {ocofrd}{washinton, dc}
      {Diploma in Mechanical Engineering $|$ \\textbf{CGPA: 7.3/10}}{2019 -- 2022}
  \\resumeSubHeadingListEnd
\\vspace{2pt}

\\section{Certifications & Training}
\\resumeItemListStart
    \\item \\textbf{Generative AI Engineering Mastermind:} Outskill (Generative AI engineering and modern AI development workflows)
    \\item \\textbf{Certificate in Information Technology Application (CITA / IMPACT):} WEBEL (6 Months IT & Computing Certification)
    \\item \\textbf{Computer Applications & Basics of C / Python Programming (V2):} Utkarsh Bangla (PBSSD, Govt. of West Bengal)
\\resumeItemListEnd
\\vspace{4pt}

\\section{Interests & Hobbies}
\\vspace{2pt}
\\noindent\\small{\\faHeadphones*~ Listening to Music \\hfill \\faBookOpen~ Reading Books \\hfill \\faLaptopCode~ Exploring Emerging Technologies
\\hspace{2cm}}

\\end{document}`

    const doc = parseLatex(cv)
    const md = renderToMarkdown(doc)
    const html = renderToHtml(doc)

    // Markdown assertions
    expect(md).toContain('# Akash Das Dhibar')
    expect(md).toContain('## Summary')
    expect(md).toContain('## Technical Skills')
    expect(md).toContain('## Key Projects')
    expect(md).toContain('## Open Source Contributions')
    expect(md).toContain('## Education')
    expect(md).toContain('## Certifications & Training')
    expect(md).toContain('## Interests & Hobbies')
    expect(md).toContain('### **Trace — Privacy-First AI Token Observability Extension** | *React 19, TypeScript, Vite, Tailwind, Manifest V3* *(2025 – 2026)*')
    expect(md).not.toContain('\\vspace')
    expect(md).not.toContain('\\pagestyle')
    expect(md).not.toContain('[4pt]')
    expect(md).not.toContain('[2pt]')
    expect(md).not.toContain('{Computer Science undergraduate')

    // HTML assertions
    expect(html).toContain('<h1>Akash Das Dhibar</h1>')
    expect(html).toContain('align="center"')
    expect(html).toContain('<h2>Summary</h2>')
    expect(html).not.toContain('\\vspace')
    expect(html).not.toContain('\\pagestyle')
    expect(html).toContain('Listening to Music')
    expect(html).toContain('Reading Books')
    expect(html).toContain('Exploring Emerging Technologies')
    expect(md).toContain('Listening to Music')
    expect(md).toContain('Reading Books')
    expect(md).toContain('Exploring Emerging Technologies')
  })

  it('parses real-world arXiv research papers with matrices and multi-line equations', () => {
    const arxivPaper = `\\documentclass[11pt,a4paper]{article}
\\usepackage{amsmath}
\\usepackage{amssymb}

\\title{Spectral Analysis of Quantum Graph Operators}
\\author{Dr. Elena Rostova \\and Prof. Marcus Thorne}
\\date{March 2026}

\\begin{document}
\\maketitle

\\begin{abstract}
We establish asymptotic bounds for the spectral radius of adjacency matrices on random geometric graphs.
\\end{abstract}

\\section{Spectral Gap Theorems}
Let $G = (V, E)$ be a connected graph. The graph Laplacian matrix is given by:

\\begin{equation}
L = D - A = \\begin{pmatrix} d_1 & -a_{12} & \\cdots \\\\ -a_{21} & d_2 & \\cdots \\\\ \\vdots & \\vdots & \\ddots \\end{pmatrix}
\\end{equation}

The Dirichlet eigenvalue problem satisfies:
\\[
\\lambda_1 = \\inf_{u \\neq 0} \\frac{\\int_\\Omega |\\nabla u|^2 dx}{\\int_\\Omega u^2 dx} \\ge \\frac{\\pi^2}{d^2}
\\]

\\section{Convergence Results}
\\begin{itemize}
  \\item The spectral norm satisfies $\\|L\\|_2 \\le 2 \\Delta(G)$.
  \\item The algebraic connectivity $\\lambda_2(L) > 0$ if and only if $G$ is connected.
\\end{itemize}

\\end{document}`

    const doc = parseLatex(arxivPaper)
    expect(doc.metadata.title).toBe('Spectral Analysis of Quantum Graph Operators')
    expect(doc.metadata.author).toContain('Elena Rostova')

    const md = renderToMarkdown(doc)
    expect(md).toContain('# Spectral Analysis of Quantum Graph Operators')
    expect(md).toContain('## Abstract')
    expect(md).toContain('## Spectral Gap Theorems')
    expect(md).toContain('pmatrix')
    expect(md).toContain('\\lambda_1')

    const html = renderToHtml(doc, { mathMode: 'mathml' })
    expect(html).toContain('<h1>Spectral Analysis of Quantum Graph Operators</h1>')
    expect(html).toContain('<math')
    expect(html).not.toContain('codecogs')
  })

  it('parses modern multi-column HipsterCV templates with custom macros and progress meters', () => {
    const hipsterTex = `\\documentclass[lighthipster]{simplehipstercv}
\\title{New Simple CV}
\\author{\\LaTeX{} Ninja}
\\date{June 2019}
\\begin{document}
\\section*{Start}
\\simpleheader{headercolour}{Jack}{Sparrow}{Captain}{white}
\\subsection*{}
\\columnratio{0.23}[0.75]
\\begin{paracol}{2}
\\hbadness5000
{\\setasidefontcolour
\\flushright
\\begin{center}
    \\roundpic{jack.jpg}
\\end{center}
\\bg{cvgreen}{white}{About me}\\\\[0.5em]
{\\footnotesize
\\lorem}
\\bigskip
\\bg{cvgreen}{white}{personal}\\\\[0.5em]
Jack Sparrow
\\bigskip
\\infobubble{\\faAt}{cvgreen}{white}{jack@sparrow.org}
\\infobubble{\\faTwitter}{cvgreen}{white}{@sparrow}
\\phantom{turn the page}
}
\\switchcolumn
\\section*{Short Resumé}
\\begin{tabular}{r| p{0.5\textwidth} c}
    \\cvevent{2018--2021}{Captain of the Black Pearl}{Lead}{East Indies \\color{cvred}}{Finally got the ship back.}{disney.png}
\\end{tabular}
\\section*{Programming}
\\begin{tabular}{r @{\\hspace{0.5em}}l}
     \\bg{skilllabelcolour}{iconcolour}{html, css} & \\barrule{0.4}{0.5em}{cvpurple}\\\\
     \\bg{skilllabelcolour}{iconcolour}{\\LaTeX} & \\barrule{0.55}{0.5em}{cvgreen}
\\end{tabular}
\\section*{Languages}
\\begin{tabular}{l | ll}
\\textbf{English} & C2 & {\\phantom{x}\\footnotesize mother tongue} \\\\
\\textbf{French} & C2 & \\pictofraction{\\faCircle}{cvgreen}{3}{black!30}{1}{\\tiny}
\\end{tabular}
\\end{paracol}
\\end{document}`

    const doc = parseLatex(hipsterTex)
    expect(doc.metadata.title).toBe('Jack Sparrow')
    expect(doc.metadata.author).toBe('Jack Sparrow')

    const md = renderToMarkdown(doc)
    expect(md).toContain('# Jack Sparrow')
    expect(md).toContain('### Captain')
    expect(md).not.toContain('New Simple CV')
    expect(md).not.toContain('LaTeX{} Ninja')
    expect(md).not.toContain('## Start')
    expect(md).toContain('![Profile Photo](jack.jpg)')
    expect(md).toContain('### About me')
    expect(md).toContain('Lorem ipsum dolor sit amet')
    expect(md).toContain('### personal')
    expect(md).toContain('✉️ [jack@sparrow.org](mailto:jack@sparrow.org)')
    expect(md).toContain('🐦 [@sparrow](https://twitter.com/sparrow)')
    expect(md).toContain('## Short Resumé')
    expect(md).toContain('**Captain of the Black Pearl**')
    expect(md).toContain('Lead · East Indies')
    expect(md).toContain('![Logo](disney.png)')
    expect(md).toContain('## Programming')
    expect(md).toContain('**html, css**')
    expect(md).toContain('████░░░░░░ 40%')
    expect(md).toContain('██████░░░░ 55%')
    expect(md).toContain('## Languages')
    expect(md).toContain('mother tongue')
    expect(md).toContain('●●●○')
    expect(md).not.toContain('\\cvevent')
    expect(md).not.toContain('\\bg')
    expect(md).not.toContain('\\barrule')
    expect(md).not.toContain('\\infobubble')
    expect(md).not.toContain('\\phantom')
    expect(md).not.toContain('\\columnratio')
    expect(md).not.toContain('\\hbadness')
  })

  it('accurately computes non-zero stats, formats facebook icon, and preserves latex for Hipster CV', () => {
    const hipsterTex = `\\documentclass[lighthipster]{simplehipstercv}
\\usepackage[utf8]{inputenc}
\\title{Captain}
\\author{Jack Sparrow}
\\begin{document}
\\begin{paracol}{2}
\\bg{cvgreen}{white}{About me}
Experienced pirate captain of the Black Pearl.
\\bg{cvgreen}{white}{personal}
Jack Sparrow\\\\
nationality: English\\\\
1690
\\infobubble{\\faFacebook}{cvgreen}{white}{Jack Sparrow}
\\infobubble{\\faAt}{cvgreen}{white}{jack@sparrow.org}
\\switchcolumn
\\section*{Curriculum}
\\begin{tabular}{r| p{0.5\\textwidth} c}
\\cvevent{2018--2021}{Captain}{Lead}{East Indies}{Ship retrieved.}{disney.png}
\\end{tabular}
\\section*{Programming}
\\begin{tabular}{r @{\\hspace{0.5em}}l}
\\bg{skilllabelcolour}{iconcolour}{Python} & \\barrule{0.5}{0.5em}{cvpurple}\\\\
\\end{tabular}
\\section*{Languages}
\\begin{tabular}{l | ll}
\\textbf{English} & C2 & mother tongue
\\end{tabular}
\\end{paracol}
\\end{document}`

    const doc = parseLatex(hipsterTex)
    expect(doc.stats.headings).toBeGreaterThan(0)
    expect(doc.stats.paragraphs).toBeGreaterThan(0)
    expect(doc.stats.tables).toBeGreaterThan(0)
    expect(doc.stats.words).toBeGreaterThan(0)
    expect(doc.stats.characters).toBeGreaterThan(0)

    const md = renderToMarkdown(doc)
    expect(md).toContain('👤 Jack Sparrow')
    expect(md).not.toContain('f [Jack Sparrow](Jack Sparrow)')

    const ltx = renderToLatex(doc, { includePreamble: true })
    expect(ltx).toContain('\\documentclass[lighthipster]{simplehipstercv}')
    expect(ltx).not.toContain('\\documentclass{article}\n\\documentclass')
  })

  it('parses single-column SWE article resume with custom primary color and exports', () => {
    const sweTex = `\\documentclass[a4paper,10pt]{article}
\\usepackage{xcolor}
\\definecolor{primary}{rgb}{0.0, 0.22, 0.52}
\\newcommand{\\resumeItem}[1]{\\item\\small{{#1}}}
\\newcommand{\\resumeProjectHeading}[2]{\\item\\begin{tabular*}{1.0\\textwidth}{l@{\\extracolsep{\\fill}}r}\\small#1 & \\small #2 \\\\\\end{tabular*}}
\\begin{document}
\\begin{center}
    \\textbf{\\Huge \\scshape \\color{primary} John Doe} \\\\[4pt]
    \\small
    \\faMapMarker*~ San Francisco, CA ~|~
    \\href{mailto:john@example.com}{\\faEnvelope~ john@example.com}
\\end{center}
\\section{Projects}
\\resumeProjectHeading{\\textbf{CoolApp} $|$ \\emph{React, Node}}{2024 -- 2025}
\\begin{itemize}
  \\resumeItem{Developed scalable platform.}
\\end{itemize}
\\end{document}`

    const doc = parseLatex(sweTex)
    expect(doc.metadata.title).toBe('John Doe')
    expect(doc.stats.headings).toBeGreaterThan(0)
    expect(doc.stats.words).toBeGreaterThan(0)

    const md = renderToMarkdown(doc)
    expect(md).toContain('# John Doe')
    expect(md).toContain('## Projects')
    expect(md).toContain('### **CoolApp** | *React, Node* *(2024 – 2025)*')

    const html = renderToHtml(doc)
    expect(html).toContain('<h1>John Doe</h1>')
    expect(html).toContain('<h2>Projects</h2>')
    expect(html).toContain('#003885') // Extracted primary color
    expect(html).toContain('2024 – 2025')

    const docx = renderToDocx(doc)
    expect(docx.byteLength).toBeGreaterThan(1000)

    const ltx = renderToLatex(doc, { includePreamble: true })
    expect(ltx).toContain('John Doe')
  })

  it('parses multi-page LaTeX report with page breaks between chapters and clearpage', () => {
    const reportTex = `\\documentclass{report}
\\begin{document}
\\chapter{First Chapter}
Content of chapter 1.
\\clearpage
\\chapter{Second Chapter}
Content of chapter 2.
\\newpage
Final remarks.
\\end{document}`

    const doc = parseLatex(reportTex)
    const pageBreaks = doc.children.filter((c) => c.type === 'thematicBreak' && (c as any).isPageBreak)
    expect(pageBreaks.length).toBeGreaterThanOrEqual(2)

    const html = renderToHtml(doc)
    expect(html).toContain('class="page-break"')
    expect(html).toContain('page-break-before: always')

    const docx = renderToDocx(doc)
    expect(docx.byteLength).toBeGreaterThan(500)
  })

  it('renders vector TikZ diagram in figure environment into SVG rawBlock', () => {
    const tikzTex = `\\documentclass{report}
\\begin{document}
\\begin{figure}[htbp]
\\centering
\\begin{tikzpicture}
  \\draw (0, 0) grid (32, -8);
  \\draw (0, 0) rectangle (1, -2) node {FIN};
\\end{tikzpicture}
\\caption{Frame Format}
\\label{fig:my-diagram}
\\end{figure}
See Figure~\\ref{fig:my-diagram}.
\\end{document}`

    const doc = parseLatex(tikzTex)
    const svgBlock = doc.children.find((c) => c.type === 'rawBlock' && c.content.includes('<svg'))
    expect(svgBlock).toBeTruthy()
    expect(svgBlock?.id).toBe('fig-my-diagram')

    const refLink = doc.children.find((c) => JSON.stringify(c).includes('#fig-my-diagram'))
    expect(refLink).toBeTruthy()

    const html = renderToHtml(doc)
    expect(html).toContain('<svg')
    expect(html).toContain('href="#fig-my-diagram"')
  })

  it('builds interactive Table of Contents with hyperlinked section anchors and citations', () => {
    const tocTex = `\\documentclass{report}
\\begin{document}
\\chapter*{Declaration}
I declare this work is original.\\cite{sourceA}
\\tableofcontents
\\chapter{Introduction}
\\section{Motivation}
Here is why.\\cite{sourceB}
\\begin{thebibliography}{9}
\\bibitem{sourceA} First Source Reference.
\\bibitem{sourceB} Second Source Reference.
\\end{thebibliography}
\\end{document}`

    const doc = parseLatex(tocTex)
    const tocList = doc.children.find((c) => c.type === 'list' && JSON.stringify(c).includes('#introduction'))
    expect(tocList).toBeTruthy()

    const html = renderToHtml(doc)
    expect(html).toContain('href="#declaration"')
    expect(html).toContain('href="#introduction"')
    expect(html).toContain('href="#motivation"')
    expect(html).toContain('href="#cite-sourceA"')
    expect(html).toContain('id="cite-sourceA"')
    expect(html).toContain('id="cite-sourceB"')
  })
})



