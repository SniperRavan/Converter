import type {
  NormalizedDocument,
  BlockNode,
  InlineNode,
  TableCellNode,
  TableRowNode,
} from '../core/types'
import { computeDocumentStats } from '../core/stats'

/**
 * Extracts content within balanced curly braces starting from startIdx
 */
function extractBalancedBraces(str: string, startIdx: number): { content: string; endIdx: number } | null {
  let depth = 1
  for (let i = startIdx; i < str.length; i++) {
    if (str[i] === '{') depth++
    else if (str[i] === '}') {
      depth--
      if (depth === 0) return { content: str.slice(startIdx, i), endIdx: i }
    }
  }
  return null
}

/**
 * Helper to extract content from balanced curly braces after an exact command name
 */
function extractBracedCommand(str: string, cmd: string): string | null {
  const regex = new RegExp(`\\\\${cmd}\\s*\\{`, 'm')
  const match = str.match(regex)
  if (!match || match.index === undefined) return null
  const start = match.index + match[0].length
  const res = extractBalancedBraces(str, start)
  return res ? res.content.trim() : null
}

/**
 * Extracts N consecutive balanced-braced arguments: {arg1}{arg2}...{argN}
 */
function extractNBracedArgs(str: string, startIdx: number, count: number): { args: string[]; endIdx: number } | null {
  const args: string[] = []
  let cursor = startIdx
  for (let c = 0; c < count; c++) {
    const openBrace = str.indexOf('{', cursor)
    if (openBrace === -1) return null
    let depth = 1
    let closeBrace = -1
    for (let i = openBrace + 1; i < str.length; i++) {
      if (str[i] === '{') depth++
      else if (str[i] === '}') {
        depth--
        if (depth === 0) {
          closeBrace = i
          break
        }
      }
    }
    if (closeBrace === -1) return null
    args.push(str.slice(openBrace + 1, closeBrace).trim())
    cursor = closeBrace + 1
  }
  return { args, endIdx: cursor }
}

/**
 * Unwraps font-sizing and style wrapper commands like \small{text} into bare text
 */
