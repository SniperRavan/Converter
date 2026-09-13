import katex from 'katex'

/**
 * Lightweight XML AST representation for KaTeX MathML trees.
 */
interface XmlNode {
  tag: string
  attrs: Record<string, string>
  children: (XmlNode | string)[]
}

/**
 * Fast, dependency-free XML parser specifically designed for well-formed MathML trees from KaTeX.
 * Works uniformly in browser, node, web workers, and test environments.
 */
function parseSimpleXml(xml: string): XmlNode | null {
  const clean = xml.replace(/<\?xml[^>]*\?>/gi, '').trim()
  let pos = 0

  function parseNode(): XmlNode | string | null {
    if (pos >= clean.length) return null

    if (clean[pos] !== '<') {
      const nextTag = clean.indexOf('<', pos)
      const textEnd = nextTag === -1 ? clean.length : nextTag
      const text = clean.slice(pos, textEnd)
      pos = textEnd
      return text
    }

    if (clean.startsWith('<!--', pos)) {
      const end = clean.indexOf('-->', pos)
      pos = end === -1 ? clean.length : end + 3
      return ''
    }

    const tagEnd = clean.indexOf('>', pos)
    if (tagEnd === -1) return null

    const tagContent = clean.slice(pos + 1, tagEnd).trim()
    pos = tagEnd + 1

    const isSelfClosing = tagContent.endsWith('/')
    const cleanTag = isSelfClosing ? tagContent.slice(0, -1).trim() : tagContent

    const firstSpace = cleanTag.search(/\s/)
    const tag = (firstSpace === -1 ? cleanTag : cleanTag.slice(0, firstSpace)).toLowerCase()

    const attrs: Record<string, string> = {}
    if (firstSpace !== -1) {
      const attrStr = cleanTag.slice(firstSpace)
      const attrRegex = /([a-zA-Z0-9_:-]+)(?:="([^"]*)")?/g
      let m: RegExpExecArray | null
      while ((m = attrRegex.exec(attrStr)) !== null) {
        attrs[m[1]] = m[2] !== undefined ? m[2] : ''
      }
    }

    if (isSelfClosing) {
      return { tag, attrs, children: [] }
    }

    const children: (XmlNode | string)[] = []
    const closeTag = `</${tag}>`

    while (pos < clean.length) {
      if (clean.startsWith(closeTag, pos)) {
        pos += closeTag.length
        break
      }
      if (clean.startsWith('</', pos)) {
        const nextGt = clean.indexOf('>', pos)
        pos = nextGt === -1 ? clean.length : nextGt + 1
        break
      }
      const child = parseNode()
      if (child !== null && child !== '') {
        children.push(child)
      }
    }

    return { tag, attrs, children }
  }

  const result = parseNode()
  return typeof result === 'object' ? result : null
}

function formatSuperscript(innerHtml: string): string {
  return `<sup style="font-size: 0.75em; vertical-align: super; line-height: 0;">${innerHtml}</sup>`
}

function formatSubscript(innerHtml: string): string {
  return `<sub style="font-size: 0.75em; vertical-align: sub; line-height: 0;">${innerHtml}</sub>`
}

/**
 * Converts a MathML XML node into universal semantic HTML.
 * Universal semantic HTML uses standard elements (`<sup>`, `<sub>`, `<em>`, `<span>`)
 * that are preserved by 100% of rich text editors (Word, Google Docs, OneNote, LibreOffice, Notion).
 * Fractions include a two-story visual layout with horizontal bar, AND an invisible fallback slash
 * so that if an editor strips CSS styles, it renders `1/2m` instead of collapsing into `12m`.
 */
