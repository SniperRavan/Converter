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

  // Strip HTML tags for clean markdown/text analysis so HTML attributes (like target="_blank") don't trigger markdown
  const contentWithoutTags = clean.replace(/<[^>]+>/g, ' ')

  // 1. Structural features
  const hasHeadings = /^#{1,6}\s+\S+/m.test(contentWithoutTags) || /^\S+.*[\r\n]+[=-]{3,}\s*$/m.test(contentWithoutTags)
  const hasTables = /\|(.+)\|[\r\n]+\|[-:\s|]+\|/.test(clean) || /\+[─━═=+-]{3,}\+/.test(clean)
  const hasCode = /```[a-zA-Z0-9_-]*[\s\S]*?```/.test(clean)
  const hasBlockquotes = /^>\s+\S+/m.test(contentWithoutTags)
  const hasBullets = /^[\s]*[-*+•]\s+\S+/m.test(contentWithoutTags)
  const hasMarkdownFormat = /(\*\*[^*]+\*\*|(?<!\w)_[^_]+_(?!\w)|~~[^~]+~~|\[.+\]\(.+\))/.test(contentWithoutTags)

  // Explicit LaTeX documents & structural commands
  // Strip fenced code blocks so code snippets inside markdown tutorials aren't falsely detected as whole documents
  const contentOutsideCode = clean.replace(/```[a-zA-Z0-9_-]*[\s\S]*?```/g, '').trim()
  const isFullLatex =
    contentOutsideCode.length > 0
      ? /\\documentclass\b/.test(contentOutsideCode) || /\\begin\{document\}/.test(contentOutsideCode)
      : /\\documentclass\b/.test(clean) || /\\begin\{document\}/.test(clean)
  const hasLineStartLatex =
    /^\s*\\(part|chapter|section|subsection|subsubsection|cvsection|cvsubsection|paragraph)\*?\s*\{/m.test(clean) ||
    /^\s*\\begin\{(equation|align|gather|tabular|figure|lstlisting|itemize|enumerate|abstract|thebibliography)\}/m.test(clean) ||
    /^\s*\\(usepackage|title|author|date)\s*\{/m.test(clean)

  const isExplicitLatex = isFullLatex || (hasLineStartLatex && !hasHeadings && !hasCode && !hasBlockquotes)

  // 2. Math expressions
  const hasMath =
    /\$\$[\s\S]*?\$\$|\$[^$\n]+?\$|\\\[[\s\S]*?\\\]|\\\(.+?\\\)|\b\\begin\{(equation|align|gather|multline|matrix|pmatrix|bmatrix|vmatrix|Vmatrix|cases|split)\}/.test(
      clean
    )

  // 3. JSON detection
  const isJson = (clean.startsWith('{') && clean.endsWith('}')) || (clean.startsWith('[') && clean.endsWith(']'))

  // 4. Explicit HTML detection (must not misclassify Markdown with HTML layout tags)
  const hasHtml = /<\/?[a-z][\s\S]*>/i.test(clean)
  const isFullHtml =
    clean.includes('<!DOCTYPE') ||
    clean.includes('<html') ||
    clean.includes('<body>') ||
    clean.includes('<head>')

  const startsWithHtmlTag =
    /^<\s*(?:!DOCTYPE|!--|html|head|body|style|script|div|article|section|main|p|table|thead|tbody|tr|th|td|h[1-6]|ul|ol|li|pre|code|figure|figcaption|blockquote|header|footer|aside|nav|form|span|svg|math)\b/i.test(
      clean
    )
  const closingHtmlTagCount = (
    clean.match(
      /<\/(?:html|body|style|script|div|article|section|main|p|table|tr|th|td|h[1-6]|ul|ol|li|pre|code|figure|figcaption|blockquote|header|footer|aside|nav|form|span|svg|math)>/gi
    ) || []
  ).length

  const isFragmentHtml =
    hasHtml &&
    (isFullHtml ||
      (startsWithHtmlTag && (closingHtmlTagCount > 0 || clean.endsWith('>'))) ||
      closingHtmlTagCount >= 3) &&
    !hasHeadings &&
    !hasCode
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
  } else if (hasHeadings || hasCode || hasTables || hasBlockquotes) {
    primaryFormat = 'markdown'
    confidence = 0.95
  } else if (hasMath) {
    primaryFormat = 'latex'
    confidence = 0.85
  } else if (hasBullets || hasMarkdownFormat) {
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
