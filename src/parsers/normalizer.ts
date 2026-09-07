/**
 * Universal text normalizer for mixed LLM streaming outputs, terminal tables,
 * Unicode box drawing, checklists, and non-standard markdown delimiters.
 */

/**
 * Normalizes ASCII and Unicode Box Tables (including CLI/terminal multi-line wrapped cells)
 * into standard GitHub Flavored Markdown (GFM) pipe tables.
 */
export function normalizeBoxAndUnicodeTables(text: string): string {
  const lines = text.split('\n')
  const processedLines: string[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const hasPipe = /[│|┃║]/.test(line)
    const isDividerOnly =
      /^[\s─━═=+\-┼┬┴├┤┌┐└┘|│┃║]{4,}$/.test(line) && /[─━═=+\-┼┬┴├┤]/.test(line)

    if (hasPipe || isDividerOnly) {
      const tableLines: string[] = []
      while (i < lines.length) {
        const cur = lines[i]
        const curHasPipe = /[│|┃║]/.test(cur)
        const curIsDivider =
          /^[\s─━═=+\-┼┬┴├┤┌┐└┘|│┃║]{4,}$/.test(cur) && /[─━═=+\-┼┬┴├┤]/.test(cur)
        if (!curHasPipe && !curIsDivider) break
        tableLines.push(cur)
        i++
      }

      // If lines do not contain box-drawing characters or ASCII border lines, it is already a standard GFM table.
      const hasBoxDrawing = tableLines.some((l) => /[┌┐└┘├┤┬┴┼│┃║─━═]/.test(l) || /^\s*\+[-=+]+\+\s*$/.test(l))
      if (!hasBoxDrawing) {
        processedLines.push(...tableLines)
        continue
      }

      // Detect pipe/cross positions across all lines
      const pipePosCount: Record<number, number> = {}
      tableLines.forEach((l) => {
        for (let idx = 0; idx < l.length; idx++) {
          if (/[│|┃║┼+┬┴╪╬]/.test(l[idx])) {
            let matched = false
            for (const pStr of Object.keys(pipePosCount)) {
              const p = parseInt(pStr, 10)
              if (Math.abs(p - idx) <= 1) {
                pipePosCount[p]++
                matched = true
                break
              }
            }
            if (!matched) pipePosCount[idx] = 1
          }
        }
      })

      const minThresh = Math.max(2, Math.floor(tableLines.length * 0.25))
      const splitPositions = Object.keys(pipePosCount)
        .map(Number)
        .filter((pos) => pipePosCount[pos] >= minThresh)
        .sort((a, b) => a - b)

      if (splitPositions.length > 0) {
        const rows: string[][] = []
        for (const tLine of tableLines) {
          if (
            /^[\s─━═=+\-┼┬┴├┤┌┐└┘|│┃║]{4,}$/.test(tLine) &&
            /[─━═=+\-┼┬┴├┤]/.test(tLine)
          ) {
            continue // Skip horizontal separator lines
          }
          const cells: string[] = []
          let prev = 0
          for (const pos of splitPositions) {
            cells.push(tLine.substring(prev, pos).replace(/[│|┃║]/g, '').trim())
            prev = pos + 1
          }
          cells.push(tLine.substring(prev).replace(/[│|┃║]/g, '').trim())

          let finalCells = cells
          if (splitPositions[0] <= 3 && finalCells.length > 1 && finalCells[0] === '') {
            finalCells = finalCells.slice(1)
          }
          if (finalCells.length > 1 && finalCells[finalCells.length - 1] === '') {
            finalCells.pop()
          }

          const nonEmpty = finalCells.filter((c) => c.length > 0)
          if (nonEmpty.length === 0) continue

          // Continuation row check (wrapped cells in terminal tables)
          const isContinuation =
            rows.length > 0 &&
            finalCells[0] === '' &&
            nonEmpty.length > 0 &&
            nonEmpty.length < finalCells.length

          if (isContinuation) {
            const prevRow = rows[rows.length - 1]
            for (let c = 0; c < finalCells.length; c++) {
              if (finalCells[c]) {
                prevRow[c] = (prevRow[c] ? prevRow[c] + ' ' : '') + finalCells[c]
              }
            }
          } else {
            rows.push(finalCells)
          }
        }

        if (rows.length >= 1) {
          const maxCols = Math.max(...rows.map((r) => r.length))
          const padded = rows.map((r) => {
            while (r.length < maxCols) r.push('')
            return r
          })
          processedLines.push('')
          processedLines.push('| ' + padded[0].join(' | ') + ' |')
          processedLines.push('| ' + padded[0].map(() => '---').join(' | ') + ' |')
          for (let r = 1; r < padded.length; r++) {
            processedLines.push('| ' + padded[r].join(' | ') + ' |')
          }
          processedLines.push('')
          continue
        }
      }

      processedLines.push(...tableLines)
    } else {
      processedLines.push(line)
      i++
    }
  }

  return processedLines.join('\n')
}

