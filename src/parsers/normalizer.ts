/**
 * Universal text normalizer for mixed LLM streaming outputs, terminal tables,
 * Unicode box drawing, checklists, and non-standard markdown delimiters.
 */
import { SUPERSCRIPT_MAP, SUBSCRIPT_MAP } from '../utils/mathUnicode'

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
 * Ensures clean spacing around inline math $...$ when adjacent to alphanumeric text
 * (e.g. "Markdown $\rightarrow$AST$\rightarrow$" -> "Markdown $\rightarrow$ AST $\rightarrow$").
 */
function fixMathSurroundingSpacing(text: string): string {
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

    let processed = ''
    let i = 0
    while (i < line.length) {
      if (line[i] === '`') {
        const endTick = line.indexOf('`', i + 1)
        if (endTick !== -1) {
          processed += line.slice(i, endTick + 1)
          i = endTick + 1
          continue
        }
      }

      if (line[i] === '$' && line[i + 1] === '$') {
        const endDollar = line.indexOf('$$', i + 2)
        if (endDollar !== -1) {
          processed += line.slice(i, endDollar + 2)
          i = endDollar + 2
          continue
        }
      }

      if (line[i] === '$' && (i === 0 || line[i - 1] !== '\\') && line[i + 1] !== '$') {
        let end = i + 1
        while (end < line.length) {
          if (line[end] === '$' && line[end - 1] !== '\\' && line[end + 1] !== '$') break
          end++
        }
        if (end < line.length && line[end] === '$') {
          const math = line.slice(i + 1, end)
          if (math.trim() && !math.startsWith(' ') && !math.endsWith(' ')) {
            if (processed.length > 0 && /[a-zA-Z0-9]/.test(processed[processed.length - 1])) {
              processed += ' '
            }
            processed += '$' + math + '$'
            if (end + 1 < line.length && /[a-zA-Z0-9]/.test(line[end + 1])) {
              processed += ' '
            }
            i = end + 1
            continue
          }
        }
      }

      processed += line[i]
      i++
    }
    result.push(processed)
  }
  return result.join('\n')
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
    const isCodeFencePlaceholder = /^@@FENCE_STASH_\d+@@$/.test(stripped)
    const isFence = stripped.startsWith('```') || stripped.startsWith('~~~') || isCodeFencePlaceholder

    if (isFence) {
      if (!inCodeBlock && result.length > 0 && result[result.length - 1].trim() !== '') {
        result.push('')
      }
      if (!isCodeFencePlaceholder) {
        inCodeBlock = !inCodeBlock
      }
      result.push(line)
      if (isCodeFencePlaceholder && i + 1 < lines.length && lines[i + 1].trim() !== '') {
        result.push('')
      }
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
      } else {
        // Standalone heading-like title or bold label preceding paragraph text without a blank line
        const prevWords = prevLine.split(/\s+/)
        const isShortTitle =
          prevWords.length <= 5 &&
          prevLine.length <= 45 &&
          /^[A-Z0-9]/.test(prevLine) &&
          !/^[#>|*\-+•\d.]/.test(prevLine) &&
          !/[.,;:!?'"’”)\]\-—\\/]$/.test(prevLine) &&
          !/\b(a|an|the|in|on|at|to|for|with|of|by|from|and|or|but|as|if|that|which|this|these|those)\s*$/i.test(prevLine) &&
          !/\b(is|are|was|were|will|would|can|could|should|have|has|had|differs|requires|shows|means)\b/i.test(prevLine)

        const isBoldHeading = /^\*\*[^*]{1,50}\*\*:?$/.test(prevLine)

        // A genuine new paragraph following a title MUST start with an uppercase letter, quote, or bracket.
        // Lines starting with a lowercase letter (e.g. "from the previous version...") are soft-wrapped continuations
        // and must NEVER be split.
        const isCurrentParagraph =
          /^[A-Z0-9"“'‘([]/.test(stripped) &&
          !/^[#>|*\-+•\d.]/.test(stripped) &&
          stripped.length >= 25

        if ((isShortTitle || isBoldHeading) && isCurrentParagraph) {
          result.push('')
        }
      }
    }

    result.push(line)
  }

  return result.join('\n')
}

/**
 * Calculates visual column indentation for a line, expanding tabs to 4-column tab stops.
 */
function getLeadingIndent(line: string): number {
  let spaces = 0
  for (let i = 0; i < line.length; i++) {
    if (line[i] === ' ') {
      spaces += 1
    } else if (line[i] === '\t') {
      spaces += 4 - (spaces % 4)
    } else {
      break
    }
  }
  return spaces
}

/**
 * Strips up to `margin` visual columns of indentation from `line`, preserving relative tabs.
 */
function stripIndent(line: string, margin: number): string {
  if (margin <= 0) return line
  let strippedCols = 0
  let i = 0
  while (i < line.length && strippedCols < margin) {
    if (line[i] === ' ') {
      strippedCols += 1
      i++
    } else if (line[i] === '\t') {
      const nextTab = strippedCols + (4 - (strippedCols % 4))
      if (nextTab <= margin) {
        strippedCols = nextTab
        i++
      } else {
        const remainingSpaces = nextTab - margin
        return ' '.repeat(remainingSpaces) + line.slice(i + 1)
      }
    } else {
      break
    }
  }
  return line.slice(i)
}

/**
 * Strips document-level padding (e.g. from terminal or chat transcripts) while preserving
 * block-level nesting (sub-lists, continuation paragraphs) and genuine 4-space indented code blocks.
 *
 * It finds the most common indentation among the first line of each block across the document.
 * Ties favor the smaller value (0), ensuring unpadded documents with loose lists or indented code
 * blocks remain untouched.
 */
export function dedentMarkdown(text: string): string {
  if (!text) return ''

  const lines = text.split('\n')
  const blockIndents: number[] = []
  let activeFence: { char: string; len: number } | null = null
  let isNewBlock = true
  let firstNonBlankIndent: number | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const stripped = line.trim()

    if (stripped.length > 0 && firstNonBlankIndent === null) {
      firstNonBlankIndent = getLeadingIndent(line)
    }

    if (activeFence) {
      const closeRegex = new RegExp('^\\s*' + (activeFence.char === '`' ? '`' : '~') + '{' + activeFence.len + ',}\\s*$')
      if (closeRegex.test(line)) {
        activeFence = null
        isNewBlock = true
      }
      continue
    }

    const fenceMatch = line.match(/^(\s*)(`{3,}|~{3,})/)
    if (fenceMatch) {
      blockIndents.push(getLeadingIndent(line))
      activeFence = { char: fenceMatch[2][0], len: fenceMatch[2].length }
      isNewBlock = false
      continue
    }

    if (stripped.length === 0) {
      isNewBlock = true
      continue
    }

    if (isNewBlock) {
      blockIndents.push(getLeadingIndent(line))
      isNewBlock = false
    }
  }

  if (blockIndents.length === 0) return text

  const freq: Record<number, number> = {}
  for (const ind of blockIndents) {
    freq[ind] = (freq[ind] || 0) + 1
  }

  let margin = 0
  let maxCount = 0

  // Sort indents ascending so ties naturally favor the smaller value
  const sortedIndents = Object.keys(freq).map(Number).sort((a, b) => a - b)
  for (const ind of sortedIndents) {
    if (freq[ind] > maxCount) {
      maxCount = freq[ind]
      margin = ind
    }
  }

  // Cap the margin at the indent of the first non-blank line (real document padding applies to line 1)
  if (firstNonBlankIndent !== null) {
    margin = Math.min(margin, firstNonBlankIndent)
  }

  if (margin === 0) {
    return text
  }

  return lines.map((l) => stripIndent(l, margin)).join('\n')
}

/**
 * Stashes fenced code blocks and inline code spans before normalization passes,
 * and provides a restore function to put them back untouched afterwards.
 */
function stashCode(text: string) {
  const fenceStash: string[] = []
  const inlineStash: string[] = []
  const putFence = (s: string) => `@@FENCE_STASH_${fenceStash.push(s) - 1}@@`
  const putInline = (s: string) => `@@INLINE_STASH_${inlineStash.push(s) - 1}@@`

  const out: string[] = []
  let buf: string[] | null = null
  let activeFence: { char: string; len: number } | null = null

  for (const line of text.split('\n')) {
    if (activeFence) {
      buf!.push(line)
      const closeRegex = new RegExp('^\\s*' + (activeFence.char === '`' ? '`' : '~') + '{' + activeFence.len + ',}\\s*$')
      if (closeRegex.test(line)) {
        out.push(putFence(buf!.join('\n')))
        buf = null
        activeFence = null
      }
      continue
    }

    const fenceMatch = line.match(/^(\s*)(`{3,}|~{3,})/)
    if (fenceMatch) {
      buf = [line]
      activeFence = { char: fenceMatch[2][0], len: fenceMatch[2].length }
      continue
    }

    out.push(line)
  }

  if (buf && activeFence) {
    // Automatically heals unclosed code fence at the end of input
    const closing = activeFence.char.repeat(activeFence.len)
    out.push(putFence([...buf, closing].join('\n')))
  }

  const masked = out.join('\n').replace(/(`+)[^\n]+?\1/g, putInline)
  return {
    masked,
    restore: (s: string) =>
      s
        .replace(/@@FENCE_STASH_(\d+)@@/g, (match, i) => fenceStash[+i] ?? match)
        .replace(/@@INLINE_STASH_(\d+)@@/g, (match, i) => inlineStash[+i] ?? match),
  }
}

/**
 * Main normalization pipeline applied to text before markdown parsing.
 */
export function normalizeUniversalInput(rawText: string): string {
  if (!rawText) return ''
  let text = rawText

  // 0a. Strip common leading indentation (terminal/transcript copies)
  text = dedentMarkdown(text)

  // Stash code blocks and inline code spans so normalization passes do not alter code contents
  const { masked, restore } = stashCode(text)
  text = masked

  // 0b. Strip invisible Unicode zero-width characters (ZWSP, ZWNJ, ZWJ, BOM)
  text = text.replace(/[\u200B-\u200D\uFEFF]/g, '')

  // 0c. Normalize colon-indexed lists (e.g. 0: "...", 1: "...") into standard Markdown ordered lists
  text = text.replace(/^([ \t]*\d+)[:][ \t]+/gm, '$1. ')

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

  // 3b. Normalize spacing between inline math and adjacent alphanumeric words
  // e.g. "final$|\psi\rangle$" -> "final $|\psi\rangle$", "$\hat{H}$governs" -> "$\hat{H}$ governs", "$\rightarrow$AST" -> "$\rightarrow$ AST"
  text = fixMathSurroundingSpacing(text)

  // 3c. Normalize GitHub Flavored Markdown alerts (> [!NOTE])
  text = text.replace(/^>[ \t]*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/gim, (_m, alertType) => {
    return `> [!${alertType.toUpperCase()}]`
  })

  // 3d. Normalize author separator \and into middle dot
  text = text.replace(/([^\n`$])\s*\\and\b\s*([^\n`$])/g, '$1 · $2')

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
      // Preserve HTML layout tables and tables containing block-level markdown, merged cells, or complex nested tags
      if (
        /border\s*=\s*['"]0['"]/i.test(htmlTable) ||
        /cellspacing|cellpadding/i.test(htmlTable) ||
        /rowspan|colspan/i.test(htmlTable) ||
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

  // 9b. Convert HTML callout/note containers (<div style="...border-left...">) into standard markdown blockquotes
  text = text.replace(/<div\b[^>]*border-left[^>]*>([\s\S]*?)<\/div>/gi, (_match, inner) => {
    const lines = inner.trim().split('\n').map((l: string) => l.trim())
    return '\n\n> ' + lines.join('\n> ') + '\n\n'
  })

  // 9c. Unwrap simple div containers
  text = text.replace(/<div\b[^>]*>([\s\S]*?)<\/div>/gi, (_match, inner) => {
    if (/<(table|div)[\s>]/i.test(inner)) return _match
    return '\n\n' + inner.trim() + '\n\n'
  })

  // 9d. Pandoc Smart Typography & Punctuation
  // En-dash between numbers/ranges: 1990--2020 -> 1990–2020, pp. 12--15 -> pp. 12–15
  text = text.replace(/(\b\d+)\s*--\s*(\d+\b)/g, '$1–$2')
  // Em-dash between words: word---word -> word—word
  text = text.replace(/([a-zA-Z0-9)])\s*---\s*([a-zA-Z0-9(])/g, '$1—$2')
  // Ellipses: word... -> word…
  text = text.replace(/([a-zA-Z0-9\u00C0-\u024F])\.\.\.(?!\.)/g, '$1…')

  // 9e. Pandoc Subscripts (~sub~) and Superscripts (^sup^) and HTML <sub> / <sup>
  text = text
    .replace(/<sub\b[^>]*>([\s\S]*?)<\/sub>/gi, (_m, inner) => {
      return inner.split('').map((c: string) => SUBSCRIPT_MAP[c] || c).join('')
    })
    .replace(/<sup\b[^>]*>([\s\S]*?)<\/sup>/gi, (_m, inner) => {
      return inner.split('').map((c: string) => SUPERSCRIPT_MAP[c] || c).join('')
    })
    .replace(/~([a-zA-Z0-9+\-=()]{1,6})~/g, (_m, inner) => {
      return inner.split('').map((c: string) => SUBSCRIPT_MAP[c] || c).join('')
    })
    .replace(/\^([a-zA-Z0-9+\-=()]{1,6})\^/g, (_m, inner) => {
      return inner.split('').map((c: string) => SUPERSCRIPT_MAP[c] || c).join('')
    })

  // Restore original code blocks and inline code spans untouched
  text = restore(text)

  return text
}
