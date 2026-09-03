import type { NormalizedDocument, BlockNode } from '../core/types'
import { computeDocumentStats, createEmptyDocument } from '../core/stats'

/**
 * Parses JSON content into NormalizedDocument AST
 */
export function parseJson(jsonString: string): NormalizedDocument {
  if (!jsonString.trim()) return createEmptyDocument()

  try {
    const parsed = JSON.parse(jsonString)

    // Check if it's already a valid NormalizedDocument
    if (parsed && parsed.type === 'document' && Array.isArray(parsed.children)) {
      return {
        ...parsed,
        stats: computeDocumentStats(parsed.children),
      }
    }

    // Otherwise render structured JSON as an outline document
    const children: BlockNode[] = [
      {
        type: 'heading',
        level: 1,
        children: [{ type: 'text', value: 'JSON Document' }],
      },
      {
        type: 'codeBlock',
        language: 'json',
        value: JSON.stringify(parsed, null, 2),
      },
    ]

    return {
      type: 'document',
      version: 1,
      metadata: {
        title: 'JSON Document',
        createdAt: new Date().toISOString(),
        sourceFormat: 'json',
      },
      children,
      stats: computeDocumentStats(children),
    }
  } catch {
    // If not valid JSON, treat as text
    return {
      type: 'document',
      version: 1,
      metadata: {
        createdAt: new Date().toISOString(),
        sourceFormat: 'json',
      },
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: jsonString }],
        },
      ],
      stats: computeDocumentStats([]),
    }
  }
}
