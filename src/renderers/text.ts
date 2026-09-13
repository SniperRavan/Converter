import type { BlockNode, NormalizedDocument } from '../core/types'
import { getInlineText } from '../core/stats'
import { latexToUnicode } from '../utils/mathUnicode'

export interface TextRenderOptions {
  mathMode?: 'unicode' | 'latex'
}

function renderBlockToPlainText(block: BlockNode, mathMode: 'unicode' | 'latex' = 'unicode'): string {
  switch (block.type) {
    case 'heading': {
      const text = getInlineText(block.children, { mathMode })
      const underline = block.level === 1 ? '='.repeat(text.length) : '-'.repeat(text.length)
      return `\n${text}\n${underline}\n`
    }

    case 'paragraph': {
      return getInlineText(block.children, { mathMode }) + '\n'
    }

    case 'blockquote': {
      const inner = block.children.map(c => renderBlockToPlainText(c, mathMode)).join('\n').trim()
      const lines = inner.split('\n')
      if (lines.length > 0) {
        if (block.calloutType) {
          const type = block.calloutType.toUpperCase()
          lines[0] = `[${type}] ${lines[0].replace(/^\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\]\s*/i, '')}`.trim()
        } else if (lines[0] && /^\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\]/i.test(lines[0])) {
          const match = lines[0].match(/^\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\]\s*(.*)/i)
          if (match) {
            const type = match[1].toUpperCase()
            lines[0] = `[${type}] ${match[2]}`.trim()
          }
        }
      }
      return lines.map(l => `  | ${l}`).join('\n') + '\n'
    }

    case 'codeBlock': {
      const banner = `--- [Code: ${block.language || 'text'}] ---`
      return `${banner}\n${block.value}\n${'-'.repeat(banner.length)}\n`
    }

    case 'mathBlock': {
      if (mathMode === 'latex') {
        return `\n$$\n${block.value.trim()}\n$$\n`
      }
      const unicode = latexToUnicode(block.value.trim())
      return `\n    ${unicode}\n`
    }

    case 'list': {
      return block.items
        .map((item, idx) => {
          let prefix = block.ordered ? `${(block.start || 1) + idx}. ` : '• '
          if (!block.ordered) {
            if (item.checked === true) prefix = '[x] '
            else if (item.checked === false) prefix = '[ ] '
          }
          const content = item.children
            .map(child => {
              if ('type' in child && (child.type === 'paragraph' || child.type === 'heading')) {
                let text = getInlineText(child.children, { mathMode })
                if (!block.ordered && (item.checked === true || item.checked === false)) {
                  text = text.replace(/^\[[xX ]\]\s*/, '')
                }
                return text
              }
              if ('type' in child && child.type === 'list') {
                return renderBlockToPlainText(child, mathMode)
              }
              return ''
            })
            .join(' ')
          if (!block.ordered && (content.startsWith('[x] ') || content.startsWith('[ ] '))) {
            prefix = ''
          }
          return `${prefix}${content}`
        })
        .join('\n') + '\n'
    }

    case 'table': {
      const hasHeaders = Boolean(block.headers && block.headers.length > 0)
      const hasRows = Boolean(block.rows && block.rows.length > 0)
      if (!hasHeaders && !hasRows) return ''

      const headers = hasHeaders ? block.headers.map(h => getInlineText(h.children, { mathMode })) : []
      const rows = hasRows ? block.rows.map(r => r.cells.map(c => getInlineText(c.children, { mathMode }))) : []

      const numCols = Math.max(headers.length, ...rows.map(r => r.length), 1)

      const colWidths = Array.from({ length: numCols }, (_, i) => {
        const headerLen = (headers[i] || '').length
        const rowMax = rows.reduce((max, row) => Math.max(max, (row[i] || '').length), 0)
        return Math.max(headerLen, rowMax, 3)
      })

      const formatRow = (cells: string[]) => {
        return '| ' + Array.from({ length: numCols }, (_, i) => (cells[i] || '').padEnd(colWidths[i])).join(' | ') + ' |'
      }

      const separator = '+-' + colWidths.map(w => '-'.repeat(w)).join('-+-') + '-+'

      const lines: string[] = [separator]
      if (hasHeaders) {
        lines.push(formatRow(headers))
        lines.push(separator)
      }
      lines.push(...rows.map(formatRow))
      lines.push(separator)

      return lines.join('\n') + '\n'
    }

    case 'thematicBreak':
      return '----------------------------------------\n'

    case 'rawBlock': {
      if (block.markdown) {
        return `${block.markdown.trim()}\n\n`
      }
      const clean = block.content
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|tr|h[1-6])>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
      return clean ? `${clean}\n` : ''
    }

    default:
      return ''
  }
}

export function renderToPlainText(doc: NormalizedDocument, options: TextRenderOptions = {}): string {
  const mathMode = options.mathMode || 'unicode'
  return doc.children.map(c => renderBlockToPlainText(c, mathMode)).join('\n').trim() + '\n'
}
