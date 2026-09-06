import type {
  NormalizedDocument,
  BlockNode,
  InlineNode,
  TableCellNode,
  TableRowNode,
  ListItemNode,
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
 * Extracts balanced LaTeX environment: \begin{envName}[opt]{arg}... \end{envName}
 */
function extractEnvironment(str: string, startIndex: number): {
  envName: string
  args: string
  content: string
  fullMatch: string
  endIndex: number
} | null {
  const beginMatch = str.slice(startIndex).match(/^\\begin\{([a-zA-Z0-9*]+)\}/)
  if (!beginMatch) return null

  const envName = beginMatch[1]
  let cursor = startIndex + beginMatch[0].length

  let args = ''
  while (cursor < str.length) {
    const nextChar = str[cursor]
    if (nextChar === ' ' || nextChar === '\t') {
      cursor++
      continue
    }
    if (nextChar === '[') {
      const closeBracket = str.indexOf(']', cursor)
      if (closeBracket !== -1) {
        args += str.slice(cursor, closeBracket + 1)
        cursor = closeBracket + 1
        continue
      }
    }
    if (nextChar === '{') {
      const balanced = extractBalancedBraces(str, cursor + 1)
      if (balanced) {
        args += '{' + balanced.content + '}'
        cursor = balanced.endIdx + 1
        continue
      }
    }
    break
  }

  const beginTag = `\\begin{${envName}}`
  const endTag = `\\end{${envName}}`
  let depth = 1
  let searchIdx = cursor

  while (searchIdx < str.length) {
    const nextBegin = str.indexOf(beginTag, searchIdx)
    const nextEnd = str.indexOf(endTag, searchIdx)

    if (nextEnd === -1) {
      return null
    }

    if (nextBegin !== -1 && nextBegin < nextEnd) {
      depth++
      searchIdx = nextBegin + beginTag.length
    } else {
      depth--
      if (depth === 0) {
        const content = str.slice(cursor, nextEnd)
        const endIndex = nextEnd + endTag.length
        return { envName, args, content, fullMatch: str.slice(startIndex, endIndex), endIndex }
      }
      searchIdx = nextEnd + endTag.length
    }
  }

  return null
}

/**
 * Returns the current date formatted in standard academic style (e.g. September 7, 2026)
 */
function getTodayFormatted(): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date())
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
    .replace(/\\today\b/g, getTodayFormatted())
    .replace(/\\(Huge|huge|LARGE|Large|large|normalsize|small|footnotesize|tiny|scshape|bfseries|itshape|centering|raggedright|noindent)/g, '')
    .replace(/\\color\{[^}]+\}/g, '')
    .replace(/\\vspace\*?\{[^}]+\}/g, '')
    .replace(/\\hspace\*?\{[^}]+\}/g, '')
    .replace(/\\&/g, '&')
    .replace(/\\%/g, '%')
    .replace(/\\#/g, '#')
    .replace(/\\_/g, '_')
    .split(/\\\\|\n/)
    .map((l) => l.trim())
    .filter(Boolean)
}

/**
 * Robust balanced inline LaTeX parser with zero placeholder token leaks
 */
