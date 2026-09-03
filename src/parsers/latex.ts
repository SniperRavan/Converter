import type {
  NormalizedDocument,
  BlockNode,
  InlineNode,
  TableCellNode,
  TableRowNode,
} from '../core/types'
import { computeDocumentStats } from '../core/stats'

/**
 * Helper to extract content from balanced curly braces after a keyword
 */
function extractBraced(str: string, keyword: string): string | null {
  const idx = str.indexOf(keyword)
  if (idx === -1) return null
  const braceIdx = str.indexOf('{', idx)
  if (braceIdx === -1) return null
  let depth = 1
  const start = braceIdx + 1
  for (let i = start; i < str.length; i++) {
    if (str[i] === '{') depth++
    else if (str[i] === '}') {
      depth--
      if (depth === 0) return str.slice(start, i).trim()
    }
  }
  return null
}

/**
 * Strips raw LaTeX typesetting commands from extracted metadata strings
 */
function cleanLatexMetadata(text: string): string[] {
  return text
    .replace(/\\(Huge|huge|LARGE|Large|large|normalsize|small|footnotesize|tiny|scshape|bfseries|itshape|centering|raggedright|noindent)/g, '')
    .replace(/\\color\{[^}]+\}/g, '')
    .replace(/\\vspace\*?\{[^}]+\}/g, '')
    .replace(/\\hspace\*?\{[^}]+\}/g, '')
    .replace(/\\&/g, '&')
    .split(/\\\\|\n/)
    .map((l) => l.trim())
    .filter(Boolean)
}

/**
 * Parses LaTeX documents (reports, articles, resumes/CVs) into the unified AST
 */