function xmlNodeToSemanticHtml(node: XmlNode | string): string {
  if (typeof node === 'string') return node
  if (!node) return ''

  switch (node.tag) {
    case 'math': {
      const isDisplay = node.attrs['display'] === 'block'
      const rawInner = node.children.map(xmlNodeToSemanticHtml).join('')
      const inner = rawInner.replace(/^(&nbsp;|\s)+|(&nbsp;|\s)+$/g, '')
      if (isDisplay) {
        return `<p class="math-block" align="center" style="text-align: center; margin: 12pt 0; font-family: 'Cambria Math', 'STIX Two Math', 'DejaVu Math TeX Gyre', 'Times New Roman', serif; font-size: 1.1em; line-height: 1.4;">${inner}</p>`
      }
      return `<span class="math-inline" style="font-family: 'Cambria Math', 'STIX Two Math', 'DejaVu Math TeX Gyre', 'Times New Roman', serif; font-size: 1.05em; font-style: normal; line-height: 1;">${inner}</span>`
    }

    case 'semantics': {
      const nonAnnotation = node.children.filter(
        (c) => typeof c === 'string' || c.tag !== 'annotation'
      )
      return nonAnnotation.map(xmlNodeToSemanticHtml).join('')
    }

    case 'annotation':
      return ''

    case 'mrow':
      return node.children.map(xmlNodeToSemanticHtml).join('')

    case 'mi': {
      const text = node.children.map(xmlNodeToSemanticHtml).join('').trim()
      if (!text) return ''
      // Single letter identifiers (Latin and Greek) are italicized by standard math typography
      if (/^[a-zA-Z\u0370-\u03FF]$/.test(text)) {
        return `<em style="font-style: italic;">${text}</em>`
      }
      return text
    }

    case 'mn':
      return node.children.map(xmlNodeToSemanticHtml).join('').trim()

    case 'mo': {
      const op = node.children.map(xmlNodeToSemanticHtml).join('').trim()
      if (!op) return ''
      // Sized large operators
      if (op === '∑' || op === '∫' || op === '∏' || op === '⋃' || op === '⋂') {
        return `<span style="font-size: 1.25em; line-height: 1; vertical-align: -0.1em;">${op}</span>`
      }
      // Binary relations and operators with non-breaking spaces for proper layout
      if (/^[=+\-−×÷±≠<>≤≥≈≡→←↔⇒⇔]$/.test(op)) {
        return `&nbsp;${op}&nbsp;`
      }
      if (op === ',') return ',&nbsp;'
      return op
    }

    case 'mfrac': {
      const elChildren = node.children.filter((c): c is XmlNode => typeof c !== 'string')
      const num = elChildren[0] ? xmlNodeToSemanticHtml(elChildren[0]) : ''
      const den = elChildren[1] ? xmlNodeToSemanticHtml(elChildren[1]) : ''
      // Two-story fraction with horizontal bar.
      // IMPORTANT: Contains a hidden slash fallback so if an application strips CSS styling,
      // the result is `1/2m` instead of `12m`.
      return `<span class="math-frac" style="display: inline-block; vertical-align: -0.38em; text-align: center; line-height: 1; padding: 0 2px;"><span style="display: block; border-bottom: 1px solid currentColor; padding-bottom: 1px; font-size: 0.88em; line-height: 1;">${num}</span><span style="display: none; font-size: 0; max-height: 0; max-width: 0; line-height: 0; mso-hide: all;">/</span><span style="display: block; padding-top: 1px; font-size: 0.88em; line-height: 1;">${den}</span></span>`
    }

    case 'msup': {
      const elChildren = node.children.filter((c): c is XmlNode => typeof c !== 'string')
      const base = elChildren[0] ? xmlNodeToSemanticHtml(elChildren[0]) : ''
      const sup = elChildren[1] ? xmlNodeToSemanticHtml(elChildren[1]) : ''
      return `${base}${formatSuperscript(sup)}`
    }

    case 'msub': {
      const elChildren = node.children.filter((c): c is XmlNode => typeof c !== 'string')
      const base = elChildren[0] ? xmlNodeToSemanticHtml(elChildren[0]) : ''
      const sub = elChildren[1] ? xmlNodeToSemanticHtml(elChildren[1]) : ''
      return `${base}${formatSubscript(sub)}`
    }

    case 'msubsup': {
      const elChildren = node.children.filter((c): c is XmlNode => typeof c !== 'string')
      const base = elChildren[0] ? xmlNodeToSemanticHtml(elChildren[0]) : ''
      const sub = elChildren[1] ? xmlNodeToSemanticHtml(elChildren[1]) : ''
      const sup = elChildren[2] ? xmlNodeToSemanticHtml(elChildren[2]) : ''
      return `${base}${formatSubscript(sub)}${formatSuperscript(sup)}`
    }

    case 'munder': {
      const elChildren = node.children.filter((c): c is XmlNode => typeof c !== 'string')
      const base = elChildren[0] ? xmlNodeToSemanticHtml(elChildren[0]) : ''
      const under = elChildren[1] ? xmlNodeToSemanticHtml(elChildren[1]) : ''
      return `${base}${formatSubscript(under)}`
    }

    case 'mover': {
      const elChildren = node.children.filter((c): c is XmlNode => typeof c !== 'string')
      const base = elChildren[0] ? xmlNodeToSemanticHtml(elChildren[0]) : ''
      const over = elChildren[1] ? xmlNodeToSemanticHtml(elChildren[1]) : ''
      return `${base}${formatSuperscript(over)}`
    }

    case 'munderover': {
      const elChildren = node.children.filter((c): c is XmlNode => typeof c !== 'string')
      const base = elChildren[0] ? xmlNodeToSemanticHtml(elChildren[0]) : ''
      const under = elChildren[1] ? xmlNodeToSemanticHtml(elChildren[1]) : ''
      const over = elChildren[2] ? xmlNodeToSemanticHtml(elChildren[2]) : ''
      return `${base}${formatSubscript(under)}${formatSuperscript(over)}`
    }

    case 'msqrt': {
      const inner = node.children.map(xmlNodeToSemanticHtml).join('')
      return `√<span style="text-decoration: overline; padding-left: 1px;">(${inner})</span>`
    }

    case 'mroot': {
      const elChildren = node.children.filter((c): c is XmlNode => typeof c !== 'string')
      const base = elChildren[0] ? xmlNodeToSemanticHtml(elChildren[0]) : ''
      const root = elChildren[1] ? xmlNodeToSemanticHtml(elChildren[1]) : ''
      return `<sup style="font-size: 0.75em; vertical-align: super; line-height: 0;">${root}</sup>√<span style="text-decoration: overline; padding-left: 1px;">(${base})</span>`
    }

    case 'mtable': {
      const inner = node.children.map(xmlNodeToSemanticHtml).join('')
      return `<table style="display: inline-table; vertical-align: middle; border-collapse: collapse; margin: 0 4px;"><tbody>${inner}</tbody></table>`
    }

    case 'mtr': {
      const inner = node.children.map(xmlNodeToSemanticHtml).join('')
      return `<tr>${inner}</tr>`
    }

    case 'mtd': {
      const inner = node.children.map(xmlNodeToSemanticHtml).join('')
      return `<td style="padding: 2px 4px; text-align: center;">${inner}</td>`
    }

    case 'mtext':
      return `<span>${node.children.map(xmlNodeToSemanticHtml).join('')}</span>`

    case 'mspace':
      return '&nbsp;'

    default:
      return node.children.map(xmlNodeToSemanticHtml).join('')
  }
}

