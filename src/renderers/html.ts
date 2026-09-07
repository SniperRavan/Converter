import DOMPurify from 'dompurify'
import katex from 'katex'
import type { BlockNode, InlineNode, NormalizedDocument } from '../core/types'
import { latexToUnicode } from '../utils/mathUnicode'

// Escape basic HTML entities for safety
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// Sanitize URLs to prevent javascript: or data: injection
function sanitizeUrl(url: string): string {
  const clean = url.trim()
  if (/^(javascript|vbscript):/i.test(clean)) {
    return '#blocked-unsafe-url'
  }
  return clean
}

export interface HtmlRenderOptions {
  includeWrapper?: boolean
  title?: string
  mathMode?: 'images' | 'mathml' | 'latex'
}

function renderMathToMathMl(latex: string, displayMode: boolean): string {
  try {
    const raw = katex.renderToString(latex, {
      displayMode,
      output: 'mathml',
      throwOnError: false,
    })
    return raw
      .replace(/<annotation[^>]*>[\s\S]*?<\/annotation>/gi, '')
      .replace(/^<span[^>]*>/, '')
      .replace(/<\/span>$/, '')
      .trim()
  } catch {
    const unicode = escapeHtml(latexToUnicode(latex) || latex)
    return displayMode ? `<p align="center">${unicode}</p>` : `<span>${unicode}</span>`
  }
}

