import type { NormalizedDocument } from '../core/types'
import { parseMarkdown } from './markdown'
import { normalizeUniversalInput } from './normalizer'

export const normalizeLlmOutput = normalizeUniversalInput

/**
 * Parses mixed LLM output into the unified NormalizedDocument AST
 */
export function parseLlmMixed(rawText: string): NormalizedDocument {
  // parseMarkdown already runs normalizeUniversalInput as its first step
  const doc = parseMarkdown(rawText)
  doc.metadata.sourceFormat = 'llm-mixed'
  return doc
}