/**
 * Converts standalone lines with a single '$' into '$$' display math fences (common in LLM outputs).
 */
function fixSingleDollarBlocks(text: string): string {
  const lines = text.split('\n')
  const result: string[] = []
  let inCodeBlock = false

  for (const line of lines) {
    const stripped = line.trim()
    if (stripped.startsWith('```') || stripped.startsWith('~~~')) {
      inCodeBlock = !inCodeBlock
      result.push(line)
      continue
    }
    if (inCodeBlock) {
      result.push(line)
      continue
    }

    if (/^\s*\$\s*$/.test(line)) {
      const indent = line.substring(0, line.indexOf('$'))
      result.push(`${indent}$$`)
    } else {
      result.push(line)
    }
  }

  return result.join('\n')
}

/**
 * Trims extraneous whitespace inside inline math ($  formula  $ -> $formula$).
 */
function fixInlineMathSpaces(text: string): string {
  return text.replace(/(?<!\$)\$(?!\$)[ \t]+([^\n$]+?)[ \t]+(?<!\$)\$(?!\$)/g, '$$$1$')
}

/**
 * Ensures blank line separation before headings, tables, blockquotes, and code blocks
 * when preceded by paragraph text without spacing (common in LLM chatter).
 */
function normalizeElementSeparation(text: string): string {
  const lines = text.split('\n')
  const result: string[] = []
  let inCodeBlock = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const stripped = line.trim()

    if (stripped.startsWith('```') || stripped.startsWith('~~~')) {
      if (!inCodeBlock && result.length > 0 && result[result.length - 1].trim() !== '') {
        result.push('')
      }
      inCodeBlock = !inCodeBlock
      result.push(line)
      continue
    }

    if (inCodeBlock) {
      result.push(line)
      continue
    }

    const prevLine = result.length > 0 ? result[result.length - 1].trim() : ''
    const isHeading = /^#{1,6}\s+/.test(stripped)
    const isTable = stripped.startsWith('|') && stripped.endsWith('|')
    const isQuote = stripped.startsWith('>')

    if (prevLine !== '') {
      const prevIsHeading = /^#{1,6}\s+/.test(prevLine)
      const prevIsTable = prevLine.startsWith('|') && prevLine.endsWith('|')
      const prevIsQuote = prevLine.startsWith('>')

      if (isHeading && !prevIsHeading) {
        result.push('')
      } else if (isTable && !prevIsTable) {
        result.push('')
      } else if (isQuote && !prevIsQuote) {
        result.push('')
      }
    }

    result.push(line)
  }

  return result.join('\n')
}

/**
 * Main normalization pipeline applied to text before markdown parsing.
 */
