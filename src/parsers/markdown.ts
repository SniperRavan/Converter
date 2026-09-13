import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import type {
  BlockNode,
  HeadingNode,
  InlineNode,
  NormalizedDocument,
  Alignment,
  TableCellNode,
  TableRowNode,
  TableNode,
} from '../core/types'
import { computeDocumentStats } from '../core/stats'

// Map MDAST inline nodes to our Normalized Document Model
function mapMdastInline(node: any): InlineNode | null {
  if (!node) return null

  switch (node.type) {
    case 'text':
      return { type: 'text', value: node.value || '' }

    case 'strong':
      return {
        type: 'strong',
        children: (node.children || []).map(mapMdastInline).filter(Boolean) as InlineNode[],
      }

    case 'emphasis':
      return {
        type: 'emphasis',
        children: (node.children || []).map(mapMdastInline).filter(Boolean) as InlineNode[],
      }

    case 'delete':
      return {
        type: 'strikethrough',
        children: (node.children || []).map(mapMdastInline).filter(Boolean) as InlineNode[],
      }

    case 'inlineCode':
      return { type: 'inlineCode', value: node.value || '' }

    case 'inlineMath':
      return {
        type: 'inlineMath',
        value: node.value || '',
        source: `$${node.value || ''}$`,
      }

    case 'link':
      return {
        type: 'link',
        url: node.url || '',
        title: node.title || undefined,
        children: (node.children || []).map(mapMdastInline).filter(Boolean) as InlineNode[],
      }

    case 'image':
      return {
        type: 'image',
        url: node.url || '',
        alt: node.alt || undefined,
        title: node.title || undefined,
      }

    case 'html': {
      const val = (node.value || '').trim()
      if (!val) return null

      // Inline images: <img src="..." alt="..." />
      const imgMatch = val.match(/<img\b[^>]*?\bsrc=["']([^"']+)["'][^>]*>/i)
      if (imgMatch) {
        const altMatch = val.match(/\balt=["']([^"']*)["']/i)
        const titleMatch = val.match(/\btitle=["']([^"']*)["']/i)
        return {
          type: 'image',
          url: imgMatch[1],
          alt: altMatch ? altMatch[1] : undefined,
          title: titleMatch ? titleMatch[1] : undefined,
        }
      }

      // Inline code: <code>...</code>
      const codeMatch = val.match(/^<code>([\s\S]*?)<\/code>$/i)
      if (codeMatch) {
        return {
          type: 'inlineCode',
          value: codeMatch[1].replace(/<[^>]+>/g, ''),
        }
      }

      // Inline line breaks: <br/> or <br>
      if (/^<br\s*\/?>$/i.test(val)) {
        return { type: 'text', value: '\n' }
      }

      // Inline non-breaking space
      if (/^&nbsp;$/i.test(val)) {
        return { type: 'text', value: ' ' }
      }

      // Links: <a href="...">...</a>
      const linkMatch = val.match(/^<a\b[^>]*?\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>$/i)
      if (linkMatch) {
        const href = linkMatch[1]
        const inner = linkMatch[2]
        const innerImg = inner.match(/<img\b[^>]*?\bsrc=["']([^"']+)["'][^>]*>/i)
        if (innerImg) {
          const innerAlt = inner.match(/\balt=["']([^"']*)["']/i)
          return {
            type: 'link',
            url: href,
            children: [
              {
                type: 'image',
                url: innerImg[1],
                alt: innerAlt ? innerAlt[1] : undefined,
              },
            ],
          }
        }
        return {
          type: 'link',
          url: href,
          children: [{ type: 'text', value: inner.replace(/<[^>]+>/g, '') }],
        }
      }

      return { type: 'text', value: node.value }
    }

    case 'break':
      return { type: 'text', value: '\n' }

    default:
      // Fallback for unknown inlines
      if (node.value) {
        return { type: 'text', value: node.value }
      }
      return null
  }
}

