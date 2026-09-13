import DOMPurify from 'dompurify'
import katex from 'katex'
import type { BlockNode, InlineNode, NormalizedDocument } from '../core/types'
import { latexToUnicode } from '../utils/mathUnicode'
import { renderMathToSemanticHtml } from '../utils/mathSemantic'

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
  mathMode?: 'images' | 'mathml' | 'latex' | 'semantic' | 'katex'
  cleanTables?: boolean
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
      .replace(/<semantics>\s*([\s\S]*?)\s*<\/semantics>/gi, '$1')
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

function renderInlineToHtml(node: InlineNode, mathMode: 'images' | 'mathml' | 'latex' | 'semantic' | 'katex' = 'mathml'): string {
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
      if (mathMode === 'katex') {
        try {
          return katex.renderToString(node.value, { displayMode: false, throwOnError: false })
        } catch {
          return `<span>$${escapeHtml(node.value)}$</span>`
        }
      }
      if (mathMode === 'semantic') {
        return renderMathToSemanticHtml(node.value, false)
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
    case 'link': {
      const isAnchor = node.url.startsWith('#')
      const targetAttr = isAnchor ? '' : ' target="_blank" rel="noopener noreferrer"'
      return `<a href="${escapeHtml(sanitizeUrl(node.url))}"${targetAttr}>${node.children.map(c => renderInlineToHtml(c, mathMode)).join('')}</a>`
    }
    case 'image':
      return `<img src="${escapeHtml(sanitizeUrl(node.url))}" alt="${escapeHtml(node.alt || '')}" />`
    default:
      return ''
  }
}