function unwrapSizingCommands(input: string): string {
  let result = input
  const regex = /\\(Huge|huge|LARGE|Large|large|normalsize|small|footnotesize|tiny|scshape|bfseries|itshape)\s*\{/
  while (true) {
    const match = result.match(regex)
    if (!match || match.index === undefined) break
    const startIdx = match.index
    const openBrace = match.index + match[0].length - 1
    const res = extractNBracedArgs(result, openBrace, 1)
    if (!res) break
    result = result.slice(0, startIdx) + ' ' + res.args[0] + ' ' + result.slice(res.endIdx)
  }
  return result
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
 * Robust balanced inline LaTeX parser with zero placeholder token leaks
 */
export function parseLatexInline(text: string): InlineNode[] {
  const cleaned = text
    .replace(/\\(Huge|huge|LARGE|Large|large|normalsize|small|footnotesize|tiny|scshape|bfseries|itshape|centering|raggedright|noindent)/g, '')
    .replace(/\\color\{[^}]+\}/g, '')
    .replace(/\\vspace\*?\{[^}]+\}/g, '')
    .replace(/\\hspace\*?\{[^}]+\}/g, '')
    .replace(/\\hfill\b/g, ' · ')
    .replace(/\\\\(?:\[[^\]]*\])?/g, '\n')
    .replace(/~/g, ' ')
    .replace(/\s*\$\\\|\$\s*/g, ' | ')
    .replace(/\s*\$\|\$\s*/g, ' | ')
    .replace(/\\&/g, '&')
    .replace(/\\%/g, '%')
    .replace(/\\#/g, '#')
    .replace(/\\_/g, '_')

  const nodes: InlineNode[] = []
  let i = 0
  let textBuf = ''

  function flushText() {
    if (textBuf) {
      nodes.push({ type: 'text', value: textBuf })
      textBuf = ''
    }
  }

  while (i < cleaned.length) {
    // Check \href{url}{label}
    if (cleaned.startsWith('\\href', i)) {
      const uStart = cleaned.indexOf('{', i)
      if (uStart !== -1) {
        const uRes = extractBalancedBraces(cleaned, uStart + 1)
        if (uRes) {
          const tStart = cleaned.indexOf('{', uRes.endIdx)
          if (tStart !== -1) {
            const tRes = extractBalancedBraces(cleaned, tStart + 1)
            if (tRes) {
              flushText()
              nodes.push({
                type: 'link',
                url: uRes.content.trim(),
                children: parseLatexInline(tRes.content.trim()),
              })
              i = tRes.endIdx + 1
              continue
            }
          }
        }
      }
    }

    // Check \url{url}
    if (cleaned.startsWith('\\url', i)) {
      const uStart = cleaned.indexOf('{', i)
      if (uStart !== -1) {
        const uRes = extractBalancedBraces(cleaned, uStart + 1)
        if (uRes) {
          flushText()
          const url = uRes.content.trim()
          nodes.push({
            type: 'link',
            url,
            children: [{ type: 'text', value: url }],
          })
          i = uRes.endIdx + 1
          continue
        }
      }
    }

    // Check \textbf{...}
    if (cleaned.startsWith('\\textbf', i)) {
      const bStart = cleaned.indexOf('{', i)
      if (bStart !== -1) {
        const bRes = extractBalancedBraces(cleaned, bStart + 1)
        if (bRes) {
          flushText()
          nodes.push({
            type: 'strong',
            children: parseLatexInline(bRes.content),
          })
          i = bRes.endIdx + 1
          continue
        }
      }
    }

    // Check \textit{...} or \emph{...}
    if (cleaned.startsWith('\\textit', i) || cleaned.startsWith('\\emph', i)) {
      const bStart = cleaned.indexOf('{', i)
      if (bStart !== -1) {
        const bRes = extractBalancedBraces(cleaned, bStart + 1)
        if (bRes) {
          flushText()
          nodes.push({
            type: 'emphasis',
            children: parseLatexInline(bRes.content),
          })
          i = bRes.endIdx + 1
          continue
        }
      }
    }

    // Check \texttt{...}
    if (cleaned.startsWith('\\texttt', i)) {
      const bStart = cleaned.indexOf('{', i)
      if (bStart !== -1) {
        const bRes = extractBalancedBraces(cleaned, bStart + 1)
        if (bRes) {
          flushText()
          nodes.push({
            type: 'inlineCode',
            value: bRes.content,
          })
          i = bRes.endIdx + 1
          continue
        }
      }
    }

    // Check $...$ inline math
    if (cleaned[i] === '$' && cleaned[i + 1] !== '$') {
      const nextDollar = cleaned.indexOf('$', i + 1)
      if (nextDollar !== -1) {
        flushText()
        nodes.push({
          type: 'inlineMath',
          value: cleaned.slice(i + 1, nextDollar).trim(),
        })
        i = nextDollar + 1
        continue
      }
    }

    // Check \(...\) inline math
    if (cleaned.startsWith('\\(', i)) {
      const endParen = cleaned.indexOf('\\)', i + 2)
      if (endParen !== -1) {
        flushText()
        nodes.push({
          type: 'inlineMath',
          value: cleaned.slice(i + 2, endParen).trim(),
        })
        i = endParen + 2
        continue
      }
    }

    textBuf += cleaned[i]
    i++
  }

  flushText()
  return nodes.length > 0 ? nodes : [{ type: 'text', value: text }]
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

  // Extract metadata (Title, Author, Date) with balanced brace matching (avoid matching \titleformat)
  const rawTitle = extractBracedCommand(cleanedContent, 'title')
  const rawAuthor = extractBracedCommand(cleanedContent, 'author')
  const rawDate = extractBracedCommand(cleanedContent, 'date')

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

  // Expand Resume/CV custom macros with balanced brace arguments
  while (true) {
    const idx = body.indexOf('\\resumeSubheading')
    if (idx === -1) break
    const res = extractNBracedArgs(body, idx + 17, 4)
    if (!res) break
    const [p1, p2, p3, p4] = res.args
    const replacement = `\n\n### ${p1.trim()} — *${p2.trim()}* *(${p4.trim()})*\n*${p3.trim()}*\n\n`
    body = body.slice(0, idx) + replacement + body.slice(res.endIdx)
  }

  while (true) {
    const idx = body.indexOf('\\resumeProjectHeading')
    if (idx === -1) break
    const res = extractNBracedArgs(body, idx + 21, 2)
    if (!res) break
    const [p1, p2] = res.args
    const replacement = `\n\n### ${p1.trim()} *(${p2.trim()})*\n\n`
    body = body.slice(0, idx) + replacement + body.slice(res.endIdx)
  }

  while (true) {
    const idx = body.indexOf('\\resumeItem')
    if (idx === -1) break
    const res = extractNBracedArgs(body, idx + 11, 1)
    if (!res) break
    const [p1] = res.args
    const replacement = `\n\\item ${p1.trim()}\n`
    body = body.slice(0, idx) + replacement + body.slice(res.endIdx)
  }

  body = body
    .replace(/\\resumeSubHeadingListStart\b/g, '')
    .replace(/\\resumeSubHeadingListEnd\b/g, '')
    .replace(/\\resumeItemListStart\b/g, '\n\\begin{itemize}\n')
    .replace(/\\resumeItemListEnd\b/g, '\n\\end{itemize}\n')

  // Unwrap sizing commands (\small{...})
  body = unwrapSizingCommands(body)

  const children: BlockNode[] = []

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
    const bIdx = rawHeader.indexOf('\\textbf{')
    let candidateName = ''
    let withoutName = rawHeader

    if (bIdx !== -1) {
      const bRes = extractBalancedBraces(rawHeader, bIdx + 8)
      if (bRes) {
        candidateName = bRes.content
          .replace(/\\(Huge|huge|LARGE|Large|large|normalsize|small|footnotesize|tiny|scshape|bfseries|itshape)/g, '')
          .replace(/\\color\{[^}]+\}/g, '')
          .replace(/[\\{}]/g, '')
          .trim()
        withoutName = rawHeader.slice(0, bIdx) + rawHeader.slice(bRes.endIdx + 1)
      }
    }

    if (candidateName) {
      if (!docTitle) docTitle = candidateName

      // Heading 1 for Candidate Name
      children.push({
        type: 'heading',
        level: 1,
        children: [{ type: 'text', value: candidateName }],
      })
    }

    // Contact & Profile Links
    const contactLines = withoutName
      .replace(/\\(Huge|huge|LARGE|Large|large|normalsize|small|footnotesize|tiny|scshape|bfseries|itshape)/g, '')
      .replace(/\\color\{[^}]+\}/g, '')
      .split(/\\\\(?:\[[^\]]*\])?|\n\s*\n/)
      .map((l) => l.trim())
      .filter(Boolean)

    for (const line of contactLines) {
      children.push({
        type: 'paragraph',
        children: parseLatexInline(line),
      })
    }

    children.push({
      type: 'thematicBreak',
    })

    // Remove the center header from body so it is not processed twice
    body = body.replace(centerHeaderMatch[0], '')
  }

  // 3. Normalize sections and environments into clean distinct blocks
  body = body
    .replace(/(\\section\*?\{[^}]+\}|\\subsection\*?\{[^}]+\}|\\subsubsection\*?\{[^}]+\}|\\chapter\*?\{[^}]+\})/g, '\n\n$1\n\n')
    .replace(/(\\begin\{(?:itemize|enumerate|tabular|tabular\*|lstlisting|verbatim|equation|align|gather|abstract)\*?(?:\{[^}]*\})*)/g, '\n\n$1\n\n')
    .replace(/(\\end\{(?:itemize|enumerate|tabular|tabular\*|lstlisting|verbatim|equation|align|gather|abstract)\*?\})/g, '\n\n$1\n\n')

  // 4. Parse Body Blocks
  const rawBlocks = body.split(/\n\s*\n/)

  for (const block of rawBlocks) {
    const trimmed = block.trim()
    if (!trimmed) continue

    // Skip layout commands or empty vspace blocks that don't output text
    if (/^(\\vspace\*?\{[^}]*\}|\\hspace\*?\{[^}]*\}|\\noindent|\\pagestyle\{[^}]*\}|\\pagenumbering\{[^}]*\}|\\clearpage|\\newpage|\\onehalfspacing|\\doublespacing|\\singlespacing|\\maketitle|\\centering|\\raggedright|\s*)+$/.test(trimmed)) {
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
    const tableMatch = trimmed.match(/\\begin\{tabular\*?\}\{[^}]+\}(?:\[[^\]]*\])?(?:\{[^}]*\})?([\s\S]*?)\\end\{tabular\*?\}/)
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
