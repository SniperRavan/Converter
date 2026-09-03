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
          if (
            splitPositions[0] <= 3 &&
            finalCells.length > 1 &&
            tableLines.every((l) => /^\s*[│|┃║┌├]/.test(l))
          ) {
            finalCells = finalCells.slice(1)
          }
          if (tableLines.every((l) => /[│|┃║┐┤]\s*$/.test(l))) {
            if (finalCells[finalCells.length - 1] === '') finalCells.pop()
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
 * Main normalization pipeline applied to text before markdown parsing.
 */
export function normalizeUniversalInput(rawText: string): string {
  if (!rawText) return ''
  let text = rawText

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

  // 6. Fix unclosed code fences at the end of LLM output
  const codeBlockMatches = text.match(/```/g)
  if (codeBlockMatches && codeBlockMatches.length % 2 !== 0) {
    text += '\n```\n'
  }

  // 7. Unicode and ASCII Box Tables -> GFM Pipe Tables
  text = normalizeBoxAndUnicodeTables(text)

  // 8. Convert HTML tables to Markdown tables if present
  text = text.replace(/<table[\s\S]*?<\/table>/gi, (htmlTable) => {
    try {
      const rows: string[][] = []
      const rowMatches = htmlTable.match(/<tr[\s\S]*?<\/tr>/gi) || []

      for (const rowHtml of rowMatches) {
        const cells: string[] = []
        const cellMatches = rowHtml.match(/<(th|td)[\s\S]*?<\/\1>/gi) || []
        for (const cellHtml of cellMatches) {
          const cleanText = cellHtml
            .replace(/<(th|td)[^>]*>/gi, '')
            .replace(/<\/(th|td)>/gi, '')
            .replace(/<[^>]+>/g, '')
            .trim()
          cells.push(cleanText)
        }
        if (cells.length > 0) rows.push(cells)
      }

      if (rows.length > 0) {
        const header = '| ' + rows[0].join(' | ') + ' |'
        const divider = '| ' + rows[0].map(() => '---').join(' | ') + ' |'
        const bodyRows = rows.slice(1).map((r) => '| ' + r.join(' | ') + ' |')
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
