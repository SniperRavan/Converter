// Fast deterministic detector for pasted content or uploaded files

export interface DetectionResult {
  primaryFormat: 'markdown' | 'latex' | 'html' | 'text' | 'json'
  hasMath: boolean
  hasTables: boolean
  hasCode: boolean
  confidence: number
  summary: string
}

export function detectInputFormat(content: string): DetectionResult {
  if (!content || !content.trim()) {
    return {
      primaryFormat: 'text',
      hasMath: false,
      hasTables: false,
      hasCode: false,
      confidence: 1.0,
      summary: 'Empty document',
    }
  }

  // Strip leading/trailing quote marks if user pasted wrapped text
  const clean = content.trim().replace(/^["']/, '').replace(/["']$/, '')

  // 1. Explicit LaTeX detection (documents, preambles, environments, sections)
  const isExplicitLatex =
    /\\documentclass\b/.test(clean) ||
    /\\begin\{document\}/.test(clean) ||
    /\\usepackage\b/.test(clean) ||
    /\\(title|author|date)\s*\{/.test(clean) ||
    /\\(chapter|part)\*?\{/.test(clean) ||
    /\\(section|subsection)\*?\{/.test(clean) ||
    /\\begin\{(equation|align|gather|tabular|figure|lstlisting|itemize|enumerate)\}/.test(clean)

  // 3. JSON detection
  const isJson = (clean.startsWith('{') && clean.endsWith('}')) || (clean.startsWith('[') && clean.endsWith(']'))

  // 4. Markdown features
  const hasMath = /\$\$[\s\S]*?\$\$|\$[^$\n]+?\$|\\\[[\s\S]*?\\\]|\\\(.+?\\\)|\\[a-zA-Z]+/.test(clean)
  const hasTables = /\|(.+)\|[\r\n]+\|[-:\s|]+\|/.test(clean)
  const hasCode = /```[a-zA-Z0-9_-]*[\s\S]*?```/.test(clean)
  const hasHeadings = /^#{1,6}\s+\S+/m.test(clean) || /^\S+[\r\n]+[=-]{2,}\s*$/m.test(clean)

  // 2. Explicit HTML detection (must not misclassify Markdown with HTML layout tags)
  const hasHtml = /<\/?[a-z][\s\S]*>/i.test(clean)
  const isFullHtml =
    clean.includes('<!DOCTYPE') ||
    clean.includes('<html') ||
    clean.includes('<body>') ||
    clean.includes('<head>')
  const isFragmentHtml =
    hasHtml &&
    /^<(div|article|section|main|p|table|h1|h2)[\s>]/i.test(clean) &&
    !hasHeadings &&
    !hasCode &&
    !hasTables
  const isExplicitHtml = isFullHtml || isFragmentHtml

  let primaryFormat: 'markdown' | 'latex' | 'html' | 'text' | 'json' = 'text'
  let confidence = 0.8

  if (isExplicitLatex) {
    primaryFormat = 'latex'
    confidence = 0.99
  } else if (isExplicitHtml) {
    primaryFormat = 'html'
    confidence = 0.95
  } else if (isJson) {
    try {
      JSON.parse(clean)
      primaryFormat = 'json'
      confidence = 0.98
    } catch {
      primaryFormat = 'text'
    }
  } else if (hasHeadings || hasCode || hasTables) {
    primaryFormat = 'markdown'
    confidence = 0.95
  } else if (hasMath) {
    primaryFormat = 'latex'
    confidence = 0.85
  } else if (/(\*\*|\*|_|~~|\[.+\]\(.+\))/.test(clean)) {
    primaryFormat = 'markdown'
    confidence = 0.85
  }

  const features: string[] = []
  if (primaryFormat === 'markdown') features.push('Markdown')
  if (primaryFormat === 'latex') features.push('LaTeX Document')
  if (primaryFormat === 'html') features.push('HTML')
  if (hasMath && primaryFormat !== 'latex') features.push('LaTeX Math')
  if (hasTables) features.push('Tables')
  if (hasCode) features.push('Code blocks')

  const summary = features.length > 0 ? features.join(' · ') : 'Plain Text'

  return {
    primaryFormat,
    hasMath,
    hasTables,
    hasCode,
    confidence,
    summary,
  }
}
