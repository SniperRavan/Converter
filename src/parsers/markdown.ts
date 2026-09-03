import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import type {
  BlockNode,
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

    default:
      // Fallback for html or unknown inlines
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

    case 'blockquote':
      return {
        type: 'blockquote',
        startLine,
        endLine,
        children: (node.children || []).map(mapMdastBlock).filter(Boolean) as BlockNode[],
      }

    case 'list': {
      return {
        type: 'list',
        ordered: Boolean(node.ordered),
        start: node.start || 1,
        startLine,
        endLine,
        items: (node.children || []).map((item: any) => ({
          type: 'listItem' as const,
          children: (item.children || []).map(mapMdastBlock).filter(Boolean) as BlockNode[],
        })),
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

// Canonical deterministic parser: text -> NormalizedDocument
export function parseMarkdown(text: string): NormalizedDocument {
  if (!text || !text.trim()) {
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

  try {
    const mdast = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkMath)
      .parse(text) as any

    const blocks: BlockNode[] = (mdast.children || [])
      .map(mapMdastBlock)
      .filter(Boolean) as BlockNode[]

    const stats = computeDocumentStats(blocks)

    return {
      type: 'document',
      version: 1,
      metadata: {
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
