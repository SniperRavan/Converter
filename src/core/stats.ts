import type { BlockNode, DocumentStats, InlineNode, NormalizedDocument } from './types'

// Helper to extract raw text content from inline nodes
export function getInlineText(nodes: InlineNode[]): string {
  return nodes
    .map(node => {
      switch (node.type) {
        case 'text':
        case 'inlineCode':
        case 'inlineMath':
          return node.value
        case 'strong':
        case 'emphasis':
        case 'strikethrough':
        case 'link':
          return getInlineText(node.children)
        case 'image':
          return node.alt || ''
        default:
          return ''
      }
    })
    .join('')
}

// Compute live metrics on the parsed document model
export function computeDocumentStats(blocks: BlockNode[]): DocumentStats {
  const stats: DocumentStats = {
    headings: 0,
    paragraphs: 0,
    codeBlocks: 0,
    mathExpressions: 0,
    tables: 0,
    lists: 0,
    characters: 0,
    words: 0,
  }

  let combinedText = ''

  function processInlines(inlines: InlineNode[]) {
    for (const inline of inlines) {
      if (inline.type === 'inlineMath') {
        stats.mathExpressions += 1
      } else if (inline.type === 'strong' || inline.type === 'emphasis' || inline.type === 'strikethrough' || inline.type === 'link') {
        processInlines(inline.children)
      }
    }
    combinedText += ' ' + getInlineText(inlines)
  }

  function processBlock(block: BlockNode) {
    switch (block.type) {
      case 'heading':
        stats.headings += 1
        processInlines(block.children)
        break
      case 'paragraph':
        stats.paragraphs += 1
        processInlines(block.children)
        break
      case 'mathBlock':
        stats.mathExpressions += 1
        break
      case 'codeBlock':
        stats.codeBlocks += 1
        combinedText += ' ' + block.value
        break
      case 'table':
        stats.tables += 1
        block.headers.forEach(cell => processInlines(cell.children))
        block.rows.forEach(row => row.cells.forEach(cell => processInlines(cell.children)))
        break
      case 'list':
        stats.lists += 1
        block.items.forEach(item => {
          item.children.forEach(child => {
            if ('type' in child && (child.type === 'paragraph' || child.type === 'heading')) {
              processBlock(child)
            } else if ('children' in child && Array.isArray(child.children)) {
              processInlines(child.children as InlineNode[])
            }
          })
        })
        break
      case 'blockquote':
        block.children.forEach(processBlock)
        break
      default:
        break
    }
  }

  blocks.forEach(processBlock)

  const cleanText = combinedText.trim()
  stats.characters = cleanText.length
  stats.words = cleanText ? cleanText.split(/\s+/).filter(Boolean).length : 0

  return stats
}

export function createEmptyDocument(): NormalizedDocument {
  return {
    type: 'document',
    version: 1,
    metadata: {
      createdAt: new Date().toISOString(),
      sourceFormat: 'unknown',
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