export function parseLatex(latexContent: string): NormalizedDocument {
  if (!latexContent.trim()) {
    return {
      type: 'document',
      version: 1,
      metadata: {
        createdAt: new Date().toISOString(),
        sourceFormat: 'latex',
      },
      children: [],
      stats: {
        headings: 0,
        paragraphs: 0,
        codeBlocks: 0,
        mathExpressions: 0,
        tables: 0,
        lists: 0,
        characters: 0,
        words: 0,
      },
    }
  }

  // Strip leading/trailing quote marks if user pasted quoted string
  const cleanedContent = latexContent.trim().replace(/^["']/, '').replace(/["']$/, '')

  // Extract metadata (Title, Author, Date) with balanced brace matching
  const rawTitle = extractBraced(cleanedContent, '\\title')
  const rawAuthor = extractBraced(cleanedContent, '\\author')
  const rawDate = extractBraced(cleanedContent, '\\date')

  const titleLines = rawTitle ? cleanLatexMetadata(rawTitle) : []
  const authorLines = rawAuthor ? cleanLatexMetadata(rawAuthor) : []
  const dateLines = rawDate ? cleanLatexMetadata(rawDate) : []

  let docTitle = titleLines.length > 0 ? titleLines[0].replace(/\\textbf\{([^}]+)\}/g, '$1') : undefined
  const docAuthor = authorLines.length > 0 ? authorLines[0].replace(/\\textbf\{([^}]+)\}/g, '$1') : undefined

  // Strip comments
  let body = cleanedContent.replace(/%.*$/gm, '')

  // Extract body between \begin{document} and \end{document} if present
  if (body.includes('\\begin{document}')) {
    const docMatch = body.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/)
    if (docMatch) body = docMatch[1]
  }

  // Preprocess FontAwesome icons to universal emojis
  body = body
    .replace(/\\faMapMarker\*?~/g, '📍 ')
    .replace(/\\faPhone\*?~/g, '📞 ')
    .replace(/\\faEnvelope\*?~/g, '✉️ ')
    .replace(/\\faGlobe\*?~/g, '🌐 ')
    .replace(/\\faGithub\*?~/g, '🐙 ')
    .replace(/\\faLinkedin\*?~/g, '💼 ')
    .replace(/\\faHeadphones\*?~/g, '🎧 ')
    .replace(/\\faBookOpen\*?~/g, '📖 ')
    .replace(/\\faLaptopCode\*?~/g, '💻 ')
    .replace(/\\fa[A-Z][a-zA-Z0-9]*\*?~?/g, '')

  // Preprocess Resume/CV custom macros (Jake's Resume / sb2nov template standard)
  body = body
    .replace(/\\resumeProjectHeading\s*\{([\s\S]*?)\}\s*\{([\s\S]*?)\}/g, (_m, p1, p2) => {
      return `\n\n### ${p1.trim()} *(${p2.trim()})*\n\n`
    })
    .replace(/\\resumeSubheading\s*\{([\s\S]*?)\}\s*\{([\s\S]*?)\}\s*\{([\s\S]*?)\}\s*\{([\s\S]*?)\}/g, (_m, p1, p2, p3, p4) => {
      return `\n\n### ${p1.trim()} — *${p2.trim()}* *(${p4.trim()})*\n*${p3.trim()}*\n\n`
    })
    .replace(/\\resumeSubHeadingListStart\b/g, '')
    .replace(/\\resumeSubHeadingListEnd\b/g, '')
    .replace(/\\resumeItemListStart\b/g, '\\begin{itemize}')
    .replace(/\\resumeItemListEnd\b/g, '\\end{itemize}')
    .replace(/\\resumeItem\{([\s\S]*?)\}/g, '\\item $1')

  const children: BlockNode[] = []

  function parseLatexInline(text: string): InlineNode[] {
    const inlines: InlineNode[] = []
    let cursor = text
      .replace(/\\textbf\{([^}]+)\}/g, '@@BOLD_$1@@')
      .replace(/\\textit\{([^}]+)\}/g, '@@ITALIC_$1@@')
      .replace(/\\emph\{([^}]+)\}/g, '@@ITALIC_$1@@')
      .replace(/\\texttt\{([^}]+)\}/g, '@@CODE_$1@@')
      .replace(/\\href\{([^}]+)\}\{([^}]+)\}/g, '@@LINK_$1@@$2@@ENDLINK@@')
      .replace(/\\url\{([^}]+)\}/g, '@@LINK_$1@@$1@@ENDLINK@@')
      .replace(/\\&/g, '&')
      .replace(/\\%/g, '%')
      .replace(/\\#/g, '#')
      .replace(/\\_/g, '_')
      .replace(/\\(Huge|huge|LARGE|Large|large|normalsize|small|footnotesize|tiny|scshape|bfseries|itshape|centering|raggedright|noindent)/g, '')
      .replace(/\\color\{[^}]+\}/g, '')
      .replace(/\\vspace\*?\{[^}]+\}/g, '')
      .replace(/\\hspace\*?\{[^}]+\}/g, '')
      .replace(/\\hfill\b/g, ' · ')
      .replace(/\\newline\b/g, '\n')
      .replace(/~/g, ' ')

    const tokens = cursor.split(
      /(@@BOLD_[^@]+@@|@@ITALIC_[^@]+@@|@@CODE_[^@]+@@|@@LINK_[^@]+@@[\s\S]*?@@ENDLINK@@|\$[^$]+\$|\\\([^)]+\\\))/
    )

    for (const token of tokens) {
      if (!token) continue
      if (token.startsWith('@@BOLD_') && token.endsWith('@@')) {
        const val = token.slice(7, -2)
        inlines.push({ type: 'strong', children: [{ type: 'text', value: val }] })
      } else if (token.startsWith('@@ITALIC_') && token.endsWith('@@')) {
        const val = token.slice(9, -2)
        inlines.push({ type: 'emphasis', children: [{ type: 'text', value: val }] })
      } else if (token.startsWith('@@CODE_') && token.endsWith('@@')) {
        const val = token.slice(7, -2)
        inlines.push({ type: 'inlineCode', value: val })
      } else if (token.startsWith('@@LINK_') && token.endsWith('@@ENDLINK@@')) {
        const linkMatch = token.match(/^@@LINK_([^@]+)@@([\s\S]*?)@@ENDLINK@@$/)
        if (linkMatch) {
          inlines.push({
            type: 'link',
            url: linkMatch[1].trim(),
            children: parseLatexInline(linkMatch[2]),
          })
        }
      } else if (token.startsWith('$') && token.endsWith('$')) {
        inlines.push({ type: 'inlineMath', value: token.slice(1, -1).trim() })
      } else if (token.startsWith('\\(') && token.endsWith('\\)')) {
        inlines.push({ type: 'inlineMath', value: token.slice(2, -2).trim() })
      } else {
        inlines.push({ type: 'text', value: token })
      }
    }

    return inlines.length > 0 ? inlines : [{ type: 'text', value: text }]
  }

  // 1. Build Cover / Title Page if explicit \title metadata is present
  if (titleLines.length > 0) {
    children.push({
      type: 'heading',
      level: 1,
      children: parseLatexInline(titleLines[0]),
    })

    for (let i = 1; i < titleLines.length; i++) {
      children.push({
        type: 'paragraph',
        children: parseLatexInline(titleLines[i]),
      })
    }

    const metaParagraphs: BlockNode[] = []
    if (authorLines.length > 0) {
      metaParagraphs.push({
        type: 'paragraph',
        children: parseLatexInline(authorLines.join(' ')),
      })
    }
    for (const dLine of dateLines) {
      metaParagraphs.push({
        type: 'paragraph',
        children: parseLatexInline(dLine),
      })
    }

    if (metaParagraphs.length > 0) {
      children.push({
        type: 'blockquote',
        children: metaParagraphs,
      })
    }

    children.push({
      type: 'thematicBreak',
    })
  }

  // 2. Detect Resume / CV Header (\begin{center} with candidate name and contact block)
  const centerHeaderMatch = body.match(/\\begin\{center\}([\s\S]*?)\\end\{center\}/)
  if (titleLines.length === 0 && centerHeaderMatch) {
    const rawHeader = centerHeaderMatch[1]
    const headerLines = rawHeader
      .replace(/\\(Huge|huge|LARGE|Large|large|normalsize|small|footnotesize|tiny|scshape|bfseries|itshape|color\{[^}]+\})/g, '')
      .split(/\\\\(?:\[[^\]]*\])?|\n\s*\n/)
      .map((l) => l.trim())
      .filter(Boolean)

    if (headerLines.length > 0) {
      const candidateName = headerLines[0]
        .replace(/\\textbf\{([^}]+)\}/g, '$1')
        .replace(/[{}\\]/g, '')
        .trim()

      if (!docTitle) docTitle = candidateName

      // Heading 1 for Candidate Name
      children.push({
        type: 'heading',
        level: 1,
        children: [{ type: 'text', value: candidateName }],
      })

      // Contact & Profile Links
      const contactInfo = headerLines.slice(1).join(' · ')
      if (contactInfo) {
        children.push({
          type: 'paragraph',
          children: parseLatexInline(contactInfo),
        })
      }

      children.push({
        type: 'thematicBreak',
      })

      // Remove the header from body so it's not processed twice
      body = body.replace(centerHeaderMatch[0], '')
    }
  }

  // 3. Parse Body Blocks
  const rawBlocks = body.split(/\n\s*\n/)

  for (const block of rawBlocks) {
    const trimmed = block.trim()
    if (!trimmed) continue

    // Skip internal layout commands that don't output text
    if (/^\\(pagenumbering|clearpage|newpage|onehalfspacing|doublespacing|singlespacing|maketitle|noindent|centering|raggedright|pagestyle)\b/.test(trimmed)) {
      continue
    }

    // Markdown-style Level 3 headings generated from resume macros
    if (trimmed.startsWith('### ')) {
      children.push({
        type: 'heading',
        level: 3,
        children: parseLatexInline(trimmed.slice(4)),
      })
      continue
    }

    // Chapters & Parts (Level 1 Heading)
    const chapterMatch = trimmed.match(/^\\(chapter|part)\*?\{([^}]+)\}/)
    if (chapterMatch) {
      children.push({
        type: 'heading',
        level: 1,
        children: parseLatexInline(chapterMatch[2]),
      })
      continue
    }

    // Sections & Subsections
    const sectionMatch = trimmed.match(/^\\(section|subsection|subsubsection)\*?\{([^}]+)\}/)
    if (sectionMatch) {
      const level = (sectionMatch[1] === 'section' ? 2 : sectionMatch[1] === 'subsection' ? 3 : 4) as 2 | 3 | 4
      children.push({
        type: 'heading',
        level,
        children: parseLatexInline(sectionMatch[2]),
      })
      continue
    }

    // Master Document Modular Includes: \input{filename} or \include{filename}
    const inputMatch = trimmed.match(/^\\(input|include)\{([^}]+)\}/)
    if (inputMatch) {
      const rawName = inputMatch[2].replace(/\.tex$/, '').trim()
      const formattedTitle = rawName
        .split(/[_\-/]+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')

      children.push({
        type: 'heading',
        level: 2,
        children: [{ type: 'text', value: formattedTitle }],
      })
      children.push({
        type: 'paragraph',
        children: [
          { type: 'emphasis', children: [{ type: 'text', value: `[Module: ${rawName}.tex]` }] },
        ],
      })
      continue
    }

    // Table of Contents / Lists
    if (/^\\(tableofcontents|listoftables|listoffigures)\b/.test(trimmed)) {
      const label = trimmed.includes('tableofcontents')
        ? 'Table of Contents'
        : trimmed.includes('listoftables')
        ? 'List of Tables'
        : 'List of Figures'
      children.push({
        type: 'heading',
        level: 2,
        children: [{ type: 'text', value: label }],
      })
      children.push({
        type: 'paragraph',
        children: [
          {
            type: 'emphasis',
            children: [{ type: 'text', value: `(Document index automatically generated in compiled PDF/Word output)` }],
          },
        ],
      })
      continue
    }

    // Abstract Environment
    const abstractMatch = trimmed.match(/\\begin\{abstract\}([\s\S]*?)\\end\{abstract\}/)
    if (abstractMatch) {
      children.push({
        type: 'heading',
        level: 2,
        children: [{ type: 'text', value: 'Abstract' }],
      })
      children.push({
        type: 'blockquote',
        children: [
          {
            type: 'paragraph',
            children: parseLatexInline(abstractMatch[1].trim()),
          },
        ],
      })
      continue
    }

    // Code Listings (lstlisting or verbatim)
    const codeMatch = trimmed.match(/\\begin\{(lstlisting|verbatim)\}([\s\S]*?)\\end\{\1\}/)
    if (codeMatch) {
      children.push({
        type: 'codeBlock',
        language: 'text',
        value: codeMatch[2].trim(),
      })
      continue
    }

    // Equations (equation, align, gather)
    const eqMatch = trimmed.match(/\\begin\{(equation|align|gather)\*?\}([\s\S]*?)\\end\{\1\*?\}/)
    if (eqMatch) {
      children.push({
        type: 'mathBlock',
        value: eqMatch[2].trim(),
      })
      continue
    }

    // Display math with $$...$$ or \[...\]
    if (trimmed.startsWith('$$') && trimmed.endsWith('$$')) {
      children.push({
        type: 'mathBlock',
        value: trimmed.slice(2, -2).trim(),
      })
      continue
    }
    if (trimmed.startsWith('\\[') && trimmed.endsWith('\\]')) {
      children.push({
        type: 'mathBlock',
        value: trimmed.slice(2, -2).trim(),
      })
      continue
    }

    // Lists (itemize, enumerate)
    const listMatch = trimmed.match(/\\begin\{(itemize|enumerate)\}([\s\S]*?)\\end\{\1\}/)
    if (listMatch) {
      const ordered = listMatch[1] === 'enumerate'
      const itemTexts = listMatch[2].split(/\\item\b/).filter((t) => t.trim().length > 0)
      const items = itemTexts.map((it) => ({
        type: 'listItem' as const,
        children: [
          {
            type: 'paragraph' as const,
            children: parseLatexInline(it.trim()),
          },
        ],
      }))

      children.push({
        type: 'list',
        ordered,
        items,
      })
      continue
    }

    // Tabular / Table
    const tableMatch = trimmed.match(/\\begin\{tabular\}\{[^}]+\}([\s\S]*?)\\end\{tabular\}/)
    if (tableMatch) {
      const rawRows = tableMatch[1]
        .split(/\\\\/)
        .map((r) => r.trim())
        .filter((r) => r && !r.startsWith('\\hline') && !r.startsWith('\\toprule') && !r.startsWith('\\bottomrule'))

      if (rawRows.length > 0) {
        const parsedRows: TableRowNode[] = []
        let headers: TableCellNode[] = []

        rawRows.forEach((rowStr, rIdx) => {
          const cells: TableCellNode[] = rowStr.split('&').map((cellStr) => ({
            type: 'tableCell',
            children: parseLatexInline(cellStr.trim()),
          }))

          if (rIdx === 0) {
            headers = cells
          } else {
            parsedRows.push({ type: 'tableRow', cells })
          }
        })

        if (headers.length > 0) {
          children.push({
            type: 'table',
            headers,
            rows: parsedRows,
            alignments: headers.map(() => null),
          })
          continue
        }
      }
    }

    // Default Paragraph (strip any trailing \\)
    const cleanedPara = trimmed
      .replace(/\\\\(?:\[[^\]]*\])?$/, '')
      .replace(/^\\small\{([\s\S]*?)\}$/, '$1')
      .trim()

    if (cleanedPara) {
      children.push({
        type: 'paragraph',
        children: parseLatexInline(cleanedPara),
      })
    }
  }

  const stats = computeDocumentStats(children)

  return {
    type: 'document',
    version: 1,
    metadata: {
      title: docTitle,
      author: docAuthor,
      createdAt: new Date().toISOString(),
      sourceFormat: 'latex',
    },
    children,
    stats,
  }
}
