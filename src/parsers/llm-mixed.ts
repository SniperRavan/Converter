import type { NormalizedDocument } from '../core/types'
import { parseMarkdown } from './markdown'
import { normalizeUniversalInput } from './normalizer'

export const normalizeLlmOutput = normalizeUniversalInput

/**
 * Parses mixed LLM output into the unified NormalizedDocument AST
 */
export function parseLlmMixed(rawText: string): NormalizedDocument {
  const normalized = normalizeUniversalInput(rawText)
  const doc = parseMarkdown(normalized)
  doc.metadata.sourceFormat = 'llm-mixed'
  return doc
}
