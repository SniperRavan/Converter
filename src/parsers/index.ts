import type { NormalizedDocument, SupportedInputFormat } from '../core/types'
import { parseMarkdown } from './markdown'
import { parseLlmMixed } from './llm-mixed'
import { parseHtml } from './html'
import { parseLatex } from './latex'
import { parseJson } from './json'
import { detectInputFormat } from './detector'
import { createEmptyDocument } from '../core/stats'

export {
  parseMarkdown,
  parseLlmMixed,
  parseHtml,
  parseLatex,
  parseJson,
  detectInputFormat,
}

/**
 * Universal document parsing engine
 * Routes input content through the selected parser or automatically detects format.
 */
export function parseUniversalDocument(
  content: string,
  requestedFormat: SupportedInputFormat = 'auto'
): NormalizedDocument {
  if (!content || !content.trim()) {
    return createEmptyDocument()
  }

  let format = requestedFormat

  if (format === 'auto') {
    const detected = detectInputFormat(content)
    if (detected.primaryFormat === 'html') format = 'html'
    else if (detected.primaryFormat === 'latex') format = 'latex'
    else if (detected.hasMath && detected.hasTables) format = 'llm-mixed'
    else if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
      try {
        JSON.parse(content)
        format = 'json'
      } catch {
        format = 'markdown'
      }
    } else {
      format = 'markdown'
    }
  }

  switch (format) {
    case 'llm-mixed':
      return parseLlmMixed(content)
    case 'html':
      return parseHtml(content)
    case 'latex':
      return parseLatex(content)
    case 'json':
      return parseJson(content)
    case 'text':
      return {
        type: 'document',
        version: 1,
        metadata: {
          createdAt: new Date().toISOString(),
          sourceFormat: 'text',
        },
        children: content.split(/\n\s*\n/).map((block, idx) => ({
          type: 'paragraph',
          children: [{ type: 'text', value: block }],
          line: idx + 1,
        })),
        stats: {
          headings: 0,
          paragraphs: content.split(/\n\s*\n/).length,
          codeBlocks: 0,
          mathExpressions: 0,
          tables: 0,
          lists: 0,
          characters: content.length,
          words: content.split(/\s+/).filter(Boolean).length,
        },
      }
    case 'markdown':
    default:
      return parseMarkdown(content)
  }
}