export function parseLatexInline(text: string): InlineNode[] {
  let cleaned = text
    .replace(/\\today\b/g, getTodayFormatted())
    .replace(/\\LaTeX\b/g, 'LaTeX')
    .replace(/\\TeX\b/g, 'TeX')
    .replace(/\\dots\b|\\ldots\b/g, '...')
    .replace(/---/g, '—')
    .replace(/--/g, '–')
    .replace(/``/g, '“')
    .replace(/''/g, '”')
    .replace(/`/g, '‘')
    .replace(/\\(Huge|huge|LARGE|Large|large|normalsize|small|footnotesize|tiny|scshape|bfseries|itshape|centering|raggedright|raggedleft|noindent)/g, '')
    .replace(/\\color\{[^}]+\}/g, '')
    .replace(/\\vspace\*?\{[^}]+\}/g, '')
    .replace(/\\hspace\*?\{[^}]+\}/g, '')
    .replace(/\\(hfill|vfill)\b/g, ' · ')
    .replace(/\\{1,2}\s*\[\s*-?[\d.]+\s*(?:pt|mm|cm|in|ex|em)?\s*\]/g, ' ')
    .replace(/\\\\/g, '\n')
    .replace(/~/g, ' ')
    .replace(/\s*\$\\\|\$\s*/g, ' | ')
    .replace(/\s*\$\|\$\s*/g, ' | ')
    .replace(/\\quad\b/g, '  ')
    .replace(/\\qquad\b/g, '    ')
    .replace(/\\&/g, '&')
    .replace(/\\%/g, '%')
    .replace(/\\#/g, '#')
    .replace(/\\_/g, '_')
    .replace(/\\\$/g, '$')
    .replace(/\\\{/g, '{')
    .replace(/\\\}/g, '}')

  // Unwrap outer balanced braces e.g. {Some text}
  if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
    const b = extractBalancedBraces(cleaned, 1)
    if (b && b.endIdx === cleaned.length - 1) {
      cleaned = b.content.trim()
    }
  }

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

    // Check \textit{...}, \emph{...}, or \underline{...}
    if (
      cleaned.startsWith('\\textit', i) ||
      cleaned.startsWith('\\emph', i) ||
      cleaned.startsWith('\\underline', i)
    ) {
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

    // Check \cite{...} or \cite[p. 10]{...}
    if (cleaned.startsWith('\\cite', i)) {
      const optStart = cleaned.indexOf('[', i)
      let optText = ''
      const braceStart = cleaned.indexOf('{', i)
      if (optStart !== -1 && optStart < braceStart) {
        const optEnd = cleaned.indexOf(']', optStart)
        if (optEnd !== -1 && optEnd < braceStart) {
          optText = cleaned.slice(optStart + 1, optEnd).trim()
        }
      }
      if (braceStart !== -1) {
        const bRes = extractBalancedBraces(cleaned, braceStart + 1)
        if (bRes) {
          flushText()
          const key = bRes.content.trim()
          const label = optText ? `[${key}, ${optText}]` : `[${key}]`
          nodes.push({ type: 'text', value: label })
          i = bRes.endIdx + 1
          continue
        }
      }
    }

    // Check \ref{...} or \eqref{...}
    if (cleaned.startsWith('\\ref', i) || cleaned.startsWith('\\eqref', i)) {
      const isEq = cleaned.startsWith('\\eqref', i)
      const braceStart = cleaned.indexOf('{', i)
      if (braceStart !== -1) {
        const bRes = extractBalancedBraces(cleaned, braceStart + 1)
        if (bRes) {
          flushText()
          const refName = bRes.content.trim()
          nodes.push({ type: 'text', value: isEq ? `(${refName})` : `[${refName}]` })
          i = bRes.endIdx + 1
          continue
        }
      }
    }

    // Check $$...$$ display math occurring within inline text
    if (cleaned.startsWith('$$', i)) {
      const nextDollar = cleaned.indexOf('$$', i + 2)
      if (nextDollar !== -1) {
        flushText()
        nodes.push({
          type: 'inlineMath',
          value: cleaned.slice(i + 2, nextDollar).trim(),
        })
        i = nextDollar + 2
        continue
      }
    }

    // Check \[...\] display math occurring within inline text
    if (cleaned.startsWith('\\[', i)) {
      const nextBracket = cleaned.indexOf('\\]', i + 2)
      if (nextBracket !== -1) {
        flushText()
        nodes.push({
          type: 'inlineMath',
          value: cleaned.slice(i + 2, nextBracket).trim(),
        })
        i = nextBracket + 2
        continue
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
 * Parses LaTeX tabular environment contents into a TableNode
 */
function parseLatexTabular(content: string): BlockNode | null {
  const rawRows = content
    .split(/\\\\/)
    .map((r) => r.trim())
    .filter((r) => r && !r.startsWith('\\hline') && !r.startsWith('\\toprule') && !r.startsWith('\\bottomrule'))

  if (rawRows.length === 0) return null

  const parsedRows: TableRowNode[] = []
  let headers: TableCellNode[] = []

  rawRows.forEach((rowStr, rIdx) => {
    const cleanedRow = rowStr
      .replace(/\\(hline|toprule|midrule|bottomrule)\b/g, '')
      .replace(/\\\\(?:\[[^\]]*\])?\s*$/, '')
      .trim()

    if (!cleanedRow) return

    // Preserve escaped \& before splitting on cell delimiter &
    const cells: TableCellNode[] = cleanedRow
      .replace(/\\&/g, '\uFFF0')
      .split('&')
      .map((cellStr) => ({
        type: 'tableCell' as const,
        children: parseLatexInline(cellStr.replace(/\uFFF0/g, '&').trim()),
      }))

    if (rIdx === 0) {
      headers = cells
    } else {
      parsedRows.push({ type: 'tableRow', cells })
    }
  })

  if (headers.length === 0 && parsedRows.length === 0) return null

  return {
    type: 'table',
    headers,
    rows: parsedRows,
    alignments: headers.map(() => null),
  }
}

/**
 * Parses \begin{thebibliography} entries into ListItemNodes
 */
function parseBibliographyContent(content: string): ListItemNode[] {
  const bibPattern = /\\bibitem(?:\s*\[([^\]]*)\])?(?:\s*\{([^}]*)\})?\s*/g
  const matches = [...content.matchAll(bibPattern)]
  const items: ListItemNode[] = []

  if (matches.length === 0) {
    return []
  }

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i]
    const next = matches[i + 1]
    const textStart = (current.index ?? 0) + current[0].length
    const textEnd = next && next.index !== undefined ? next.index : content.length
    const refText = content.slice(textStart, textEnd).trim()
    const label = current[1]?.trim()
    const inlineChildren = parseLatexInline(refText)
    const finalChildren = label ? [{ type: 'text' as const, value: `[${label}] ` }, ...inlineChildren] : inlineChildren

    items.push({
      type: 'listItem',
      children: [
        {
          type: 'paragraph',
          children: finalChildren,
        },
      ],
    })
  }

  return items
}

/**
 * Parses LaTeX list environment contents (\begin{itemize} / \begin{enumerate})
 */
function parseLatexListContent(content: string): ListItemNode[] {
  const items: ListItemNode[] = []
  const firstItem = content.indexOf('\\item')
  if (firstItem === -1) {
    if (content.trim()) {
      return [
        {
          type: 'listItem',
          children: [
            {
              type: 'paragraph',
              children: parseLatexInline(content.trim()),
            },
          ],
        },
      ]
    }
    return []
  }

  let cursor = firstItem
  while (cursor < content.length) {
    const itemMatch = content.slice(cursor).match(/^\\item(?:\s*\[([^\]]*)\])?\s*/)
    if (!itemMatch) break
    const itemStart = cursor + itemMatch[0].length
    const label = itemMatch[1]?.trim()

    let search = itemStart
    let nextItemIdx = -1

    while (search < content.length) {
      if (content.slice(search).startsWith('\\begin{')) {
        const env = extractEnvironment(content, search)
        if (env) {
          search = env.endIndex
          continue
        }
      }
      if (content.slice(search).startsWith('\\item')) {
        nextItemIdx = search
        break
      }
      search++
    }

    const itemBody = nextItemIdx !== -1 ? content.slice(itemStart, nextItemIdx) : content.slice(itemStart)
    cursor = nextItemIdx !== -1 ? nextItemIdx : content.length

    const nestedBlocks = parseLatexBodyBlocks(itemBody.trim())
    const itemChildren: (BlockNode | InlineNode)[] = []

    if (label) {
      const labelPrefix: InlineNode[] = [{ type: 'strong', children: [{ type: 'text', value: `${label} ` }] }]
      if (nestedBlocks.length > 0 && nestedBlocks[0].type === 'paragraph') {
        nestedBlocks[0].children = [...labelPrefix, ...nestedBlocks[0].children]
      } else {
        nestedBlocks.unshift({ type: 'paragraph', children: labelPrefix })
      }
    }

    if (nestedBlocks.length > 0) {
      itemChildren.push(...nestedBlocks)
    } else if (itemBody.trim()) {
      itemChildren.push({
        type: 'paragraph',
        children: parseLatexInline(itemBody.trim()),
      })
    }

    items.push({
      type: 'listItem',
      children: itemChildren,
    })
  }

  return items
}

/**
 * Parses LaTeX document body sequentially into structured AST blocks
 */
function parseLatexBodyBlocks(input: string): BlockNode[] {
  const blocks: BlockNode[] = []
  let cursor = 0

  while (cursor < input.length) {
    // 1. Skip leading whitespace
    while (cursor < input.length && /\s/.test(input[cursor])) cursor++
    if (cursor >= input.length) break

    // 2. Ignore no-op formatting commands
    const ignorableMatch = input
      .slice(cursor)
      .match(
        /^\\(newpage|clearpage|maketitle|noindent|centering|raggedright|raggedleft|bigskip|medskip|smallskip|onehalfspacing|doublespacing|singlespacing|pagestyle\{[^}]*\}|thispagestyle\{[^}]*\}|pagenumbering\{[^}]*\}|vspace\*?\{[^}]*\}|hspace\*?\{[^}]*\})(?:\b|(?=[\s\\{}]|$))/
      )
    if (ignorableMatch) {
      cursor += ignorableMatch[0].length
      continue
    }

    // 3. Check for Markdown-style heading level 3 (from resume macros: ### Heading)
    const mdH3Match = input.slice(cursor).match(/^###[ \t]+([^\n]+)/)
    if (mdH3Match) {
      blocks.push({
        type: 'heading',
        level: 3,
        children: parseLatexInline(mdH3Match[1].trim()),
      })
      cursor += mdH3Match[0].length
      continue
    }

    // 4. Check for Section Headings (\part, \chapter, \section, \subsection, \subsubsection, \paragraph, \cvsection)
    const sectionMatch = input
      .slice(cursor)
      .match(/^\\(part|chapter|section|subsection|subsubsection|paragraph|cvsection|cvsubsection)\*?\s*\{/)
    if (sectionMatch) {
      const openBrace = cursor + sectionMatch[0].length - 1
      const balanced = extractBalancedBraces(input, openBrace + 1)
      if (balanced) {
        const cmd = sectionMatch[1]
        const level: 1 | 2 | 3 | 4 =
          cmd === 'part' || cmd === 'chapter'
            ? 1
            : cmd === 'section' || cmd === 'cvsection'
            ? 2
            : cmd === 'subsection' || cmd === 'cvsubsection'
            ? 3
            : 4
        blocks.push({
          type: 'heading',
          level,
          children: parseLatexInline(balanced.content.trim()),
        })
        cursor = balanced.endIdx + 1
        continue
      }
    }

    // 5. Check for Environments (\begin{...} ... \end{...})
    if (input.slice(cursor).startsWith('\\begin{')) {
      const env = extractEnvironment(input, cursor)
      if (env) {
        const name = env.envName
        const content = env.content.trim()

        if (name === 'abstract') {
          blocks.push({
            type: 'heading',
            level: 2,
            children: [{ type: 'text', value: 'Abstract' }],
          })
          const paras = content
            .split(/\n\s*\n/)
            .map((p) => p.trim())
            .filter(Boolean)
            .map((p) => ({
              type: 'paragraph' as const,
              children: parseLatexInline(p),
            }))
          blocks.push({
            type: 'blockquote',
            children: paras.length > 0 ? paras : [{ type: 'paragraph', children: [{ type: 'text', value: '' }] }],
          })
          cursor = env.endIndex
          continue
        }

        if (name === 'thebibliography') {
          blocks.push({
            type: 'heading',
            level: 2,
            children: [{ type: 'text', value: 'References' }],
          })
          const bibItems = parseBibliographyContent(content)
          if (bibItems.length > 0) {
            blocks.push({
              type: 'list',
              ordered: true,
              items: bibItems,
            })
          }
          cursor = env.endIndex
          continue
        }

        if (/^(equation|align|gather|multline)\*?$/.test(name)) {
          const cleanedMath = content.replace(/\\label\{[^}]*\}/g, '').trim()
          blocks.push({
            type: 'mathBlock',
            value: cleanedMath,
          })
          cursor = env.endIndex
          continue
        }

        if (name === 'itemize' || name === 'enumerate') {
          const ordered = name === 'enumerate'
          const items = parseLatexListContent(content)
          blocks.push({
            type: 'list',
            ordered,
            items,
          })
          cursor = env.endIndex
          continue
        }

        if (name === 'tabular' || name === 'tabular*') {
          const tableNode = parseLatexTabular(content)
          if (tableNode) {
            blocks.push(tableNode)
          }
          cursor = env.endIndex
          continue
        }

        if (name === 'table' || name === 'table*') {
          const captionMatch = content.match(/\\caption\{([^}]+)\}/)
          if (captionMatch) {
            blocks.push({
              type: 'paragraph',
              children: [
                { type: 'strong', children: [{ type: 'text', value: 'Table: ' }] },
                ...parseLatexInline(captionMatch[1]),
              ],
            })
          }
          const tabStart = content.indexOf('\\begin{tabular')
          if (tabStart !== -1) {
            const innerTab = extractEnvironment(content, tabStart)
            if (innerTab) {
              const tableNode = parseLatexTabular(innerTab.content)
              if (tableNode) blocks.push(tableNode)
            }
          }
          cursor = env.endIndex
          continue
        }

        if (name === 'figure' || name === 'figure*') {
          const captionMatch = content.match(/\\caption\{([^}]+)\}/)
          const imgMatch = content.match(/\\includegraphics(?:\[[^\]]*\])?\{([^}]+)\}/)
          if (imgMatch) {
            blocks.push({
              type: 'paragraph',
              children: [
                {
                  type: 'image',
                  url: imgMatch[1].trim(),
                  alt: captionMatch ? captionMatch[1].trim() : 'Figure',
                },
              ],
            })
          }
          if (captionMatch) {
            blocks.push({
              type: 'paragraph',
              children: [
                { type: 'strong', children: [{ type: 'text', value: 'Figure: ' }] },
                ...parseLatexInline(captionMatch[1]),
              ],
            })
          }
          cursor = env.endIndex
          continue
        }

        if (name === 'lstlisting' || name === 'verbatim') {
          blocks.push({
            type: 'codeBlock',
            language: 'text',
            value: content,
          })
          cursor = env.endIndex
          continue
        }

        if (name === 'quote' || name === 'quotation') {
          const innerBlocks = parseLatexBodyBlocks(content)
          blocks.push({
            type: 'blockquote',
            children:
              innerBlocks.length > 0
                ? innerBlocks
                : [{ type: 'paragraph', children: [{ type: 'text', value: '' }] }],
          })
          cursor = env.endIndex
          continue
        }

        // Unrecognized or container environments (center, minipage, etc.)
        const innerBlocks = parseLatexBodyBlocks(content)
        blocks.push(...innerBlocks)
        cursor = env.endIndex
        continue
      }
    }

    // 6. Check for Display Math $$...$$
    if (input.startsWith('$$', cursor)) {
      const endIdx = input.indexOf('$$', cursor + 2)
      if (endIdx !== -1) {
        blocks.push({
          type: 'mathBlock',
          value: input.slice(cursor + 2, endIdx).trim(),
        })
        cursor = endIdx + 2
        continue
      }
    }

    // 7. Check for Display Math \[...\]
    if (input.startsWith('\\[', cursor)) {
      const endIdx = input.indexOf('\\]', cursor + 2)
      if (endIdx !== -1) {
        blocks.push({
          type: 'mathBlock',
          value: input.slice(cursor + 2, endIdx).trim(),
        })
        cursor = endIdx + 2
        continue
      }
    }

    // 8. Horizontal Rules (\hrule, \hrulefill, \rule{...}{...})
    const ruleMatch = input.slice(cursor).match(/^\\(hrule|hrulefill|noindent\\rule\{[^}]*\}\{[^}]*\})/)
    if (ruleMatch) {
      blocks.push({ type: 'thematicBreak' })
      cursor += ruleMatch[0].length
      continue
    }

    // 9. Modular includes (\input{...} or \include{...})
    const incMatch = input.slice(cursor).match(/^\\(input|include)\{([^}]+)\}/)
    if (incMatch) {
      const rawName = incMatch[2].replace(/\.tex$/, '').trim()
      const formattedTitle = rawName
        .split(/[_\-/]+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
      blocks.push({
        type: 'heading',
        level: 2,
        children: [{ type: 'text', value: formattedTitle }],
      })
      blocks.push({
        type: 'paragraph',
        children: [{ type: 'emphasis', children: [{ type: 'text', value: `[Module: ${rawName}.tex]` }] }],
      })
      cursor += incMatch[0].length
      continue
    }

    // 10. TOC and Document indices
    const tocMatch = input.slice(cursor).match(/^\\(tableofcontents|listoftables|listoffigures)\b/)
    if (tocMatch) {
      const label =
        tocMatch[1] === 'tableofcontents'
          ? 'Table of Contents'
          : tocMatch[1] === 'listoftables'
          ? 'List of Tables'
          : 'List of Figures'
      blocks.push({
        type: 'heading',
        level: 2,
        children: [{ type: 'text', value: label }],
      })
      blocks.push({
        type: 'paragraph',
        children: [
          {
            type: 'emphasis',
            children: [
              {
                type: 'text',
                value: '(Document index automatically generated in compiled PDF/Word output)',
              },
            ],
          },
        ],
      })
      cursor += tocMatch[0].length
      continue
    }

    // 11. Regular Paragraph text: scan ahead until the next block delimiter
    const remaining = input.slice(cursor)
    const delimMatch = remaining.match(
      /\n\s*(\n|\\(?:part|chapter|section|subsection|subsubsection|paragraph|cvsection|cvsubsection)\*?\s*\{|\\begin\{|\$\$|\\\[|###\s+|\\(?:tableofcontents|listoftables|listoffigures|input|include)\b|\\(?:hrule|hrulefill)\b|\\(?:pagestyle|thispagestyle|pagenumbering)\{[^}]*\}|\\(?:vspace|hspace)\*?\{[^}]*\})/
    )
    const paraEnd = delimMatch && delimMatch.index !== undefined ? cursor + delimMatch.index : input.length
    let paraText = input.slice(cursor, paraEnd).trim()
    cursor = paraEnd

    paraText = paraText
      .replace(/\\\\(?:\[[^\]]*\])?\s*$/, '')
      .replace(/^\\small\{([\s\S]*?)\}$/, '$1')
      .trim()

    // Strip outer balanced braces e.g. {Some text...} from stripped font-size wrappers
    if (paraText.startsWith('{') && paraText.endsWith('}')) {
      const balanced = extractBalancedBraces(paraText, 1)
      if (balanced && balanced.endIdx === paraText.length - 1) {
        paraText = balanced.content.trim()
      }
    }

    // Normalize lines to avoid 4-space markdown code block indentation
    const normalizedLines = paraText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .join('\n')

    if (normalizedLines) {
      blocks.push({
        type: 'paragraph',
        children: parseLatexInline(normalizedLines),
      })
    }
  }

  return blocks
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
  const docDate = dateLines.length > 0 ? dateLines[0] : undefined

  // Strip comments using negative lookbehind so escaped \% and percentages (e.g. 100%, 99.5%) are preserved
  let body = cleanedContent.replace(/(?<!\\)(?<!\d\s*)%.*$/gm, '')

  // Extract body between \begin{document} and \end{document} if present
  if (body.includes('\\begin{document}')) {
    const docMatch = body.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/)
    if (docMatch) body = docMatch[1]
  }

  // Preprocess FontAwesome icons to universal emojis
  body = body
    .replace(/\\faMapMarker\*?~?/g, '📍 ')
    .replace(/\\faPhone\*?~?/g, '📞 ')
    .replace(/\\faEnvelope\*?~?/g, '✉️ ')
    .replace(/\\faGlobe\*?~?/g, '🌐 ')
    .replace(/\\faGithub\*?~?/g, '🐙 ')
    .replace(/\\faLinkedin\*?~?/g, '💼 ')
    .replace(/\\faHeadphones\*?~?/g, '🎧 ')
    .replace(/\\faBookOpen\*?~?/g, '📖 ')
    .replace(/\\faLaptopCode\*?~?/g, '💻 ')
    .replace(/\\faGraduationCap\*?~?/g, '🎓 ')
    .replace(/\\faBriefcase\*?~?/g, '💼 ')
    .replace(/\\faExternalLink\*?~?/g, '🔗 ')
    .replace(/\\fa[A-Z][a-zA-Z0-9]*\*?~?/g, '')

  // Replace dimensioned line breaks (e.g. \\[4pt], \\[2pt]) with standard newlines
  body = body.replace(/\\{1,2}\s*\[\s*-?[\d.]+\s*(?:pt|mm|cm|in|ex|em)?\s*\]/g, '\n')

  // Strip layout commands that should not leak into content
  body = body
    .replace(/\\(pagestyle|thispagestyle|pagenumbering)\{[^}]*\}/g, '')
    .replace(/\\(vspace|hspace)\*?\{[^}]*\}/g, '')
    .replace(/\\(newpage|clearpage|bigskip|medskip|smallskip|onehalfspacing|doublespacing|singlespacing)\b/g, '')
    .replace(/\\(hfill|vfill)\b/g, ' · ')
    .replace(/\\noindent\b/g, '')

  // Expand ModernCV contact info macros
  body = body
    .replace(/\\email\{([^}]+)\}/g, '✉️ [$1](mailto:$1)')
    .replace(/\\phone\*?\{([^}]+)\}/g, '📞 $1')
    .replace(/\\mobile\*?\{([^}]+)\}/g, '📞 $1')
    .replace(/\\homepage\{([^}]+)\}/g, '🌐 [$1](https://$1)')
    .replace(/\\github\{([^}]+)\}/g, '🐙 [$1](https://github.com/$1)')
    .replace(/\\linkedin\{([^}]+)\}/g, '💼 [$1](https://linkedin.com/in/$1)')

  // Expand ModernCV macros: \cventry, \cvitem, \cvlistitem, \cvdoubleitem
  while (true) {
    const idx = body.indexOf('\\cventry')
    if (idx === -1) break
    const res = extractNBracedArgs(body, idx + 8, 6)
    if (!res) {
      const res5 = extractNBracedArgs(body, idx + 8, 5)
      if (!res5) break
      const [years, degree, inst, city, grade] = res5.args
      const replacement = `\n\n### ${degree.trim()} — *${inst.trim()}* *(${years.trim()})*\n*${city.trim()}* ${
        grade.trim() ? `· ${grade.trim()}` : ''
      }\n\n`
      body = body.slice(0, idx) + replacement + body.slice(res5.endIdx)
      continue
    }
    const [years, degree, inst, city, grade, desc] = res.args
    const replacement = `\n\n### ${degree.trim()} — *${inst.trim()}* *(${years.trim()})*\n*${city.trim()}* ${
      grade.trim() ? `· ${grade.trim()}` : ''
    }\n\n${desc.trim()}\n\n`
    body = body.slice(0, idx) + replacement + body.slice(res.endIdx)
  }

  while (true) {
    const idx = body.indexOf('\\cvitem')
    if (idx === -1) break
    const res = extractNBracedArgs(body, idx + 7, 2)
    if (!res) break
    const [label, desc] = res.args
    const replacement = `\n\n**${label.trim()}**: ${desc.trim()}\n\n`
    body = body.slice(0, idx) + replacement + body.slice(res.endIdx)
  }

  while (true) {
    const idx = body.indexOf('\\cvdoubleitem')
    if (idx === -1) break
    const res = extractNBracedArgs(body, idx + 13, 4)
    if (!res) break
    const [l1, t1, l2, t2] = res.args
    const replacement = `\n\n**${l1.trim()}**: ${t1.trim()} · **${l2.trim()}**: ${t2.trim()}\n\n`
    body = body.slice(0, idx) + replacement + body.slice(res.endIdx)
  }

  while (true) {
    const idx = body.indexOf('\\cvlistitem')
    if (idx === -1) break
    const res = extractNBracedArgs(body, idx + 11, 1)
    if (!res) break
    const [item] = res.args
    const replacement = `\n\\item ${item.trim()}\n`
    body = body.slice(0, idx) + replacement + body.slice(res.endIdx)
  }

  // Expand Resume/CV custom macros with balanced brace arguments
  while (true) {
    const idx = body.indexOf('\\resumeSubheading')
    if (idx === -1) break
    const res = extractNBracedArgs(body, idx + 17, 4)
    if (!res) break
    const [p1, p2, p3, p4] = res.args
    const cleanP1 = p1.replace(/\s+/g, ' ').replace(/--/g, '–').trim()
    const cleanP2 = p2.replace(/\s+/g, ' ').replace(/--/g, '–').trim()
    const cleanP3 = p3.replace(/\s*\$\|\$\s*/g, ' | ').replace(/\s*\$\\\|\$\s*/g, ' | ').replace(/\s+/g, ' ').replace(/--/g, '–').trim()
    const cleanP4 = p4.replace(/\s+/g, ' ').replace(/--/g, '–').trim()
    const replacement = `\n\n### ${cleanP1} — *${cleanP2}* *(${cleanP4})*\n*${cleanP3}*\n\n`
    body = body.slice(0, idx) + replacement + body.slice(res.endIdx)
  }

  while (true) {
    const idx = body.indexOf('\\resumeProjectHeading')
    if (idx === -1) break
    const res = extractNBracedArgs(body, idx + 21, 2)
    if (!res) break
    const [p1, p2] = res.args
    const cleanP1 = p1.replace(/\s*\$\|\$\s*/g, ' | ').replace(/\s*\$\\\|\$\s*/g, ' | ').replace(/\s+/g, ' ').replace(/--/g, '–').trim()
    const cleanP2 = p2.replace(/\s+/g, ' ').replace(/--/g, '–').trim()
    const replacement = `\n\n### ${cleanP1} *(${cleanP2})*\n\n`
    body = body.slice(0, idx) + replacement + body.slice(res.endIdx)
  }

  // Replace resume list delimiters FIRST to prevent eating \resumeItemListStart
  body = body
    .replace(/\\resumeSubHeadingListStart\b/g, '')
    .replace(/\\resumeSubHeadingListEnd\b/g, '')
    .replace(/\\resumeItemListStart\b/g, '\n\\begin{itemize}\n')
    .replace(/\\resumeItemListEnd\b/g, '\n\\end{itemize}\n')

  // Expand \resumeItem{...} using regex to match command directly followed by {
  while (true) {
    const match = body.match(/\\resumeItem\s*\{/)
    if (!match || match.index === undefined) break
    const idx = match.index
    const openBrace = match.index + match[0].length - 1
    const res = extractNBracedArgs(body, openBrace, 1)
    if (!res) break
    const [p1] = res.args
    const replacement = `\n\\item ${p1.trim()}\n`
    body = body.slice(0, idx) + replacement + body.slice(res.endIdx)
  }

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
    const bMatch = rawHeader.match(/\\(textbf|Huge|huge|LARGE|Large)\s*\{/)
    let candidateName = ''
    let withoutName = rawHeader

    if (bMatch && bMatch.index !== undefined) {
      const openBrace = bMatch.index + bMatch[0].length - 1
      const bRes = extractBalancedBraces(rawHeader, openBrace + 1)
      if (bRes) {
        candidateName = bRes.content
          .replace(/\\(Huge|huge|LARGE|Large|large|normalsize|small|footnotesize|tiny|scshape|bfseries|itshape)/g, '')
          .replace(/\\color\{[^}]+\}/g, '')
          .replace(/[\\{}]/g, '')
          .trim()
        withoutName = rawHeader.slice(0, bMatch.index) + rawHeader.slice(bRes.endIdx + 1)
      }
    }

    if (candidateName) {
      if (!docTitle) docTitle = candidateName

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
      .replace(/\\{1,2}\s*\[\s*-?[\d.]+\s*(?:pt|mm|cm|in|ex|em)?\s*\]/g, '\n')
      .split(/\\\\|\n\s*\n/)
      .map((l) => l.replace(/\s*\n\s*/g, ' ').replace(/\s*~?\|~?\s*/g, ' · ').trim())
      .filter(Boolean)

    for (const line of contactLines) {
      children.push({
        type: 'paragraph',
        align: 'center',
        children: parseLatexInline(line),
      })
    }

    children.push({
      type: 'thematicBreak',
    })

    // Remove the center header from body so it is not processed twice
    body = body.replace(centerHeaderMatch[0], '')
  }

  // 3. Parse Body Blocks sequentially with zero environment severance
  children.push(...parseLatexBodyBlocks(body))

  const stats = computeDocumentStats(children)

  return {
    type: 'document',
    version: 1,
    metadata: {
      title: docTitle,
      author: docAuthor,
      date: docDate,
      createdAt: new Date().toISOString(),
      sourceFormat: 'latex',
    },
    children,
    stats,
  }
}

