// Fast deterministic detector for pasted content or uploaded files

export interface DetectionResult {
  primaryFormat: 'markdown' | 'latex' | 'html' | 'text'
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

  const hasMath = /\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$|\\\[[\s\S]*?\\\]|\\\(.+?\\\)|\\[a-zA-Z]+/.test(content)
  const hasTables = /\|(.+)\|[\r\n]+\|[-:\s|]+\|/.test(content)
  const hasCode = /```[a-zA-Z0-9_-]*[\s\S]*?```/.test(content)
  const hasHeadings = /^(#{1,6}\s+.+|\S+\n[=-]{2,})/m.test(content)
  const hasHtml = /<\/?[a-z][\s\S]*>/i.test(content)

  let primaryFormat: 'markdown' | 'latex' | 'html' | 'text' = 'text'
  let confidence = 0.8

  if (hasHeadings || hasCode || hasTables || (hasMath && content.includes('#'))) {
    primaryFormat = 'markdown'
    confidence = 0.95
  } else if (content.startsWith('\\documentclass') || content.startsWith('\\begin{document}') || (hasMath && !content.includes('#'))) {
    primaryFormat = 'latex'
    confidence = 0.9
  } else if (hasHtml && (content.includes('<!DOCTYPE') || content.includes('<html') || content.includes('<body>'))) {
    primaryFormat = 'html'
    confidence = 0.9
  } else if (/(\*\*|\*|_|~~|\[.+\]\(.+\))/.test(content)) {
    primaryFormat = 'markdown'
    confidence = 0.85
  }

  const features: string[] = []
  if (primaryFormat === 'markdown') features.push('Markdown')
  if (hasMath) features.push('LaTeX Math')
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