/**
 * Converts a LaTeX formula into Universal Semantic HTML.
 * The output preserves superscripts, subscripts, fractions, and symbols when pasted
 * into any rich text editor (OneNote, Word, Google Docs, LibreOffice, Notion).
 */
export function renderMathToSemanticHtml(latex: string, displayMode = false): string {
  if (!latex || !latex.trim()) return ''
  try {
    const raw = katex.renderToString(latex, {
      displayMode,
      output: 'mathml',
      throwOnError: false,
    })
    const match = raw.match(/<math[\s\S]*<\/math>/)
    if (!match) throw new Error('No math tag found')
    const parsed = parseSimpleXml(match[0])
    if (!parsed) throw new Error('Failed to parse MathML')
    return xmlNodeToSemanticHtml(parsed)
  } catch {
    return `<span class="math-fallback">${latex}</span>`
  }
}

/**
 * Converts raw MathML XML string into Universal Semantic HTML.
 */
export function convertMathMlToSemanticHtml(mathml: string): string {
  try {
    const match = mathml.match(/<math[\s\S]*<\/math>/i)
    const xml = match ? match[0] : mathml
    const parsed = parseSimpleXml(xml)
    if (!parsed) return mathml
    return xmlNodeToSemanticHtml(parsed)
  } catch {
    return mathml
  }
}

