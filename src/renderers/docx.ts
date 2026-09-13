import { zipSync, strToU8 } from 'fflate'
import katex from 'katex'
import { mml2omml } from 'mathml2omml'
import type {
  BlockNode,
  InlineNode,
  NormalizedDocument,
  HeadingNode,
  ParagraphNode,
  TableNode,
  TableCellNode,
  CodeBlockNode,
  MathBlockNode,
  ListNode,
  ThematicBreakNode,
} from '../core/types'
import { latexToUnicode } from '../utils/mathUnicode'

function escapeXml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function unescapeXml(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

interface XmlNode {
  tag: string
  attrs: Record<string, string>
  children: (XmlNode | string)[]
}

function parseXmlTree(xml: string): XmlNode | null {
  const clean = xml.replace(/<\?xml[^>]*\?>/gi, '').trim()
  let pos = 0

  function parseNode(): XmlNode | string | null {
    if (pos >= clean.length) return null

    if (clean[pos] !== '<') {
      const nextTag = clean.indexOf('<', pos)
      const textEnd = nextTag === -1 ? clean.length : nextTag
      const text = clean.slice(pos, textEnd)
      pos = textEnd
      return unescapeXml(text)
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
    const tag = firstSpace === -1 ? cleanTag : cleanTag.slice(0, firstSpace)

    const attrs: Record<string, string> = {}
    if (firstSpace !== -1) {
      const attrStr = cleanTag.slice(firstSpace)
      const attrRegex = /([a-zA-Z0-9_:-]+)(?:="([^"]*)")?/g
      let m: RegExpExecArray | null
      while ((m = attrRegex.exec(attrStr)) !== null) {
        attrs[m[1]] = m[2] !== undefined ? unescapeXml(m[2]) : ''
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

  const res = parseNode()
  return typeof res === 'object' ? res : null
}

function cleanOmmlNode(node: XmlNode | string): XmlNode | string | null {
  if (typeof node === 'string') return node

  if (node.tag === 'm:sty' && (node.attrs['m:val'] === 'undefined' || !node.attrs['m:val'])) {
    return null
  }
  if (node.tag === 'w:rPr' && node.children.length === 0) {
    return null
  }

  const newChildren: (XmlNode | string)[] = []

  for (const child of node.children) {
    if (typeof child === 'string') {
      const text = child.trim()
      if (!text) continue
      if (node.tag !== 'm:t') {
        newChildren.push({
          tag: 'm:r',
          attrs: {},
          children: [
            {
              tag: 'm:t',
              attrs: { 'xml:space': 'preserve' },
              children: [child],
            },
          ],
        })
      } else {
        newChildren.push(child)
      }
    } else {
      const cleaned = cleanOmmlNode(child)
      if (cleaned !== null) {
        newChildren.push(cleaned)
      }
    }
  }

  return {
    tag: node.tag,
    attrs: node.attrs,
    children: newChildren,
  }
}

function serializeXml(node: XmlNode | string): string {
  if (typeof node === 'string') return escapeXml(node)
  const attrStr = Object.entries(node.attrs)
    .map(([k, v]) => ` ${k}="${escapeXml(v)}"`)
    .join('')
  if (node.children.length === 0) {
    return `<${node.tag}${attrStr}/>`
  }
  const inner = node.children.map((c) => (typeof c === 'string' ? escapeXml(c) : serializeXml(c))).join('')
  return `<${node.tag}${attrStr}>${inner}</${node.tag}>`
}

export function sanitizeOmml(omml: string): string {
  if (!omml) return ''
  const tree = parseXmlTree(omml)
  if (!tree) return omml
  const cleaned = cleanOmmlNode(tree)
  if (!cleaned) return omml
  return serializeXml(cleaned)
}

interface RunStyle {
  bold?: boolean
  italic?: boolean
  strike?: boolean
  code?: boolean
  color?: string
  size?: number
  underline?: boolean
}

function cleanLatexMath(latex: string): string {
  return (latex || '')
    .replace(/^\s*\$\$\s*/, '')
    .replace(/\s*\$\$\s*$/, '')
    .replace(/^\s*\$\s*/, '')
    .replace(/\s*\$\s*$/, '')
    .replace(/^\s*\\\[\s*/, '')
    .replace(/\s*\\\]\s*$/, '')
    .replace(/^\s*\\\(\s*/, '')
    .replace(/\s*\\\)\s*$/, '')
    .trim()
}

export function latexToOmml(latex: string, displayMode: boolean): string {
  const cleanLatex = cleanLatexMath(latex)

  if (!cleanLatex) return ''

  try {
    const raw = katex.renderToString(cleanLatex, {
      displayMode,
      output: 'mathml',
      throwOnError: false,
    })
    const cleanMathml = raw
      .replace(/<annotation[^>]*>[\s\S]*?<\/annotation>/gi, '')
      .replace(/<semantics>\s*([\s\S]*?)\s*<\/semantics>/gi, '$1')
      .replace(/^<span[^>]*>/, '')
      .replace(/<\/span>$/, '')
      .trim()
    const rawOmml = mml2omml(cleanMathml)
    if (!rawOmml) {
      const fallbackText = latexToUnicode(cleanLatex) || cleanLatex
      return `<m:oMath><m:r><m:t xml:space="preserve">${escapeXml(fallbackText)}</m:t></m:r></m:oMath>`
    }
    return sanitizeOmml(rawOmml)
  } catch {
    const fallbackText = latexToUnicode(cleanLatex) || cleanLatex
    return `<m:oMath><m:r><m:t xml:space="preserve">${escapeXml(fallbackText)}</m:t></m:r></m:oMath>`
  }
}

interface MathRunContext {
  vertAlign?: 'subscript' | 'superscript'
  position?: number
  sz?: number
  noItalic?: boolean
}

function getNodeText(node: XmlNode | string): string {
  if (typeof node === 'string') return node
  return node.children.map(getNodeText).join('')
}

function mathmlNodeToOpenXmlRuns(node: XmlNode | string, ctx: MathRunContext = {}): string {
  if (!node) return ''
  if (typeof node === 'string') {
    const text = node.trim()
    if (!text) return ''
    const vertAlignXml = ctx.vertAlign ? `<w:vertAlign w:val="${ctx.vertAlign}"/>` : ''
    const positionXml = ctx.position !== undefined ? `<w:position w:val="${ctx.position}"/>` : ''
    return `<w:r><w:rPr><w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math" w:cs="DejaVu Sans"/><w:sz w:val="${ctx.sz || 24}"/>${vertAlignXml}${positionXml}</w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`
  }

  const { tag, children } = node
  const sz = ctx.sz || (ctx.vertAlign ? 18 : 24)
  const vertAlignXml = ctx.vertAlign ? `<w:vertAlign w:val="${ctx.vertAlign}"/>` : ''
  const positionXml = ctx.position !== undefined ? `<w:position w:val="${ctx.position}"/>` : ''
  const baseRPr = `<w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math" w:cs="DejaVu Sans"/><w:sz w:val="${sz}"/>${vertAlignXml}${positionXml}`

  switch (tag) {
    case 'math':
    case 'semantics':
    case 'mrow':
    case 'mstyle':
      return children.map((c) => mathmlNodeToOpenXmlRuns(c, ctx)).join('')

    case 'mi': {
      const text = getNodeText(node).trim()
      if (!text) return ''
      // Single letter identifiers (Latin or Greek) are italicized in math
      const isSingleLetter = text.length === 1 || /^[\u0370-\u03FF]$/.test(text)
      const isItalic = isSingleLetter && !ctx.noItalic
      const iXml = isItalic ? '<w:i/>' : ''
      return `<w:r><w:rPr>${baseRPr}${iXml}</w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`
    }

    case 'mn': {
      const text = getNodeText(node).trim()
      if (!text) return ''
      return `<w:r><w:rPr>${baseRPr}</w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`
    }

    case 'mo': {
      let text = getNodeText(node).trim()
      if (!text) return ''
      if (text === '&minus;' || text === '−') text = '−'

      const isBigOp = /^[∑∏∫∬∭∮]$/.test(text)
      if (isBigOp) {
        return `<w:r><w:rPr><w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math" w:cs="DejaVu Sans"/><w:sz w:val="34"/></w:rPr><w:t xml:space="preserve"> ${escapeXml(text)}</w:t></w:r>`
      }

      // Spaced binary operators and relations (suppress wide spaces in subscripts/superscripts)
      const isSpaced = !ctx.vertAlign && ctx.position === undefined && /^[=+\-−×÷±≠≈≤≥→←]$/.test(text)
      const formattedText = isSpaced ? ` ${text} ` : text
      return `<w:r><w:rPr>${baseRPr}</w:rPr><w:t xml:space="preserve">${escapeXml(formattedText)}</w:t></w:r>`
    }

    case 'msub': {
      const [base, sub] = children
      const baseText = getNodeText(base).trim()
      const isBigOp = /^[∑∏∫∬∭∮]$/.test(baseText)
      const baseRuns = mathmlNodeToOpenXmlRuns(base, ctx)
      const subRuns = mathmlNodeToOpenXmlRuns(sub, { ...ctx, vertAlign: 'subscript', sz: 18 })
      if (isBigOp) {
        const opSpace = `<w:r><w:rPr><w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math"/><w:sz w:val="${ctx.sz || 24}"/></w:rPr><w:t xml:space="preserve"> </w:t></w:r>`
        return baseRuns + subRuns + opSpace
      }
      return baseRuns + subRuns
    }

    case 'msup': {
      const [base, sup] = children
      const baseRuns = mathmlNodeToOpenXmlRuns(base, ctx)
      const supRuns = mathmlNodeToOpenXmlRuns(sup, { ...ctx, vertAlign: 'superscript', sz: 18 })
      return baseRuns + supRuns
    }

    case 'msubsup':
    case 'munderover': {
      const [base, sub, sup] = children
      const baseText = getNodeText(base).trim()
      const isBigOp = /^[∑∏∫∬∭∮]$/.test(baseText)

      if (isBigOp) {
        const baseRuns = mathmlNodeToOpenXmlRuns(base, ctx)
        const subRuns = mathmlNodeToOpenXmlRuns(sub, { ...ctx, vertAlign: 'subscript', sz: 16 })
        const supRuns = mathmlNodeToOpenXmlRuns(sup, { ...ctx, vertAlign: 'superscript', sz: 16 })
        const opSpace = `<w:r><w:rPr><w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math"/><w:sz w:val="${ctx.sz || 24}"/></w:rPr><w:t xml:space="preserve"> </w:t></w:r>`
        return baseRuns + subRuns + supRuns + opSpace
      }

      return (
        mathmlNodeToOpenXmlRuns(base, ctx) +
        mathmlNodeToOpenXmlRuns(sub, { ...ctx, vertAlign: 'subscript', sz: 18 }) +
        mathmlNodeToOpenXmlRuns(sup, { ...ctx, vertAlign: 'superscript', sz: 18 })
      )
    }

    case 'munder': {
      const [base, under] = children
      const baseText = getNodeText(base).trim()
      const isBigOp = /^[∑∏∫∬∭∮]$/.test(baseText)
      const baseRuns = mathmlNodeToOpenXmlRuns(base, ctx)
      const underRuns = mathmlNodeToOpenXmlRuns(under, { ...ctx, vertAlign: 'subscript', sz: 18 })
      if (isBigOp) {
        const opSpace = `<w:r><w:rPr><w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math"/><w:sz w:val="${ctx.sz || 24}"/></w:rPr><w:t xml:space="preserve"> </w:t></w:r>`
        return baseRuns + underRuns + opSpace
      }
      return baseRuns + underRuns
    }

    case 'mover': {
      const [base, over] = children
      return (
        mathmlNodeToOpenXmlRuns(base, ctx) +
        mathmlNodeToOpenXmlRuns(over, { ...ctx, vertAlign: 'superscript', sz: 18 })
      )
    }

    case 'mfrac': {
      const [num, den] = children
      const numTxt = getNodeText(num).trim()
      const denTxt = getNodeText(den).trim()
      const numSimple = numTxt.length <= 2 && !/[=+\-−/]/.test(numTxt)
      const denSimple = denTxt.length <= 1 && !/[=+\-−/]/.test(denTxt)

      const numPart = numSimple
        ? mathmlNodeToOpenXmlRuns(num, ctx)
        : `<w:r><w:rPr>${baseRPr}</w:rPr><w:t>(</w:t></w:r>${mathmlNodeToOpenXmlRuns(num, ctx)}<w:r><w:rPr>${baseRPr}</w:rPr><w:t>)</w:t></w:r>`
      const slash = `<w:r><w:rPr>${baseRPr}</w:rPr><w:t>/</w:t></w:r>`
      const denPart = denSimple
        ? mathmlNodeToOpenXmlRuns(den, ctx)
        : `<w:r><w:rPr>${baseRPr}</w:rPr><w:t>(</w:t></w:r>${mathmlNodeToOpenXmlRuns(den, ctx)}<w:r><w:rPr>${baseRPr}</w:rPr><w:t>)</w:t></w:r>`

      return numPart + slash + denPart
    }

    case 'msqrt': {
      const inner = children.map((c) => mathmlNodeToOpenXmlRuns(c, ctx)).join('')
      return `<w:r><w:rPr>${baseRPr}</w:rPr><w:t>√(</w:t></w:r>${inner}<w:r><w:rPr>${baseRPr}</w:rPr><w:t>)</w:t></w:r>`
    }

    case 'mroot': {
      const [base, root] = children
      const rootRuns = mathmlNodeToOpenXmlRuns(root, { ...ctx, vertAlign: 'superscript', sz: 18 })
      const baseRuns = mathmlNodeToOpenXmlRuns(base, ctx)
      return `${rootRuns}<w:r><w:rPr>${baseRPr}</w:rPr><w:t>√(</w:t></w:r>${baseRuns}<w:r><w:rPr>${baseRPr}</w:rPr><w:t>)</w:t></w:r>`
    }

    case 'mtext': {
      const text = getNodeText(node).trim()
      return `<w:r><w:rPr>${baseRPr}</w:rPr><w:t xml:space="preserve"> ${escapeXml(text)} </w:t></w:r>`
    }

    default:
      return children.map((c) => mathmlNodeToOpenXmlRuns(c, ctx)).join('')
  }
}

export function latexToOpenXmlRuns(latex: string, displayMode: boolean): string {
  const cleanLatex = cleanLatexMath(latex)
  if (!cleanLatex) return ''

  try {
    const raw = katex.renderToString(cleanLatex, {
      displayMode,
      output: 'mathml',
      throwOnError: false,
    })
    const cleanMathml = raw
      .replace(/<annotation[^>]*>[\s\S]*?<\/annotation>/gi, '')
      .replace(/^<span[^>]*>/, '')
      .replace(/<\/span>$/, '')
      .trim()
    const tree = parseXmlTree(cleanMathml)
    if (tree) {
      const runs = mathmlNodeToOpenXmlRuns(tree, { sz: displayMode ? 26 : 24 })
      if (runs.trim()) return runs
    }
  } catch {
    // Fall through to unicode fallback below
  }

  const fallbackText = latexToUnicode(cleanLatex) || cleanLatex
  return `<w:r><w:rPr><w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math" w:cs="DejaVu Sans"/><w:sz w:val="${displayMode ? 26 : 24}"/></w:rPr><w:t xml:space="preserve">${escapeXml(fallbackText)}</w:t></w:r>`
}

function renderInlineToOpenXml(node: InlineNode, style: RunStyle = {}, mathMode: 'omml' | 'compatible' = 'omml'): string {
  switch (node.type) {
    case 'text': {
      let rPr = ''
      if (style.bold) rPr += '<w:b/>'
      if (style.italic) rPr += '<w:i/>'
      if (style.strike) rPr += '<w:strike/>'
      if (style.color) rPr += `<w:color w:val="${style.color}"/>`
      if (style.size) rPr += `<w:sz w:val="${style.size}"/>`
      if (style.underline) rPr += '<w:u w:val="single"/>'
      if (style.code) {
        rPr += '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="19"/><w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/>'
      }
      const rPrXml = rPr ? `<w:rPr>${rPr}</w:rPr>` : ''
      if (node.value.includes('\n')) {
        const parts = node.value.split('\n')
        return parts
          .map((part) => `<w:r>${rPrXml}<w:t xml:space="preserve">${escapeXml(part)}</w:t></w:r>`)
          .join('<w:r><w:br/></w:r>')
      }
      return `<w:r>${rPrXml}<w:t xml:space="preserve">${escapeXml(node.value)}</w:t></w:r>`
    }

    case 'strong':
      return node.children.map((c) => renderInlineToOpenXml(c, { ...style, bold: true }, mathMode)).join('')

    case 'emphasis':
      return node.children.map((c) => renderInlineToOpenXml(c, { ...style, italic: true }, mathMode)).join('')

    case 'strikethrough':
      return node.children.map((c) => renderInlineToOpenXml(c, { ...style, strike: true }, mathMode)).join('')

    case 'inlineCode': {
      const codeRPr = '<w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="19"/><w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/></w:rPr>'
      return `<w:r>${codeRPr}<w:t xml:space="preserve">${escapeXml(node.value)}</w:t></w:r>`
    }

    case 'inlineMath': {
      const clean = cleanLatexMath(node.value)
      if (mathMode === 'compatible') {
        return latexToOpenXmlRuns(clean, false)
      }
      const omml = latexToOmml(clean, false)
      if (omml) return omml
      const fallbackText = latexToUnicode(clean) || clean
      return `<w:r><w:rPr><w:rFonts w:ascii="Cambria Math" w:hAnsi="Cambria Math" w:cs="DejaVu Sans"/></w:rPr><w:t xml:space="preserve">${escapeXml(fallbackText)}</w:t></w:r>`
    }

    case 'link': {
      const linkStyle = { ...style, color: '2563EB', underline: true }
      if (node.children && node.children.length > 0) {
        return node.children.map((c) => renderInlineToOpenXml(c, linkStyle, mathMode)).join('')
      }
      return `<w:r><w:rPr><w:color w:val="2563EB"/><w:u w:val="single"/></w:rPr><w:t xml:space="preserve">${escapeXml(node.url)}</w:t></w:r>`
    }

    case 'image': {
      const altText = node.alt || node.title || 'Image'
      return `<w:r><w:rPr><w:i/><w:color w:val="64748B"/></w:rPr><w:t xml:space="preserve">[Image: ${escapeXml(altText)}]</w:t></w:r>`
    }

    default:
      return ''
  }
}

function renderBlockToOpenXml(block: BlockNode, mathMode: 'omml' | 'compatible' = 'omml'): string {
  switch (block.type) {
    case 'heading': {
      const hNode = block as HeadingNode
      const sizes: Record<number, number> = { 1: 36, 2: 28, 3: 24, 4: 22, 5: 20, 6: 18 }
      const sz = sizes[hNode.level] || 24
      const jc = hNode.level === 1 ? '<w:jc w:val="center"/>' : ''
      const border = hNode.level === 2 ? '<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="2" w:color="003884"/></w:pBdr>' : ''
      const color = hNode.level <= 2 ? '003884' : '1E293B'
      const inlines = hNode.children.map((c) => renderInlineToOpenXml(c, { bold: true, size: sz, color }, mathMode)).join('')

      return `<w:p><w:pPr>${jc}${border}<w:spacing w:before="240" w:after="120"/></w:pPr>${inlines}</w:p>`
    }

    case 'paragraph': {
      const pNode = block as ParagraphNode
      const nonWhitespace = pNode.children.filter((c) => c.type !== 'text' || c.value.trim().length > 0)
      if (nonWhitespace.length === 1 && nonWhitespace[0].type === 'inlineMath') {
        const mathNode = nonWhitespace[0]
        const clean = cleanLatexMath(mathNode.value)
        if (mathMode === 'compatible') {
          const runs = latexToOpenXmlRuns(clean, true)
          return `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="160" w:after="160"/></w:pPr>${runs}</w:p>`
        }
        const omml = latexToOmml(clean, true)
        if (omml) {
          return `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="160" w:after="160"/></w:pPr><m:oMathPara><m:oMathParaPr><m:jc m:val="center"/></m:oMathParaPr>${omml}</m:oMathPara></w:p>`
        }
        const fallbackRuns = latexToOpenXmlRuns(clean, true)
        return `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="160" w:after="160"/></w:pPr>${fallbackRuns}</w:p>`
      }
      const inlines = pNode.children.map((c) => renderInlineToOpenXml(c, {}, mathMode)).join('')
      const align = pNode.align ? `<w:jc w:val="${pNode.align}"/>` : ''
      return `<w:p><w:pPr>${align}<w:spacing w:after="140" w:line="276" w:lineRule="auto"/></w:pPr>${inlines}</w:p>`
    }

    case 'mathBlock': {
      const mNode = block as MathBlockNode
      const clean = cleanLatexMath(mNode.value)
      if (mathMode === 'compatible') {
        const runs = latexToOpenXmlRuns(clean, true)
        return `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="160" w:after="160"/></w:pPr>${runs}</w:p>`
      }
      const omml = latexToOmml(clean, true)
      if (omml) {
        return `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="160" w:after="160"/></w:pPr><m:oMathPara><m:oMathParaPr><m:jc m:val="center"/></m:oMathParaPr>${omml}</m:oMathPara></w:p>`
      }
      const fallbackRuns = latexToOpenXmlRuns(clean, true)
      return `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="160" w:after="160"/></w:pPr>${fallbackRuns}</w:p>`
    }

    case 'codeBlock': {
      const cNode = block as CodeBlockNode
      const lines = (cNode.value || '').split('\n')
      const codeParagraphs = lines.map((line: string) =>
        `<w:p><w:pPr><w:pBdr><w:left w:val="single" w:sz="12" w:space="4" w:color="CBD5E1"/></w:pBdr><w:shd w:val="clear" w:color="auto" w:fill="F8FAFC"/><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="19"/><w:color w:val="0F172A"/></w:rPr><w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r></w:p>`
      ).join('')
      return codeParagraphs + '<w:p><w:pPr><w:spacing w:after="120"/></w:pPr></w:p>'
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

      const calloutConfig: Record<string, { border: string; fill: string; title: string }> = {
        note: { border: '2563EB', fill: 'EFF6FF', title: 'Note' },
        tip: { border: '059669', fill: 'ECFDF5', title: 'Tip' },
        warning: { border: 'D97706', fill: 'FFFBEB', title: 'Warning' },
        important: { border: '7C3AED', fill: 'F5F3FF', title: 'Important' },
        caution: { border: 'DC2626', fill: 'FEF2F2', title: 'Caution' },
      }

      const conf = calloutType ? calloutConfig[calloutType] : null
      const borderColor = conf ? conf.border : '94A3B8'
      const borderSz = conf ? '36' : '24'
      const shd = conf ? `<w:shd w:val="clear" w:color="auto" w:fill="${conf.fill}"/>` : ''

      return block.children.map((child, cIdx) => {
        if (child.type === 'paragraph') {
          const cleanedChildren = child.children.map((c) => ({ ...c }))
          let prefixXml = ''
          if (conf && cIdx === 0) {
            if (cleanedChildren.length > 0 && cleanedChildren[0].type === 'text') {
              const rawVal = cleanedChildren[0].value.replace(/^\[!(NOTE|TIP|WARNING|IMPORTANT|CAUTION)\]\s*/i, '').trimStart()
              cleanedChildren[0] = { ...cleanedChildren[0], value: rawVal }
            }
            prefixXml = `<w:r><w:rPr><w:b/><w:color w:val="${conf.border}"/><w:sz w:val="21"/></w:rPr><w:t xml:space="preserve">${conf.title}: </w:t></w:r>`
          }
          const inlines = cleanedChildren.map((c) => renderInlineToOpenXml(c, { italic: !conf, color: conf ? '1E293B' : '475569' }, mathMode)).join('')
          return `<w:p><w:pPr><w:pBdr><w:left w:val="single" w:sz="${borderSz}" w:space="10" w:color="${borderColor}"/></w:pBdr>${shd}<w:ind w:left="400" w:right="200"/><w:spacing w:before="80" w:after="80"/></w:pPr>${prefixXml}${inlines}</w:p>`
        }
        return renderBlockToOpenXml(child, mathMode)
      }).join('')
    }

    case 'list': {
      const lNode = block as ListNode
      return lNode.items.map((item, idx) => {
        let bullet = lNode.ordered ? `${(lNode.start || 1) + idx}.` : '•'
        let isTask = false
        if (!lNode.ordered) {
          if (item.checked === true) {
            bullet = '☑'
            isTask = true
          } else if (item.checked === false) {
            bullet = '☐'
            isTask = true
          } else {
            const firstP = item.children[0]
            if (firstP && firstP.type === 'paragraph' && firstP.children.length > 0) {
              const firstInline = firstP.children[0]
              if (firstInline && firstInline.type === 'text') {
                if (/^\[x\]\s*/i.test(firstInline.value)) {
                  bullet = '☑'
                  isTask = true
                  firstInline.value = firstInline.value.replace(/^\[x\]\s*/i, '')
                } else if (/^\[ \]\s*/i.test(firstInline.value)) {
                  bullet = '☐'
                  isTask = true
                  firstInline.value = firstInline.value.replace(/^\[ \]\s*/i, '')
                }
              }
            }
          }
        }
        let nestedXml = ''
        const inlines = item.children.map((child) => {
          if (child.type === 'paragraph') return child.children.map((c) => renderInlineToOpenXml(c, {}, mathMode)).join('')
          if (child.type === 'list') {
            nestedXml += renderBlockToOpenXml(child, mathMode)
            return ''
          }
          if ('children' in child) return (child.children as InlineNode[]).map((c) => renderInlineToOpenXml(c, {}, mathMode)).join('')
          return ''
        }).join('')

        const bulletColor = isTask ? '0F172A' : '334155'
        const itemP = `<w:p><w:pPr><w:ind w:left="480" w:hanging="240"/><w:spacing w:after="60"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="${bulletColor}"/></w:rPr><w:t xml:space="preserve">${bullet} </w:t></w:r>${inlines}</w:p>`
        return itemP + nestedXml
      }).join('')
    }

    case 'table': {
      const tNode = block as TableNode
      const hasHeaders = tNode.headers && tNode.headers.length > 0
      const hasRows = tNode.rows && tNode.rows.length > 0
      if (!hasHeaders && !hasRows) return ''

      const colCount = Math.max(
        hasHeaders ? tNode.headers.length : 0,
        ...((tNode.rows || []).map((r) => r.cells.length))
      )
      if (colCount === 0) return ''

      const totalWidthDxa = 9360
      let colWidths: number[] = []
      if (colCount === 1) {
        colWidths = [totalWidthDxa]
      } else if (colCount === 2) {
        colWidths = [4680, 4680]
      } else if (colCount === 3) {
        colWidths = [3744, 2808, 2808]
      } else if (colCount === 4) {
        colWidths = [3744, 1872, 1872, 1872]
      } else {
        const baseW = Math.floor(totalWidthDxa / colCount)
        colWidths = Array(colCount).fill(baseW)
        colWidths[0] += totalWidthDxa - baseW * colCount
      }

      const gridXml = `<w:tblGrid>${colWidths.map((w) => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>`

      let trs = ''
      if (hasHeaders) {
        const ths = tNode.headers.map((cell: TableCellNode, idx: number) => {
          const inlines = cell.children.map((c: InlineNode) => renderInlineToOpenXml(c, { bold: true }, mathMode)).join('')
          const align = tNode.alignments?.[idx] ? `<w:jc w:val="${tNode.alignments[idx]}"/>` : ''
          const w = colWidths[idx] || Math.floor(totalWidthDxa / colCount)
          return `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/><w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/><w:tcMar><w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/><w:left w:w="160" w:type="dxa"/><w:right w:w="160" w:type="dxa"/></w:tcMar></w:tcPr><w:p><w:pPr>${align}<w:spacing w:after="0"/></w:pPr>${inlines}</w:p></w:tc>`
        }).join('')
        trs += `<w:tr><w:trPr><w:tblHeader/></w:trPr>${ths}</w:tr>`
      }

      if (hasRows) {
        for (const row of tNode.rows) {
          const tds = row.cells.map((cell: TableCellNode, idx: number) => {
            const inlines = cell.children.map((c: InlineNode) => renderInlineToOpenXml(c, {}, mathMode)).join('')
            const align = tNode.alignments?.[idx] ? `<w:jc w:val="${tNode.alignments[idx]}"/>` : ''
            const w = colWidths[idx] || Math.floor(totalWidthDxa / colCount)
            return `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/><w:tcMar><w:top w:w="100" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:left w:w="160" w:type="dxa"/><w:right w:w="160" w:type="dxa"/></w:tcMar></w:tcPr><w:p><w:pPr>${align}<w:spacing w:after="0"/></w:pPr>${inlines}</w:p></w:tc>`
          }).join('')
          trs += `<w:tr>${tds}</w:tr>`
        }
      }

      return `<w:tbl>
        <w:tblPr>
          <w:tblW w:w="${totalWidthDxa}" w:type="dxa"/>
          <w:tblLayout w:type="fixed"/>
          <w:tblBorders>
            <w:top w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
            <w:left w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
            <w:bottom w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
            <w:right w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
            <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
            <w:insideV w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
          </w:tblBorders>
        </w:tblPr>
        ${gridXml}
        ${trs}
      </w:tbl><w:p><w:pPr><w:spacing w:after="160"/></w:pPr></w:p>`
    }

    case 'thematicBreak':
      if ((block as ThematicBreakNode).isPageBreak) {
        return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'
      }
      return '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="8" w:space="1" w:color="CBD5E1"/></w:pBdr><w:spacing w:before="120" w:after="120"/></w:pPr></w:p>'

    case 'rawBlock': {
      if ((block as any).markdown) {
        const lines = ((block as any).markdown as string).split('\n')
        const docxParas: string[] = []
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue
          if (trimmed.startsWith('# ')) {
            docxParas.push(
              `<w:p><w:pPr><w:pStyle w:val="Heading1"/><w:spacing w:before="240" w:after="120"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="003884"/><w:sz w:val="36"/></w:rPr><w:t xml:space="preserve">${escapeXml(
                trimmed.slice(2)
              )}</w:t></w:r></w:p>`
            )
          } else if (trimmed.startsWith('## ')) {
            docxParas.push(
              `<w:p><w:pPr><w:pStyle w:val="Heading2"/><w:spacing w:before="200" w:after="100"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="003884"/><w:sz w:val="28"/></w:rPr><w:t xml:space="preserve">${escapeXml(
                trimmed.slice(3)
              )}</w:t></w:r></w:p>`
            )
          } else if (trimmed.startsWith('### ')) {
            docxParas.push(
              `<w:p><w:pPr><w:pStyle w:val="Heading3"/><w:spacing w:before="160" w:after="80"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t xml:space="preserve">${escapeXml(
                trimmed.slice(4)
              )}</w:t></w:r></w:p>`
            )
          } else if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
            docxParas.push(
              `<w:p><w:pPr><w:spacing w:after="80"/></w:pPr><w:r><w:t xml:space="preserve">• ${escapeXml(
                trimmed.slice(2)
              )}</w:t></w:r></w:p>`
            )
          } else if (trimmed === '---') {
            docxParas.push(
              `<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="CCCCCC"/></w:pBdr><w:spacing w:before="120" w:after="120"/></w:pPr></w:p>`
            )
          } else {
            docxParas.push(
              `<w:p><w:pPr><w:spacing w:after="120" w:line="260" w:lineRule="auto"/></w:pPr><w:r><w:t xml:space="preserve">${escapeXml(
                trimmed
              )}</w:t></w:r></w:p>`
            )
          }
        }
        return docxParas.join('\n')
      }

      const clean = (block as any).content
        ?.replace(/<[^>]+>/g, '')
        ?.replace(/&nbsp;/g, ' ')
        ?.replace(/&amp;/g, '&')
        ?.replace(/&lt;/g, '<')
        ?.replace(/&gt;/g, '>')
        ?.trim()
      if (!clean) return ''
      return `<w:p><w:pPr><w:spacing w:after="140" w:line="276" w:lineRule="auto"/></w:pPr><w:r><w:t xml:space="preserve">${escapeXml(clean)}</w:t></w:r></w:p>`
    }

    default:
      return ''
  }
}

export interface DocxRenderOptions {
  mathMode?: 'omml' | 'compatible'
}

export function renderToDocx(doc: NormalizedDocument, options: DocxRenderOptions = {}): Uint8Array {
  const mathMode = options.mathMode || 'omml'
  const bodyXml = doc.children.map((b) => renderBlockToOpenXml(b, mathMode)).join('\n')

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/>
</Types>`

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`

  const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdFont" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/>
</Relationships>`

  const fontTableXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:fonts xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:font w:name="Calibri">
    <w:family w:val="swiss"/>
    <w:pitch w:val="variable"/>
  </w:font>
  <w:font w:name="Cambria Math">
    <w:altName w:val="DejaVu Sans, Latin Modern Math, STIX Two Math, Symbol"/>
    <w:family w:val="roman"/>
    <w:pitch w:val="variable"/>
  </w:font>
  <w:font w:name="DejaVu Sans">
    <w:family w:val="swiss"/>
    <w:pitch w:val="variable"/>
  </w:font>
  <w:font w:name="Consolas">
    <w:family w:val="modern"/>
    <w:pitch w:val="fixed"/>
  </w:font>
</w:fonts>`

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    ${bodyXml}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`

  return zipSync({
    '[Content_Types].xml': strToU8(contentTypes),
    '_rels/.rels': strToU8(rels),
    'word/_rels/document.xml.rels': strToU8(docRels),
    'word/fontTable.xml': strToU8(fontTableXml),
    'word/document.xml': strToU8(documentXml),
  })
}
