import type {
  NormalizedDocument,
  BlockNode,
  InlineNode,
  TableCellNode,
  TableRowNode,
} from '../core/types'
import { computeDocumentStats } from '../core/stats'

/**
 * Parses raw HTML into the unified NormalizedDocument AST
 */
export function parseHtml(htmlContent: string): NormalizedDocument {
  if (typeof window === 'undefined' || !htmlContent.trim()) {
    return {
      type: 'document',
      version: 1,
      metadata: {
        createdAt: new Date().toISOString(),
        sourceFormat: 'html',
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

  const parser = new DOMParser()
  const doc = parser.parseFromString(htmlContent, 'text/html')
  const body = doc.body
  const children: BlockNode[] = []

  function parseInline(node: Node): InlineNode[] {
    const inlines: InlineNode[] = []

    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent || ''
        if (text) {
          inlines.push({ type: 'text', value: text })
        }
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement
        const tag = el.tagName.toLowerCase()

        if (tag === 'strong' || tag === 'b') {
          inlines.push({ type: 'strong', children: parseInline(el) })
        } else if (tag === 'em' || tag === 'i') {
          inlines.push({ type: 'emphasis', children: parseInline(el) })
        } else if (tag === 's' || tag === 'del' || tag === 'strike') {
          inlines.push({ type: 'strikethrough', children: parseInline(el) })
        } else if (tag === 'code') {
          inlines.push({ type: 'inlineCode', value: el.textContent || '' })
        } else if (tag === 'br') {
          inlines.push({ type: 'text', value: ' ' })
        } else if (el.classList?.contains('katex') || el.querySelector('.katex-mathml')) {
          const annotation = el.querySelector('annotation[encoding*="tex"]') || el.querySelector('annotation')
          if (annotation && annotation.textContent?.trim()) {
            inlines.push({
              type: 'inlineMath',
              value: annotation.textContent.trim(),
              source: `$${annotation.textContent.trim()}$`,
            })
            continue
          }
          inlines.push(...parseInline(el))
        } else if (tag === 'math') {
          const annotation = el.querySelector('annotation[encoding*="tex"]') || el.querySelector('annotation')
          const value = annotation?.textContent?.trim() || el.getAttribute('data-math') || el.textContent?.trim() || ''
          if (value) {
            inlines.push({
              type: 'inlineMath',
              value,
              source: `$${value}$`,
            })
          }
        } else if (tag === 'img' && (/latex-formula/i.test(el.className) || /codecogs\.com/i.test(el.getAttribute('src') || ''))) {
          const formula = el.getAttribute('data-latex') || el.getAttribute('alt') || ''
          if (formula) {
            inlines.push({
              type: 'inlineMath',
              value: formula,
              source: `$${formula}$`,
            })
          }
        } else if (tag === 'a') {
          inlines.push({
            type: 'link',
            url: el.getAttribute('href') || '#',
            title: el.getAttribute('title') || undefined,
            children: parseInline(el),
          })
        } else if (tag === 'img') {
          inlines.push({
            type: 'image',
            url: el.getAttribute('src') || '',
            alt: el.getAttribute('alt') || '',
            title: el.getAttribute('title') || undefined,
          })
        } else if (tag === 'br') {
          inlines.push({ type: 'text', value: '\n' })
        } else {
          inlines.push(...parseInline(el))
        }
      }
    }

    return inlines
  }

  for (const child of Array.from(body.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = (child.textContent || '').trim()
      if (!text) continue
      if (text === '---' || text === '***' || text === '___') {
        children.push({ type: 'thematicBreak' })
      } else if (/^#{1,6}\s+\S+/.test(text)) {
        const hashes = text.match(/^(#{1,6})\s+/)?.[1] || '#'
        const level = hashes.length as 1 | 2 | 3 | 4 | 5 | 6
        const headingText = text.substring(hashes.length).trim()
        children.push({
          type: 'heading',
          level,
          children: [{ type: 'text', value: headingText }],
        })
      } else {
        children.push({
          type: 'paragraph',
          children: [{ type: 'text', value: text }],
        })
      }
      continue
    }

    if (child.nodeType !== Node.ELEMENT_NODE) continue

    const el = child as HTMLElement
    const tag = el.tagName.toLowerCase()

    if (
      el.classList?.contains('math-block') ||
      el.classList?.contains('katex-display') ||
      (tag === 'math' && el.getAttribute('display') === 'block')
    ) {
      const annotation = el.querySelector('annotation[encoding*="tex"]') || el.querySelector('annotation')
      const value = annotation?.textContent?.trim() || el.getAttribute('data-math') || el.textContent?.trim() || ''
      if (value) {
        children.push({
          type: 'mathBlock',
          value,
          source: `$$\n${value}\n$$`,
        })
        continue
      }
    }

    const singleFormulaImg = el.querySelectorAll('img.latex-formula, img[src*="codecogs.com"]')
    if (tag === 'p' && singleFormulaImg.length === 1 && el.textContent?.trim() === '') {
      const img = singleFormulaImg[0] as HTMLImageElement
      const formula = img.getAttribute('data-latex') || img.getAttribute('alt') || ''
      if (formula) {
        children.push({
          type: 'mathBlock',
          value: formula,
          source: `$$\n${formula}\n$$`,
        })
        continue
      }
    }

    if (/^h[1-6]$/.test(tag)) {
      const level = parseInt(tag[1], 10) as 1 | 2 | 3 | 4 | 5 | 6
      children.push({
        type: 'heading',
        level,
        children: parseInline(el),
      })
    } else if (tag === 'p') {
      children.push({
        type: 'paragraph',
        children: parseInline(el),
      })
    } else if (tag === 'pre') {
      const codeEl = el.querySelector('code')
      const codeText = (codeEl ? codeEl.textContent : el.textContent) || ''
      const langClass = codeEl?.className.match(/language-(\w+)/)
      children.push({
        type: 'codeBlock',
        language: langClass ? langClass[1] : 'text',
        value: codeText.replace(/\n$/, ''),
      })
    } else if (tag === 'blockquote') {
      children.push({
        type: 'blockquote',
        children: [
          {
            type: 'paragraph',
            children: parseInline(el),
          },
        ],
      })
    } else if (tag === 'ul' || tag === 'ol') {
      const ordered = tag === 'ol'
      const items = Array.from(el.querySelectorAll(':scope > li')).map((li) => ({
        type: 'listItem' as const,
        children: [
          {
            type: 'paragraph' as const,
            children: parseInline(li),
          },
        ],
      }))
      children.push({
        type: 'list',
        ordered,
        items,
      })
    } else if (tag === 'table') {
      const headerThs = Array.from(el.querySelectorAll('thead tr th, tr:first-child th'))
      let headers: TableCellNode[] = headerThs.map((th) => ({
        type: 'tableCell',
        children: parseInline(th),
      }))

      let rows: TableRowNode[] = []
      const bodyTrs = Array.from(el.querySelectorAll('tbody tr, tr'))

      for (const tr of bodyTrs) {
        if (headerThs.length > 0 && tr.querySelector('th')) continue
        const cells: TableCellNode[] = Array.from(tr.querySelectorAll('td')).map((td) => ({
          type: 'tableCell',
          children: parseInline(td),
        }))
        if (cells.length > 0) {
          rows.push({ type: 'tableRow', cells })
        }
      }

      // If no <th> tags existed, promote the first row to become the table header
      if (headers.length === 0 && rows.length > 0) {
        headers = rows[0].cells
        rows = rows.slice(1)
      }

      children.push({
        type: 'table',
        headers,
        rows,
        alignments: (headers.length > 0 ? headers : rows[0]?.cells || []).map(() => null),
      })
    } else if (tag === 'hr') {
      children.push({
        type: 'thematicBreak',
      })
    } else {
      const inlines = parseInline(el)
      if (inlines.length > 0) {
        children.push({
          type: 'paragraph',
          children: inlines,
        })
      }
    }
  }

  const title = doc.title || undefined
  const stats = computeDocumentStats(children)

  return {
    type: 'document',
    version: 1,
    metadata: {
      title,
      createdAt: new Date().toISOString(),
      sourceFormat: 'html',
    },
    children,
    stats,
  }
}
