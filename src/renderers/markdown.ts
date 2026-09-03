import type { BlockNode, InlineNode, NormalizedDocument, TableCellNode } from '../core/types'

function renderInlineToMarkdown(node: InlineNode): string {
  switch (node.type) {
    case 'text':
      return node.value
    case 'strong':
      return `**${node.children.map(renderInlineToMarkdown).join('')}**`
    case 'emphasis':
      return `*${node.children.map(renderInlineToMarkdown).join('')}*`
    case 'strikethrough':
      return `~~${node.children.map(renderInlineToMarkdown).join('')}~~`
    case 'inlineCode':
      return `\`${node.value}\``
    case 'inlineMath':
      return `$${node.value}$`
    case 'link':
      return `[${node.children.map(renderInlineToMarkdown).join('')}](${node.url}${node.title ? ` "${node.title}"` : ''})`
    case 'image':
      return `![${node.alt || ''}](${node.url}${node.title ? ` "${node.title}"` : ''})`
    default:
      return ''
  }
}

function renderBlockToMarkdown(block: BlockNode): string {
  switch (block.type) {
    case 'heading': {
      const hashes = '#'.repeat(block.level)
      const content = block.children.map(renderInlineToMarkdown).join('')
      return `${hashes} ${content}\n`
    }

    case 'paragraph': {
      const content = block.children.map(renderInlineToMarkdown).join('')
      return `${content}\n`
    }

    case 'blockquote': {
      const inner = block.children.map(renderBlockToMarkdown).join('\n').trim()
      return inner.split('\n').map(line => `> ${line}`).join('\n') + '\n'
    }

    case 'codeBlock': {
      return `\`\`\`${block.language || ''}\n${block.value}\n\`\`\`\n`
    }

    case 'mathBlock': {
      return `$$\n${block.value.trim()}\n$$\n`
    }

    case 'list': {
      return block.items
        .map((item, index) => {
          const prefix = block.ordered ? `${(block.start || 1) + index}. ` : '- '
          const content = item.children
            .map(child => {
              if ('type' in child && child.type === 'paragraph') {
                return child.children.map(renderInlineToMarkdown).join('')
              }
              if ('type' in child && child.type === 'heading') {
                return child.children.map(renderInlineToMarkdown).join('')
              }
              if ('type' in child && child.type === 'list') {
                return '\n  ' + renderBlockToMarkdown(child).trim().replace(/\n/g, '\n  ')
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

      const formatCell = (cell: TableCellNode) => cell.children.map(renderInlineToMarkdown).join('')
      const headerLine = `| ${block.headers.map(formatCell).join(' | ')} |`

      const separatorLine = `| ${block.headers.map((_, idx) => {
        const align = block.alignments[idx]
        if (align === 'center') return ':---:'
        if (align === 'right') return '---:'
        return '---'
      }).join(' | ')} |`

      const rowLines = block.rows.map(row => {
        return `| ${row.cells.map(formatCell).join(' | ')} |`
      })

      return [headerLine, separatorLine, ...rowLines].join('\n') + '\n'
    }

    case 'thematicBreak':
      return '---\n'

    case 'rawBlock':
      return `${block.content}\n`

    default:
      return ''
  }
}

export function renderToMarkdown(doc: NormalizedDocument): string {
  if (!doc.children || doc.children.length === 0) return ''
  return doc.children.map(renderBlockToMarkdown).join('\n').trim() + '\n'
}