// Map MDAST block nodes to our Normalized Document Model
function mapMdastBlock(node: any): BlockNode | null {
  if (!node) return null
  const startLine = node.position?.start?.line
  const endLine = node.position?.end?.line

  switch (node.type) {
    case 'heading': {
      const level = Math.min(Math.max(node.depth || 1, 1), 6) as 1 | 2 | 3 | 4 | 5 | 6
      return {
        type: 'heading',
        level,
        startLine,
        endLine,
        children: (node.children || []).map(mapMdastInline).filter(Boolean) as InlineNode[],
      }
    }

    case 'paragraph':
      return {
        type: 'paragraph',
        startLine,
        endLine,
        children: (node.children || []).map(mapMdastInline).filter(Boolean) as InlineNode[],
      }

    case 'blockquote': {
      const children = (node.children || []).map(mapMdastBlock).filter(Boolean) as BlockNode[]
      let calloutType: 'note' | 'tip' | 'warning' | 'important' | 'caution' | null = null

      if (children.length > 0 && children[0].type === 'paragraph' && children[0].children.length > 0) {
        const firstInline = children[0].children[0]
        if (firstInline.type === 'text') {
          const match = firstInline.value.match(/^\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\](?:\s*[\n\r]\s*|\s+)?/i)
          if (match) {
            calloutType = match[1].toLowerCase() as any
            firstInline.value = firstInline.value.slice(match[0].length)
            if (!firstInline.value.trim() && children[0].children.length > 1) {
              children[0].children.shift()
            }
          }
        } else if (firstInline.type === 'strong' && firstInline.children?.length > 0) {
          const strongText = firstInline.children.map((c: any) => c.value || '').join('').trim()
          const match = strongText.match(/^(NOTE|TIP|WARNING|IMPORTANT|CAUTION):?$/i)
          if (match) {
            calloutType = match[1].toLowerCase() as any
            children[0].children.shift()
            if (children[0].children.length > 0 && children[0].children[0].type === 'text') {
              children[0].children[0].value = children[0].children[0].value.replace(/^:\s*/, '').trimStart()
            }
          }
        }
      }

      return {
        type: 'blockquote',
        calloutType,
        startLine,
        endLine,
        children,
      }
    }

    case 'list': {
      return {
        type: 'list',
        ordered: Boolean(node.ordered),
        start: node.start || 1,
        startLine,
        endLine,
        items: (node.children || []).map((item: any) => {
          let checked: boolean | null = typeof item.checked === 'boolean' ? item.checked : null
          const children = (item.children || []).map(mapMdastBlock).filter(Boolean) as BlockNode[]
          if (checked === null && children.length > 0 && children[0].type === 'paragraph') {
            const p = children[0]
            if (p.children.length > 0 && p.children[0].type === 'text') {
              if (/^\[[xX]\]\s*/.test(p.children[0].value)) {
                checked = true
                p.children[0].value = p.children[0].value.replace(/^\[[xX]\]\s*/, '')
              } else if (/^\[ \]\s*/.test(p.children[0].value)) {
                checked = false
                p.children[0].value = p.children[0].value.replace(/^\[ \]\s*/, '')
              }
            }
          }
          return {
            type: 'listItem' as const,
            checked,
            children,
          }
        }),
      }
    }

    case 'code':
      return {
        type: 'codeBlock',
        language: node.lang || 'text',
        value: node.value || '',
        startLine,
        endLine,
      }

    case 'math':
      return {
        type: 'mathBlock',
        value: node.value || '',
        source: `$$\n${node.value || ''}\n$$`,
        startLine,
        endLine,
      }

    case 'table': {
      const alignments: Alignment[] = (node.align || []).map((a: string | null) => {
        if (a === 'left' || a === 'center' || a === 'right') return a
        return null
      })

      const rowsData = node.children || []
      if (rowsData.length === 0) return null

      // First row in GFM tables is treated as header
      const headerRow = rowsData[0]
      const bodyRows = rowsData.slice(1)

      const headers: TableCellNode[] = (headerRow.children || []).map((cell: any, idx: number) => ({
        type: 'tableCell' as const,
        align: alignments[idx] || null,
        children: (cell.children || []).map(mapMdastInline).filter(Boolean) as InlineNode[],
      }))

      const rows: TableRowNode[] = bodyRows.map((r: any) => ({
        type: 'tableRow' as const,
        cells: (r.children || []).map((cell: any, idx: number) => ({
          type: 'tableCell' as const,
          align: alignments[idx] || null,
          children: (cell.children || []).map(mapMdastInline).filter(Boolean) as InlineNode[],
        })),
      }))

      const tableNode: TableNode = {
        type: 'table',
        headers,
        rows,
        alignments,
        startLine,
        endLine,
      }
      return tableNode
    }

    case 'thematicBreak':
      return { type: 'thematicBreak', startLine, endLine }

    default:
      if (node.value) {
        return { type: 'rawBlock', content: node.value }
      }
      return null
  }
}

import { normalizeUniversalInput } from './normalizer'

// Canonical deterministic parser: text -> NormalizedDocument
export function parseMarkdown(rawText: string): NormalizedDocument {
  if (!rawText || !rawText.trim()) {
    return {
      type: 'document',
      version: 1,
      metadata: {
        createdAt: new Date().toISOString(),
        sourceFormat: 'markdown',
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

  const text = normalizeUniversalInput(rawText)

  try {
    const mdast = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkMath)
      .parse(text) as any

    const blocks: BlockNode[] = (mdast.children || [])
      .map(mapMdastBlock)
      .filter(Boolean) as BlockNode[]

    let title: string | undefined
    let author: string | undefined
    let date: string | undefined

    const frontmatterMatch = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)
    if (frontmatterMatch) {
      const yaml = frontmatterMatch[1]
      const titleM = yaml.match(/^title:\s*["']?(.*?)["']?$/m)
      if (titleM) title = titleM[1].trim()
      const authorM = yaml.match(/^author:\s*["']?(.*?)["']?$/m)
      if (authorM) author = authorM[1].trim()
      const dateM = yaml.match(/^date:\s*["']?(.*?)["']?$/m)
      if (dateM) date = dateM[1].trim()
    }

    if (!title) {
      const firstH1 = blocks.find((b): b is HeadingNode => b.type === 'heading' && b.level === 1)
      if (firstH1) {
        const extractText = (inlines: InlineNode[]): string =>
          inlines.map((i) => ('children' in i ? extractText((i as any).children) : (i as any).value || '')).join('')
        title = extractText(firstH1.children).trim() || undefined
      }
    }

    const stats = computeDocumentStats(blocks)

    return {
      type: 'document',
      version: 1,
      metadata: {
        title,
        author,
        date,
        createdAt: new Date().toISOString(),
        sourceFormat: 'markdown',
      },
      children: blocks,
      stats,
    }
  } catch {
    // Fault-tolerant fallback: preserve content as a simple paragraph rather than crashing
    const fallbackBlock: BlockNode = {
      type: 'paragraph',
      children: [{ type: 'text', value: text }],
    }
    const blocks = [fallbackBlock]
    return {
      type: 'document',
      version: 1,
      metadata: {
        createdAt: new Date().toISOString(),
        sourceFormat: 'fallback',
      },
      children: blocks,
      stats: computeDocumentStats(blocks),
    }
  }
}