function renderMathToOfflineSvgDataUri(latex: string, displayMode: boolean): string {
  const unicodeText = latexToUnicode(latex) || latex.trim()
  const fontSize = displayMode ? 16 : 14
  const paddingX = displayMode ? 16 : 6
  const charWidth = fontSize * 0.62
  const width = Math.max(Math.ceil(unicodeText.length * charWidth + paddingX * 2), displayMode ? 80 : 32)
  const height = displayMode ? 38 : 22
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="'Cambria Math','STIX Two Math','DejaVu Serif',serif" font-size="${fontSize}" fill="#0f172a">${escapeHtml(unicodeText)}</text></svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function renderInlineToHtml(node: InlineNode, mathMode: 'images' | 'mathml' | 'latex' = 'mathml'): string {
  switch (node.type) {
    case 'text':
      return escapeHtml(node.value)
    case 'strong':
      return `<strong>${node.children.map(c => renderInlineToHtml(c, mathMode)).join('')}</strong>`
    case 'emphasis':
      return `<em>${node.children.map(c => renderInlineToHtml(c, mathMode)).join('')}</em>`
    case 'strikethrough':
      return `<del>${node.children.map(c => renderInlineToHtml(c, mathMode)).join('')}</del>`
    case 'inlineCode':
      return `<code>${escapeHtml(node.value)}</code>`
    case 'inlineMath': {
      const trimmed = node.value.trim()
      if (!trimmed || /^(\.+|…)$/.test(trimmed)) {
        return `<span>$${escapeHtml(node.value)}$</span>`
      }
      if (mathMode === 'images') {
        const unicodeText = escapeHtml(latexToUnicode(node.value) || node.value)
        const dataUri = renderMathToOfflineSvgDataUri(node.value, false)
        return `<img src="${dataUri}" class="latex-formula" alt="${unicodeText}" title="${unicodeText}" style="vertical-align: -0.25em; display: inline-block; margin: 0 2px;" />`
      }
      if (mathMode === 'mathml') {
        return renderMathToMathMl(node.value, false)
      }
      return `<span>$${escapeHtml(node.value)}$</span>`
    }
    case 'link':
      return `<a href="${escapeHtml(sanitizeUrl(node.url))}" target="_blank" rel="noopener noreferrer">${node.children.map(c => renderInlineToHtml(c, mathMode)).join('')}</a>`
    case 'image':
      return `<img src="${escapeHtml(sanitizeUrl(node.url))}" alt="${escapeHtml(node.alt || '')}" />`
    default:
      return ''
  }
}

function renderBlockToHtml(block: BlockNode, mathMode: 'images' | 'mathml' | 'latex' = 'mathml'): string {
  switch (block.type) {
    case 'heading': {
      const tag = `h${block.level}`
      const content = block.children.map(c => renderInlineToHtml(c, mathMode)).join('')
      return `<${tag}>${content}</${tag}>`
    }

    case 'paragraph': {
      const content = block.children.map(c => renderInlineToHtml(c, mathMode)).join('')
      const alignAttr = block.align ? ` align="${block.align}" style="text-align: ${block.align};"` : ''
      return `<p${alignAttr}>${content}</p>`
    }

    case 'blockquote': {
      const inner = block.children.map(c => renderBlockToHtml(c, mathMode)).join('\n')
      return `<blockquote>${inner}</blockquote>`
    }

    case 'codeBlock': {
      const langClass = block.language ? ` class="language-${escapeHtml(block.language)}"` : ''
      return `<pre><code${langClass}>${escapeHtml(block.value)}</code></pre>`
    }

    case 'mathBlock': {
      if (mathMode === 'images') {
        const unicodeText = escapeHtml(latexToUnicode(block.value) || block.value)
        const dataUri = renderMathToOfflineSvgDataUri(block.value, true)
        return `<p align="center" style="text-align: center; margin: 12px 0;"><img src="${dataUri}" class="latex-formula" alt="${unicodeText}" title="${unicodeText}" style="display: inline-block; max-height: 60px;" /></p>`
      }
      if (mathMode === 'mathml') {
        return `<div class="math-block" align="center">\n${renderMathToMathMl(block.value, true)}\n</div>`
      }
      return `<div class="math-block">$$\n${escapeHtml(block.value)}\n$$</div>`
    }

    case 'list': {
      const tag = block.ordered ? 'ol' : 'ul'
      const startAttr = block.ordered && block.start && block.start !== 1 ? ` start="${block.start}"` : ''
      const items = block.items
        .map(item => {
          const content = item.children
            .map(child => {
              if ('type' in child && (child.type === 'paragraph' || child.type === 'heading')) {
                return child.children.map(c => renderInlineToHtml(c, mathMode)).join('')
              }
              if ('type' in child && child.type === 'list') {
                return renderBlockToHtml(child, mathMode)
              }
              return ''
            })
            .join(' ')
          return `<li>${content}</li>`
        })
        .join('\n')
      return `<${tag}${startAttr}>\n${items}\n</${tag}>`
    }

    case 'table': {
      const hasHeaders = Boolean(block.headers && block.headers.length > 0)
      const hasRows = Boolean(block.rows && block.rows.length > 0)
      if (!hasHeaders && !hasRows) return ''

      const ths = hasHeaders
        ? block.headers
            .map((cell, idx) => {
              const align = block.alignments?.[idx] ? ` style="text-align: ${block.alignments[idx]}"` : ''
              const content = cell.children.map(c => renderInlineToHtml(c, mathMode)).join('')
              return `<th${align}>${content}</th>`
            })
            .join('')
        : ''

      const thead = hasHeaders ? `<thead><tr>${ths}</tr></thead>\n` : ''

      const rows = hasRows
        ? block.rows
            .map(row => {
              const tds = row.cells
                .map((cell, idx) => {
                  const align = block.alignments?.[idx] ? ` style="text-align: ${block.alignments[idx]}"` : ''
                  const content = cell.children.map(c => renderInlineToHtml(c, mathMode)).join('')
                  return `<td${align}>${content}</td>`
                })
                .join('')
              return `<tr>${tds}</tr>`
            })
            .join('\n')
        : ''

      return `<div class="table-container" style="overflow-x: auto; max-width: 100%; margin: 16px 0;">\n<table style="width: 100%; border-collapse: collapse;">\n${thead}<tbody>\n${rows}\n</tbody>\n</table>\n</div>`
    }

    case 'thematicBreak':
      return '<hr />'

    case 'rawBlock':
      return block.content

    default:
      return ''
  }
}

export function renderToHtml(doc: NormalizedDocument, options: HtmlRenderOptions = {}): string {
  const mathMode = options.mathMode || 'mathml'
  const rawHtml = doc.children.map(c => renderBlockToHtml(c, mathMode)).join('\n')

  // Strict sanitization with DOMPurify while preserving images and math
  const sanitizedBody =
    typeof DOMPurify !== 'undefined' && typeof DOMPurify.sanitize === 'function'
      ? DOMPurify.sanitize(rawHtml, {
          USE_PROFILES: { html: true, mathMl: true, svg: true },
          ADD_TAGS: [
            'math', 'semantics', 'annotation', 'annotation-xml', 'mrow', 'mi', 'mo', 'mn',
            'mfrac', 'msup', 'msub', 'msubsup', 'munderover', 'munder', 'mover', 'msqrt',
            'mroot', 'mtable', 'mtr', 'mtd', 'mspace', 'mtext', 'mpadded', 'mphantom',
            'menclose', 'mstyle',
          ],
          ADD_ATTR: [
            'xmlns', 'display', 'displaystyle', 'scriptlevel', 'mathvariant', 'columnalign',
            'rowalign', 'rowlines', 'columnlines', 'linethickness', 'open', 'close',
            'separators', 'fence', 'stretchy', 'symmetric', 'lspace', 'rspace', 'minsize',
            'maxsize', 'data-math', 'src', 'alt', 'style', 'align', 'width', 'height',
            'valign', 'border', 'cellpadding', 'cellspacing', 'hspace', 'vspace',
            'class', 'id', 'target', 'rel', 'title',
          ],
        })
      : rawHtml

  if (!options.includeWrapper) {
    return sanitizedBody
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(options.title || 'Converted Document')}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #1e293b;
      max-width: 860px;
      margin: 40px auto;
      padding: 0 20px;
    }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #cbd5e1; padding: 10px 14px; }
    th { background: #f8fafc; font-weight: 600; }
    pre { background: #0f172a; color: #f8fafc; padding: 16px; border-radius: 8px; overflow-x: auto; }
    code { font-family: monospace; font-size: 0.9em; }
    blockquote { border-left: 4px solid #3b82f6; margin: 20px 0; padding-left: 16px; color: #64748b; }
    .math-block { margin: 18px 0; text-align: center; }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body>
${sanitizedBody}
</body>
</html>`
}