export function normalizeUniversalInput(rawText: string): string {
  if (!rawText) return ''
  let text = rawText

  // Pre-normalize isolated single $ block fences from LLMs
  text = fixSingleDollarBlocks(text)

  // Pre-normalize inline math whitespace ($ x $ -> $x$)
  text = fixInlineMathSpaces(text)

  // 1. Unicode horizontal rules (──────, ━━━━━━, ══════, ----------------)
  text = text.replace(/^[ \t]*[─━═—]{3,}[ \t]*$/gm, '\n\n---\n\n')

  // 2. Checklists at line start ([✓], [✔], [x], [X], [ ]) -> GFM task lists
  text = text.replace(/^([ \t]*)\[([✓✔xX])\][ \t]+/gm, '$1- [x] ')
  text = text.replace(/^([ \t]*)\[[ \t]\][ \t]+/gm, '$1- [ ] ')

  // 3. Unicode bullets (•, ◦, ▪, ▫, ‣) -> Markdown list markers (- )
  text = text.replace(/^([ \t]*)[•◦▪▫‣][ \t]+/gm, '$1- ')

  // 4. Normalize LaTeX Display Math: \[ ... \] -> $$ ... $$
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, (_match, math) => {
    return `\n\n$$\n${math.trim()}\n$$\n\n`
  })

  // 5. Normalize LaTeX Inline Math: \( ... \) -> $ ... $
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_match, math) => {
    return `$${math.trim()}$`
  })

  // 5b. Normalize LaTeX display environments: \begin{equation}...\end{equation}, \begin{align}...\end{align}, etc.
  text = text.replace(/\\begin\{(equation\*?|align\*?|gather\*?|multline\*?|displaymath)\}([\s\S]*?)\\end\{\1\}/g, (_match, env, math) => {
    const isAligned = env.startsWith('align')
    const isGathered = env.startsWith('gather')
    const inner = isAligned
      ? `\\begin{aligned}${math}\\end{aligned}`
      : isGathered
      ? `\\begin{gathered}${math}\\end{gathered}`
      : math.trim()
    return `\n\n$$\n${inner}\n$$\n\n`
  })

  // 6. Fix unclosed code fences at the end of LLM output
  const codeBlockMatches = text.match(/```/g)
  if (codeBlockMatches && codeBlockMatches.length % 2 !== 0) {
    text += '\n```\n'
  }

  // 7. Unicode and ASCII Box Tables -> GFM Pipe Tables
  text = normalizeBoxAndUnicodeTables(text)

  // 8. Element separation (blank line before headings, tables, quotes, code fences)
  text = normalizeElementSeparation(text)

  // 8. Convert simple HTML data tables to GFM pipe tables (preserving layout tables and block containers)
  text = text.replace(/<table[\s\S]*?<\/table>/gi, (htmlTable) => {
    try {
      // Preserve HTML layout tables and tables containing block-level markdown or complex nested tags
      if (
        /border\s*=\s*['"]0['"]/i.test(htmlTable) ||
        /cellspacing|cellpadding/i.test(htmlTable) ||
        /```|#{1,6}\s+|^\s*>|^\s*\|/m.test(htmlTable) ||
        /<(table|pre|ul|ol|blockquote)[\s>]/i.test(htmlTable)
      ) {
        return htmlTable
      }

      const rows: string[][] = []
      const rowMatches = htmlTable.match(/<tr[\s\S]*?<\/tr>/gi) || []

      for (const rowHtml of rowMatches) {
        const cells: string[] = []
        const cellMatches = rowHtml.match(/<(th|td)[\s\S]*?<\/\1>/gi) || []
        for (const cellHtml of cellMatches) {
          // Check if cell contains multiline block content
          const innerContent = cellHtml.replace(/^<(th|td)[^>]*>|<\/(th|td)>$/gi, '').trim()
          if (innerContent.includes('\n')) {
            // Cannot safely format multiline cell into single-line markdown pipe table
            return htmlTable
          }
          const cleanText = innerContent
            .replace(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)')
            .replace(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*\balt=["']([^"']*)["'][^>]*>/gi, '![$2]($1)')
            .replace(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi, '![]($1)')
            .replace(/<[^>]+>/g, '')
            .replace(/\|/g, '\\|')
            .trim()
          cells.push(cleanText)
        }
        if (cells.length > 0) rows.push(cells)
      }

      if (rows.length > 0) {
        const colCount = Math.max(...rows.map((r) => r.length))
        const paddedRows = rows.map((r) => {
          while (r.length < colCount) r.push('')
          return r
        })
        const header = '| ' + paddedRows[0].join(' | ') + ' |'
        const divider = '| ' + paddedRows[0].map(() => '---').join(' | ') + ' |'
        const bodyRows = paddedRows.slice(1).map((r) => '| ' + r.join(' | ') + ' |')
        return '\n\n' + [header, divider, ...bodyRows].join('\n') + '\n\n'
      }
    } catch {
      // fallback
    }
    return htmlTable
  })

  // 9. Convert inline HTML formatting to Markdown where helpful
  text = text
    .replace(/<b\b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**')
    .replace(/<strong\b[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**')
    .replace(/<i\b[^>]*>([\s\S]*?)<\/i>/gi, '*$1*')
    .replace(/<em\b[^>]*>([\s\S]*?)<\/em>/gi, '*$1*')
    .replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, '`$1`')
    .replace(/<mark\b[^>]*>([\s\S]*?)<\/mark>/gi, '==$1==')
    .replace(/<br\s*\/?>/gi, '\n')

  return text
}
