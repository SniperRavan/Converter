import type { BlockNode, DocumentStats, InlineNode, NormalizedDocument } from './types'
import { latexToUnicode } from '../utils/mathUnicode'

// Helper to extract raw text content from inline nodes
export function getInlineText(nodes: InlineNode[], options?: { mathMode?: 'unicode' | 'latex' }): string {
  const mathMode = options?.mathMode || 'unicode'
  return nodes
    .map(node => {
      switch (node.type) {
        case 'text':
        case 'inlineCode':
          return node.value
        case 'inlineMath':
          return mathMode === 'latex' ? `$${node.value}$` : (latexToUnicode(node.value) || node.value)
        case 'strong':
        case 'emphasis':
        case 'strikethrough':
        case 'link':
          return getInlineText(node.children, options)
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

  function countMathInlines(inlines: InlineNode[]) {
    for (const inline of inlines) {
      if (inline.type === 'inlineMath') {
        stats.mathExpressions += 1
      } else if ('children' in inline && Array.isArray((inline as any).children)) {
        countMathInlines((inline as any).children)
      }
    }
  }

  function processInlines(inlines: InlineNode[]) {
    countMathInlines(inlines)
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
        const blockTypes = new Set([
          'paragraph',
          'heading',
          'mathBlock',
          'codeBlock',
          'table',
          'list',
          'blockquote',
          'thematicBreak',
          'rawBlock',
        ])
        block.items.forEach(item => {
          item.children.forEach(child => {
            if ('type' in child && blockTypes.has(child.type)) {
              processBlock(child as BlockNode)
            } else if ('children' in child && Array.isArray((child as any).children)) {
              processInlines((child as any).children as InlineNode[])
            } else if ('type' in child) {
              processInlines([child as InlineNode])
            }
          })
        })
        break
      case 'blockquote':
        block.children.forEach(processBlock)
        break
      case 'rawBlock': {
        const textToAnalyze = block.markdown || block.content
        if (block.markdown) {
          const lines = block.markdown.split('\n')
          let currentParagraph = ''
          let inTable = false
          let inCode = false

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim()
            if (!line) {
              if (currentParagraph) {
                stats.paragraphs += 1
                combinedText += ' ' + currentParagraph
                currentParagraph = ''
              }
              inTable = false
              continue
            }

            if (line.startsWith('```')) {
              if (currentParagraph) {
                stats.paragraphs += 1
                combinedText += ' ' + currentParagraph
                currentParagraph = ''
              }
              inCode = !inCode
              if (inCode) stats.codeBlocks += 1
              continue
            }

            if (inCode) {
              combinedText += ' ' + line
              continue
            }

            if (/^#{1,6}\s+/.test(line)) {
              if (currentParagraph) {
                stats.paragraphs += 1
                combinedText += ' ' + currentParagraph
                currentParagraph = ''
              }
              stats.headings += 1
              combinedText += ' ' + line.replace(/^#{1,6}\s+/, '')
            } else if (line.startsWith('|') && line.endsWith('|')) {
              if (currentParagraph) {
                stats.paragraphs += 1
                combinedText += ' ' + currentParagraph
                currentParagraph = ''
              }
              if (line.includes('---')) {
                if (!inTable) {
                  stats.tables += 1
                  inTable = true
                }
              }
              const cells = line.split('|').map(c => c.trim()).filter(Boolean)
              combinedText += ' ' + cells.join(' ')
            } else if (/^[-*+]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
              if (currentParagraph) {
                stats.paragraphs += 1
                combinedText += ' ' + currentParagraph
                currentParagraph = ''
              }
              const prevLine = i > 0 ? lines[i - 1].trim() : ''
              if (!/^[-*+]\s+/.test(prevLine) && !/^\d+\.\s+/.test(prevLine)) {
                stats.lists += 1
              }
              combinedText += ' ' + line.replace(/^[-*+]\s+/, '').replace(/^\d+\.\s+/, '')
            } else if (line.startsWith('$$')) {
              stats.mathExpressions += 1
            } else if (line === '---' || line === '***') {
              // thematic break
            } else {
              currentParagraph += (currentParagraph ? ' ' : '') + line
            }
          }

          if (currentParagraph) {
            stats.paragraphs += 1
            combinedText += ' ' + currentParagraph
          }
        } else {
          const stripped = textToAnalyze.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
          if (stripped) {
            stats.paragraphs += 1
            combinedText += ' ' + stripped
          }
        }
        break
      }
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
