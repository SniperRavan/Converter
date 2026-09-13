import type {
  NormalizedDocument,
  BlockNode,
  HeadingNode,
  InlineNode,
  TableCellNode,
  TableRowNode,
} from '../core/types'
import { computeDocumentStats } from '../core/stats'
import { SUPERSCRIPT_MAP, SUBSCRIPT_MAP } from '../utils/mathUnicode'

const TEXT_NODE = 3
const ELEMENT_NODE = 1

/**
 * Parses raw HTML into the unified NormalizedDocument AST
 */
export function parseHtml(htmlContent: string): NormalizedDocument {
  const hasDOM = typeof window !== 'undefined' || (typeof globalThis !== 'undefined' && Boolean((globalThis as any).DOMParser))
  if (!hasDOM || !htmlContent.trim()) {
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

  const Parser = typeof DOMParser !== 'undefined'
    ? DOMParser
    : (typeof window !== 'undefined' ? (window as any).DOMParser : (globalThis as any).DOMParser)

  const normalizedHtml = !/<html[\s>]/i.test(htmlContent)
    ? `<html><body>${htmlContent}</body></html>`
    : htmlContent

  const parser = new Parser()
  const doc = parser.parseFromString(normalizedHtml, 'text/html')
  const root = (doc.body && doc.body.childNodes.length > 0) ? doc.body : (doc.documentElement || doc.body || doc)

  function parseInline(node: any): InlineNode[] {
    const inlines: InlineNode[] = []

    for (const child of Array.from(node.childNodes || [])) {
      if ((child as any).nodeType === TEXT_NODE) {
        const text = (child as any).textContent || ''
        if (text) {
          inlines.push({ type: 'text', value: text })
        }
      } else if ((child as any).nodeType === ELEMENT_NODE) {
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
        } else if (tag === 'sup') {
          const txt = el.textContent || ''
          const mapped = txt.split('').map(c => SUPERSCRIPT_MAP[c] || c).join('')
          inlines.push({ type: 'text', value: mapped })
        } else if (tag === 'sub') {
          const txt = el.textContent || ''
          const mapped = txt.split('').map(c => SUBSCRIPT_MAP[c] || c).join('')
          inlines.push({ type: 'text', value: mapped })
        } else if (tag === 'kbd') {
          inlines.push({ type: 'inlineCode', value: el.textContent || '' })
        } else if (tag === 'mark') {
          inlines.push({ type: 'strong', children: parseInline(el) })
        } else if (tag === 'br') {
          inlines.push({ type: 'text', value: '\n' })
        } else {
          inlines.push(...parseInline(el))
        }
      }
    }

    return inlines
  }

  function parseBlockNodes(container: any): BlockNode[] {
    const blocks: BlockNode[] = []

    for (const child of Array.from(container.childNodes || [])) {
      if ((child as any).nodeType === TEXT_NODE) {
        const text = ((child as any).textContent || '').trim()
        if (!text) continue
        if (text === '---' || text === '***' || text === '___') {
          blocks.push({ type: 'thematicBreak' })
        } else if (/^#{1,6}\s+\S+/.test(text)) {
          const hashes = text.match(/^(#{1,6})\s+/)?.[1] || '#'
          const level = hashes.length as 1 | 2 | 3 | 4 | 5 | 6
          const headingText = text.substring(hashes.length).trim()
          blocks.push({
            type: 'heading',
            level,
            children: [{ type: 'text', value: headingText }],
          })
        } else {
          blocks.push({
            type: 'paragraph',
            children: [{ type: 'text', value: text }],
          })
        }
        continue
      }

      if ((child as any).nodeType !== ELEMENT_NODE) continue

      const el = child as HTMLElement
      const tag = el.tagName.toLowerCase()

      // Ignore non-content structural / metadata tags so CSS and JS do not leak into document AST
      if (['style', 'script', 'noscript', 'meta', 'link', 'head'].includes(tag)) {
        continue
      }

      // Handle explicit page breaks
      if (
        el.classList?.contains('page-break') ||
        /page-break-before:\s*always|break-before:\s*page/i.test(el.getAttribute('style') || '')
      ) {
        blocks.push({
          type: 'thematicBreak',
          isPageBreak: true,
        })
        continue
      }

      // Handle standalone SVG diagrams (e.g. TikZ vector SVGs)
      if (tag === 'svg') {
        const svgContent =
          (el as any).outerHTML ||
          (typeof XMLSerializer !== 'undefined' ? new XMLSerializer().serializeToString(el) : '')
        if (svgContent) {
          blocks.push({
            type: 'rawBlock',
            id: el.getAttribute('id') || undefined,
            content: svgContent,
          })
          continue
        }
      }

      // Check for explicit ARIA heading semantics
      const role = el.getAttribute ? el.getAttribute('role') : null
      const ariaLevel = el.getAttribute ? el.getAttribute('aria-level') : null
      if (role === 'heading' || ariaLevel) {
        const parsedLvl = ariaLevel ? parseInt(ariaLevel, 10) : 2
        const level = Math.max(1, Math.min(6, isNaN(parsedLvl) ? 2 : parsedLvl)) as 1 | 2 | 3 | 4 | 5 | 6
        blocks.push({
          type: 'heading',
          level,
          id: el.getAttribute('id') || undefined,
          children: parseInline(el),
        })
        continue
      }

      // Handle figure and figcaption
      if (tag === 'figure') {
        const img = el.querySelector('img')
        const figcaption = el.querySelector('figcaption')
        if (img) {
          const url = img.getAttribute('src') || ''
          const alt = img.getAttribute('alt') || figcaption?.textContent?.trim() || ''
          blocks.push({
            type: 'paragraph',
            id: el.getAttribute('id') || undefined,
            children: [
              {
                type: 'image',
                url,
                alt,
                title: figcaption ? figcaption.textContent?.trim() : undefined,
              },
            ],
          })
        }
        if (figcaption) {
          blocks.push({
            type: 'paragraph',
            children: parseInline(figcaption),
          })
        }
        continue
      }

      // Handle structural containers by recursively parsing their blocks
      const isMathBlock =
        el.classList?.contains('math-block') ||
        el.classList?.contains('katex-display') ||
        (tag === 'math' && el.getAttribute('display') === 'block')

      const blockTags = [
        'article', 'section', 'main', 'div', 'header', 'footer', 'aside', 'form',
        'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'ul', 'ol', 'blockquote',
        'pre', 'figure', 'hr'
      ]

      if (
        !isMathBlock &&
        ['article', 'section', 'main', 'div', 'header', 'footer', 'aside', 'form'].includes(tag)
      ) {
        const styleAttr = el.getAttribute('style') || ''
        const isFlexRow = /display:\s*flex/i.test(styleAttr)
        const childElements = Array.from(el.children || []) as HTMLElement[]
        const hasBlockChildren = childElements.some((c) => blockTags.includes(c.tagName.toLowerCase()))

        // If this is a flex row whose children only contain inline items (like contact rows or hobby rows)
        if (
          isFlexRow &&
          childElements.length > 0 &&
          !childElements.some((c) =>
            Array.from(c.children || []).some((gc: any) => blockTags.includes(gc.tagName?.toLowerCase()))
          )
        ) {
          const rowInlines: InlineNode[] = []
          for (let i = 0; i < childElements.length; i++) {
            if (i > 0) {
              rowInlines.push({ type: 'text', value: ' · ' })
            }
            rowInlines.push(...parseInline(childElements[i]))
          }
          if (rowInlines.length > 0) {
            const alignAttr = el.getAttribute('align') || (el.style?.textAlign as any)
            const align =
              alignAttr && ['left', 'center', 'right', 'justify'].includes(alignAttr) ? alignAttr : undefined
            blocks.push({
              type: 'paragraph',
              id: el.getAttribute('id') || undefined,
              align,
              children: rowInlines,
            })
            continue
          }
        }

        // If the container has NO block children, treat it as a single paragraph (e.g. contact line of spans/links)
        if (!hasBlockChildren) {
          const inlines = parseInline(el)
          if (inlines.length > 0) {
            const alignAttr = el.getAttribute('align') || (el.style?.textAlign as any)
            const align =
              alignAttr && ['left', 'center', 'right', 'justify'].includes(alignAttr) ? alignAttr : undefined
            blocks.push({
              type: 'paragraph',
              id: el.getAttribute('id') || undefined,
              align,
              children: inlines,
            })
            continue
          }
        }

        const innerBlocks = parseBlockNodes(el)
        if (innerBlocks.length > 0) {
          blocks.push(...innerBlocks)
          continue
        }
      }

      if (isMathBlock) {
        const annotation = el.querySelector('annotation[encoding*="tex"]') || el.querySelector('annotation')
        const value = annotation?.textContent?.trim() || el.getAttribute('data-math') || el.textContent?.trim() || ''
        if (value) {
          blocks.push({
            type: 'mathBlock',
            id: el.getAttribute('id') || undefined,
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
          blocks.push({
            type: 'mathBlock',
            value: formula,
            source: `$$\n${formula}\n$$`,
          })
          continue
        }
      }

      if (/^h[1-6]$/.test(tag)) {
        const level = parseInt(tag[1], 10) as 1 | 2 | 3 | 4 | 5 | 6
        blocks.push({
          type: 'heading',
          level,
          id: el.getAttribute('id') || undefined,
          children: parseInline(el),
        })
      } else if (tag === 'p') {
        const text = (el.textContent || '').trim()
        const firstEl = el.firstElementChild
        const isSingleBold =
          firstEl &&
          el.children.length === 1 &&
          (firstEl.tagName.toLowerCase() === 'strong' || firstEl.tagName.toLowerCase() === 'b') &&
          firstEl.textContent?.trim() === text

        const isNumbered = /^(?:chapter\s+\d+|\d+(\.\d+)*\s*[:.]?\s+)/i.test(text)
        if (isSingleBold && (isNumbered || (text.length <= 70 && !/[.!?]$/.test(text)))) {
          const level: 1 | 2 | 3 | 4 | 5 | 6 = isNumbered && /^\d+\.\d+\.\d+/.test(text) ? 3 : (isNumbered && /^\d+\.\d+/.test(text) ? 3 : 2)
          blocks.push({
            type: 'heading',
            level,
            id: el.getAttribute('id') || undefined,
            children: parseInline(firstEl),
          })
          continue
        }

        const alignAttr = el.getAttribute('align') || (el.style?.textAlign as any)
        const align =
          alignAttr && ['left', 'center', 'right', 'justify'].includes(alignAttr) ? alignAttr : undefined
        blocks.push({
          type: 'paragraph',
          id: el.getAttribute('id') || undefined,
          align,
          children: parseInline(el),
        })
      } else if (tag === 'pre') {
        const codeEl = el.querySelector('code')
        const codeText = (codeEl ? codeEl.textContent : el.textContent) || ''
        const langClass = codeEl?.className.match(/language-(\w+)/)
        blocks.push({
          type: 'codeBlock',
          language: langClass ? langClass[1] : 'text',
          value: codeText.replace(/\n$/, ''),
        })
      } else if (tag === 'blockquote') {
        const inner = parseBlockNodes(el)
        blocks.push({
          type: 'blockquote',
          children: inner.length > 0 ? inner : [
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
          id: li.getAttribute('id') || undefined,
          children: [
            {
              type: 'paragraph' as const,
              children: parseInline(li),
            },
          ],
        }))
        blocks.push({
          type: 'list',
          id: el.getAttribute('id') || undefined,
          ordered,
          items,
        })
      } else if (tag === 'dl') {
        const dItems: { type: 'listItem'; id?: string; children: BlockNode[] }[] = []
        const children = Array.from(el.children)
        for (let idx = 0; idx < children.length; idx++) {
          const item = children[idx]
          const iTag = item.tagName.toLowerCase()
          if (iTag === 'dt') {
            const dtInlines: InlineNode[] = [{ type: 'strong', children: parseInline(item) }]
            const next = children[idx + 1]
            if (next && next.tagName.toLowerCase() === 'dd') {
              dtInlines.push({ type: 'text', value: ': ' }, ...parseInline(next))
              idx++
            }
            dItems.push({
              type: 'listItem',
              id: item.getAttribute('id') || undefined,
              children: [{ type: 'paragraph', children: dtInlines }],
            })
          } else if (iTag === 'dd') {
            dItems.push({
              type: 'listItem',
              id: item.getAttribute('id') || undefined,
              children: [{ type: 'paragraph', children: parseInline(item) }],
            })
          }
        }
        if (dItems.length > 0) {
          blocks.push({
            type: 'list',
            id: el.getAttribute('id') || undefined,
            ordered: false,
            items: dItems,
          })
        }
      } else if (tag === 'details') {
        const summary = el.querySelector('summary')
        const summaryText = summary?.textContent?.trim() || 'Details'
        const inner = parseBlockNodes(el).filter(
          (b) => !(b.type === 'paragraph' && b.children.length === 1 && b.children[0].type === 'text' && b.children[0].value === summaryText)
        )
        blocks.push({
          type: 'blockquote',
          id: el.getAttribute('id') || undefined,
          children: [
            { type: 'paragraph', children: [{ type: 'strong', children: [{ type: 'text', value: summaryText }] }] },
            ...inner,
          ],
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

        blocks.push({
          type: 'table',
          headers,
          rows,
          alignments: (headers.length > 0 ? headers : rows[0]?.cells || []).map(() => null),
        })
      } else if (tag === 'hr') {
        blocks.push({
          type: 'thematicBreak',
        })
      } else {
        const inlines = parseInline(el)
        if (inlines.length > 0) {
          blocks.push({
            type: 'paragraph',
            children: inlines,
          })
        }
      }
    }
    return blocks
  }

  const children: BlockNode[] = parseBlockNodes(root)

  let title = doc.title && doc.title !== 'document' ? doc.title : undefined
  if (!title) {
    const firstH1 = children.find((b): b is HeadingNode => b.type === 'heading' && b.level === 1)
    if (firstH1) {
      const extractText = (inlines: InlineNode[]): string =>
        inlines.map((i) => ('children' in i ? extractText((i as any).children) : (i as any).value || '')).join('')
      title = extractText(firstH1.children).trim() || undefined
    }
  }
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
