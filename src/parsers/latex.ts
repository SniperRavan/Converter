import type { NormalizedDocument, BlockNode, InlineNode } from '../core/types'
import { computeDocumentStats } from '../core/stats'

/**
 * Parses LaTeX documents into the unified NormalizedDocument AST
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

  // Extract title if present
  const titleMatch = latexContent.match(/\\title\{([^}]+)\}/)
  const title = titleMatch ? titleMatch[1].trim() : undefined

  // Strip preamble and comments
  let body = latexContent.replace(/%.*$/gm, '')
  if (body.includes('\\begin{document}')) {
    const docMatch = body.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/)
    if (docMatch) body = docMatch[1]
  }

  const children: BlockNode[] = []

  function parseLatexInline(text: string): InlineNode[] {
    const inlines: InlineNode[] = []
    let cursor = text

    // Clean inline formatting
    cursor = cursor.replace(/\\textbf\{([^}]+)\}/g, '@@BOLD_$1@@')
    cursor = cursor.replace(/\\textit\{([^}]+)\}/g, '@@ITALIC_$1@@')
    cursor = cursor.replace(/\\texttt\{([^}]+)\}/g, '@@CODE_$1@@')

    const tokens = cursor.split(/(@@BOLD_[^@]+@@|@@ITALIC_[^@]+@@|@@CODE_[^@]+@@|\$[^\$]+\$)/)

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
      } else if (token.startsWith('$') && token.endsWith('$')) {
        inlines.push({ type: 'inlineMath', value: token.slice(1, -1) })
      } else {
        inlines.push({ type: 'text', value: token })
      }
    }

    return inlines.length > 0 ? inlines : [{ type: 'text', value: text }]
  }

  // Split into raw blocks by double newlines or environment blocks
  const blocks = body.split(/\n\s*\n/)

  for (const block of blocks) {
    const trimmed = block.trim()
    if (!trimmed) continue

    // Section headings
    const sectionMatch = trimmed.match(/^\\(section|subsection|subsubsection)\*?\{([^}]+)\}/)
    if (sectionMatch) {
      const level = (sectionMatch[1] === 'section' ? 1 : sectionMatch[1] === 'subsection' ? 2 : 3) as 1 | 2 | 3
      children.push({
        type: 'heading',
        level,
        children: [{ type: 'text', value: sectionMatch[2] }],
      })
      continue
    }

    // Equations
    const eqMatch = trimmed.match(/\\begin\{(equation|align|gather)\*?\}([\s\S]*?)\\end\{\1\*?\}/)
    if (eqMatch) {
      children.push({
        type: 'mathBlock',
        value: eqMatch[2].trim(),
      })
      continue
    }

    // Display math with $$
    if (trimmed.startsWith('$$') && trimmed.endsWith('$$')) {
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

    // Default paragraph
    children.push({
      type: 'paragraph',
      children: parseLatexInline(trimmed),
    })
  }

  const stats = computeDocumentStats(children)

  return {
    type: 'document',
    version: 1,
    metadata: {
      title,
      createdAt: new Date().toISOString(),
      sourceFormat: 'latex',
    },
    children,
    stats,
  }
}