function renderBlockToHtml(
  block: BlockNode,
  mathMode: 'images' | 'mathml' | 'latex' | 'semantic' | 'katex' = 'mathml',
  cleanTables = false
): string {
  switch (block.type) {
    case 'heading': {
      const tag = `h${block.level}`
      const idAttr = block.id ? ` id="${escapeHtml(block.id)}"` : ''
      const content = block.children.map(c => renderInlineToHtml(c, mathMode)).join('')
      return `<${tag}${idAttr}>${content}</${tag}>`
    }

    case 'paragraph': {
      const idAttr = block.id ? ` id="${escapeHtml(block.id)}"` : ''
      const content = block.children.map(c => renderInlineToHtml(c, mathMode)).join('')
      const alignAttr = block.align ? ` align="${block.align}" style="text-align: ${block.align};"` : ''
      return `<p${idAttr}${alignAttr}>${content}</p>`
    }

    case 'blockquote': {
      let calloutType: 'note' | 'tip' | 'warning' | 'important' | 'caution' | null = block.calloutType || null
      const firstChild = block.children[0]
      if (!calloutType && firstChild && firstChild.type === 'paragraph' && firstChild.children.length > 0) {
        const firstInline = firstChild.children[0]
        if (firstInline && firstInline.type === 'text') {
          const match = firstInline.value.match(/^\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\]/i)
          if (match) calloutType = match[1].toLowerCase() as any
        }
      }

      if (calloutType) {
        const colors: Record<string, { border: string; bg: string; label: string }> = {
          note: { border: '#2563eb', bg: '#eff6ff', label: 'Note' },
          tip: { border: '#059669', bg: '#ecfdf5', label: 'Tip' },
          warning: { border: '#d97706', bg: '#fffbeb', label: 'Warning' },
          important: { border: '#7c3aed', bg: '#f5f3ff', label: 'Important' },
          caution: { border: '#dc2626', bg: '#fef2f2', label: 'Caution' },
        }
        const cfg = colors[calloutType]
        const clonedChildren = block.children.map((c, idx) => {
          if (idx === 0 && c.type === 'paragraph') {
            const inlines = [...c.children]
            if (inlines.length > 0 && inlines[0].type === 'text') {
              const stripped = inlines[0].value.replace(/^\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\]\s*/i, '').trimStart()
              return {
                ...c,
                children: [
                  { type: 'strong' as const, children: [{ type: 'text' as const, value: `${cfg.label}: ` }] },
                  { ...inlines[0], value: stripped },
                  ...inlines.slice(1),
                ],
              }
            } else {
              return {
                ...c,
                children: [
                  { type: 'strong' as const, children: [{ type: 'text' as const, value: `${cfg.label}: ` }] },
                  ...inlines,
                ],
              }
            }
          }
          return c
        })
        const inner = clonedChildren.map(c => renderBlockToHtml(c, mathMode, cleanTables)).join('\n')
        return `<div class="callout callout-${calloutType}" style="border-left: 4px solid ${cfg.border}; background-color: ${cfg.bg}; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">\n${inner}\n</div>`
      }

      const inner = block.children.map(c => renderBlockToHtml(c, mathMode, cleanTables)).join('\n')
      return `<blockquote>${inner}</blockquote>`
    }

    case 'codeBlock': {
      const langClass = block.language ? ` class="language-${escapeHtml(block.language)}"` : ''
      return `<pre><code${langClass}>${escapeHtml(block.value)}</code></pre>`
    }

    case 'mathBlock': {
      const idAttr = block.id ? ` id="${escapeHtml(block.id)}"` : ''
      if (mathMode === 'katex') {
        try {
          const rendered = katex.renderToString(block.value, { displayMode: true, throwOnError: false })
          return `<div${idAttr} class="math-block">${rendered}</div>`
        } catch {
          return `<pre${idAttr}><code>$$\n${escapeHtml(block.value)}\n$$</code></pre>`
        }
      }
      if (mathMode === 'semantic') {
        const rendered = renderMathToSemanticHtml(block.value, true)
        return idAttr ? `<div${idAttr} class="math-block">${rendered}</div>` : rendered
      }
      if (mathMode === 'images') {
        const unicodeText = escapeHtml(latexToUnicode(block.value) || block.value)
        const dataUri = renderMathToOfflineSvgDataUri(block.value, true)
        return `<div${idAttr} class="math-block" style="text-align: center; margin: 16px 0;"><img src="${dataUri}" class="latex-formula" alt="${unicodeText}" title="${unicodeText}" style="max-width: 100%; height: auto;" /></div>`
      }
      if (mathMode === 'mathml') {
        const mathml = renderMathToMathMl(block.value, true)
        return `<div${idAttr} class="math-block" style="text-align: center; margin: 16px 0;">${mathml}</div>`
      }
      return `<pre${idAttr}><code>$$\n${escapeHtml(block.value)}\n$$</code></pre>`
    }

    case 'list': {
      const tag = block.ordered ? 'ol' : 'ul'
      const idAttr = block.id ? ` id="${escapeHtml(block.id)}"` : ''
      const startAttr = block.ordered && block.start && block.start !== 1 ? ` start="${block.start}"` : ''
      const items = block.items
        .map((item) => {
          const itemIdAttr = item.id ? ` id="${escapeHtml(item.id)}"` : ''
          let isChecked: boolean | null = item.checked ?? null
          const content = item.children
            .map(child => {
              if ('type' in child && (child.type === 'paragraph' || child.type === 'heading')) {
                const cleanedChildren = child.children.map((c) => ({ ...c }))
                if (!block.ordered && cleanedChildren.length > 0 && cleanedChildren[0].type === 'text') {
                  if (/^\[x\]\s*/i.test(cleanedChildren[0].value)) {
                    if (isChecked === null) isChecked = true
                    cleanedChildren[0] = { ...cleanedChildren[0], value: cleanedChildren[0].value.replace(/^\[x\]\s*/i, '') }
                  } else if (/^\[ \]\s*/i.test(cleanedChildren[0].value)) {
                    if (isChecked === null) isChecked = false
                    cleanedChildren[0] = { ...cleanedChildren[0], value: cleanedChildren[0].value.replace(/^\[ \]\s*/i, '') }
                  }
                }
                return cleanedChildren.map(c => renderInlineToHtml(c, mathMode)).join('')
              }
              if ('type' in child && child.type === 'list') {
                return renderBlockToHtml(child, mathMode, cleanTables)
              }
              return ''
            })
            .join(' ')
          if (isChecked !== null) {
            const checkedAttr = isChecked ? ' checked=""' : ''
            return `<li${itemIdAttr} style="list-style-type: none;"><input type="checkbox"${checkedAttr} disabled="" style="margin-right: 6px; vertical-align: middle;" />${content}</li>`
          }
          return `<li${itemIdAttr}>${content}</li>`
        })
        .join('\n')
      return `<${tag}${idAttr}${startAttr}>\n${items}\n</${tag}>`
    }

    case 'table': {
      const hasHeaders = Boolean(block.headers && block.headers.length > 0)
      const hasRows = Boolean(block.rows && block.rows.length > 0)
      if (!hasHeaders && !hasRows) return ''

      const ths = hasHeaders
        ? block.headers
            .map((cell, idx) => {
              const align = block.alignments?.[idx] ? ` text-align: ${block.alignments[idx]};` : ''
              const style = cleanTables
                ? ` style="border: 1pt solid #cbd5e1; background-color: #f1f5f9; padding: 6pt 8pt; font-weight: bold;${align}"`
                : align ? ` style="${align.trim()}"` : ''
              const content = cell.children.map(c => renderInlineToHtml(c, mathMode)).join('')
              return `<th${style}>${content}</th>`
            })
            .join('')
        : ''

      const thead = hasHeaders ? `<thead><tr>${ths}</tr></thead>\n` : ''

      const rows = hasRows
        ? block.rows
            .map(row => {
              const tds = row.cells
                .map((cell, idx) => {
                  const align = block.alignments?.[idx] ? ` text-align: ${block.alignments[idx]};` : ''
                  const style = cleanTables
                    ? ` style="border: 1pt solid #cbd5e1; padding: 6pt 8pt;${align}"`
                    : align ? ` style="${align.trim()}"` : ''
                  const content = cell.children.map(c => renderInlineToHtml(c, mathMode)).join('')
                  return `<td${style}>${content}</td>`
                })
                .join('')
              return `<tr>${tds}</tr>`
            })
            .join('\n')
        : ''

      if (cleanTables) {
        return `<table border="1" cellpadding="6" cellspacing="0" style="width: 100%; border-collapse: collapse; margin: 14px 0; border: 1pt solid #cbd5e1; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">\n${thead}<tbody>\n${rows}\n</tbody>\n</table>`
      }

      return `<div class="table-container" style="overflow-x: auto; max-width: 100%; margin: 16px 0;">\n<table style="width: 100%; border-collapse: collapse;">\n${thead}<tbody>\n${rows}\n</tbody>\n</table>\n</div>`
    }

    case 'thematicBreak':
      if (block.isPageBreak) {
        return '<div class="page-break" style="page-break-before: always; break-before: page; margin: 2rem 0; height: 0; border: none;"></div>'
      }
      return '<hr />'

    case 'rawBlock':
      if (block.id) {
        return `<div id="${escapeHtml(block.id)}">${block.content}</div>`
      }
      return block.content

    default:
      return ''
  }
}

export function renderToHtml(doc: NormalizedDocument, options: HtmlRenderOptions = {}): string {
  const mathMode = options.mathMode || 'mathml'
  const cleanTables = Boolean(options.cleanTables)
  const rawHtml = (doc?.children || []).map(c => renderBlockToHtml(c, mathMode, cleanTables)).join('\n')

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
  <title>${escapeHtml(options.title || doc.metadata?.title || 'Converted Document')}</title>
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
