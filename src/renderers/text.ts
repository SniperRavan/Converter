import type { BlockNode, NormalizedDocument } from '../core/types'
import { getInlineText } from '../core/stats'

function renderBlockToPlainText(block: BlockNode): string {
  switch (block.type) {
    case 'heading': {
      const text = getInlineText(block.children)
      const underline = block.level === 1 ? '='.repeat(text.length) : '-'.repeat(text.length)
      return `\n${text}\n${underline}\n`
    }

    case 'paragraph': {
      return getInlineText(block.children) + '\n'
    }

    case 'blockquote': {
      const inner = block.children.map(renderBlockToPlainText).join('\n').trim()
      return inner.split('\n').map(l => `  | ${l}`).join('\n') + '\n'
    }

    case 'codeBlock': {
      const banner = `--- [Code: ${block.language || 'text'}] ---`
      return `${banner}\n${block.value}\n${'-'.repeat(banner.length)}\n`
    }

    case 'mathBlock': {
      return `\n    [Formula] ${block.value.trim()}\n`
    }

    case 'list': {
      return block.items
        .map((item, idx) => {
          const prefix = block.ordered ? `${(block.start || 1) + idx}. ` : '• '
          const content = item.children
            .map(child => {
              if ('type' in child && (child.type === 'paragraph' || child.type === 'heading')) {
                return getInlineText(child.children)
              }
              return ''
            })
            .join(' ')
          return `${prefix}${content}`
        })
        .join('\n') + '\n'
    }

    case 'table': {
      if (!block.headers || block.headers.length === 0) return ''
      const headers = block.headers.map(h => getInlineText(h.children))
      const rows = block.rows.map(r => r.cells.map(c => getInlineText(c.children)))

      // Compute column widths
      const colWidths = headers.map((h, i) => {
        const rowMax = rows.reduce((max, row) => Math.max(max, (row[i] || '').length), 0)
        return Math.max(h.length, rowMax, 3)
      })

      const formatRow = (cells: string[]) => {
        return '| ' + cells.map((c, i) => (c || '').padEnd(colWidths[i])).join(' | ') + ' |'
      }

      const separator = '+-' + colWidths.map(w => '-'.repeat(w)).join('-+-') + '-+'

      const lines = [
        separator,
        formatRow(headers),
        separator,
        ...rows.map(formatRow),
        separator,
      ]

      return lines.join('\n') + '\n'
    }

    case 'thematicBreak':
      return '----------------------------------------\n'

    case 'rawBlock':
      return `${block.content}\n`

    default:
      return ''
  }
}

export function renderToPlainText(doc: NormalizedDocument): string {
  return doc.children.map(renderBlockToPlainText).join('\n').trim() + '\n'
}
