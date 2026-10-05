/**
 * anydoc: Universal Client-Side Document Ingestion Parser for Converter.
 * Inspired by firecrawl/anydoc.
 * 
 * Supports:
 * - Microsoft Word (.docx) -> Headings, Text Formatting, Lists, OMML/oMath to LaTeX, Tables
 * - Microsoft PowerPoint (.pptx) -> Slide Titles, Body Text, Bullets
 * - Microsoft Excel (.xlsx) -> Spreadsheets to GFM Markdown Tables
 * - OpenDocument (.odt) -> Headings, Paragraphs, Lists, Tables
 * 
 * 100% Client-side execution via fflate & browser DOMParser. Zero cloud uploads.
 */

import { unzipSync, strFromU8 } from 'fflate'

export interface AnyDocResult {
  markdown: string
  format: 'docx' | 'pptx' | 'xlsx' | 'odt' | 'text' | 'unknown'
  stats: {
    paragraphs: number
    tables: number
    formulas: number
    slides?: number
  }
}

function parseXmlDoc(xmlStr: string): Document {
  const Parser = typeof DOMParser !== 'undefined' ? DOMParser : (globalThis as unknown as { DOMParser?: typeof DOMParser }).DOMParser
  if (Parser) {
    return new Parser().parseFromString(xmlStr, 'application/xml')
  }
  throw new Error('DOMParser not available in this environment')
}

function cleanTagName(node: Node | Element): string {
  const el = node as Element
  return (el.localName || el.tagName || el.nodeName || '').replace(/^.*:/, '').toLowerCase()
}

/**
 * Universal XML element finder that works seamlessly in all browsers and linkedom/node test environments
 * without CSS selector namespace escaping limitations.
 */
function findElement(parent: Element | Document, tagName: string): Element | null {
  const lowerTag = tagName.toLowerCase()
  if ('getElementsByTagName' in parent) {
    const direct = parent.getElementsByTagName(tagName)[0] ||
                   parent.getElementsByTagName(`w:${tagName}`)[0] ||
                   parent.getElementsByTagName(`m:${tagName}`)[0] ||
                   parent.getElementsByTagName(`a:${tagName}`)[0]
    if (direct) return direct
  }
  for (const child of Array.from(parent.children || [])) {
    if (cleanTagName(child) === lowerTag) return child
  }
  return null
}

function findElements(parent: Element | Document, tagName: string): Element[] {
  const lowerTag = tagName.toLowerCase()
  const matched: Element[] = []

  if ('getElementsByTagName' in parent) {
    const list1 = Array.from(parent.getElementsByTagName(tagName))
    const list2 = Array.from(parent.getElementsByTagName(`w:${tagName}`))
    const list3 = Array.from(parent.getElementsByTagName(`m:${tagName}`))
    const list4 = Array.from(parent.getElementsByTagName(`a:${tagName}`))
    const set = new Set([...list1, ...list2, ...list3, ...list4])
    if (set.size > 0) return Array.from(set)
  }

  for (const child of Array.from(parent.children || [])) {
    if (cleanTagName(child) === lowerTag) matched.push(child)
  }
  return matched
}

/**
 * Extracts LaTeX formula string from Word OMML (<m:oMath> or <m:oMathPara>)
 */
function extractOmmlToLatex(mathEl: Element): string {
  function walk(node: Node): string {
    if (node.nodeType === 3 /* TEXT_NODE */) {
      return node.textContent || ''
    }
    if (node.nodeType !== 1 /* ELEMENT_NODE */) return ''

    const el = node as Element
    const tag = cleanTagName(el)

    switch (tag) {
      case 'f': {
        // Fraction
        const num = findElement(el, 'num')
        const den = findElement(el, 'den')
        const numStr = num ? walk(num) : ''
        const denStr = den ? walk(den) : ''
        return `\\frac{${numStr}}{${denStr}}`
      }
      case 'ssup': {
        // Superscript
        const base = findElement(el, 'e')
        const sup = findElement(el, 'sup')
        return `{${base ? walk(base) : ''}}^{${sup ? walk(sup) : ''}}`
      }
      case 'ssub': {
        // Subscript
        const base = findElement(el, 'e')
        const sub = findElement(el, 'sub')
        return `{${base ? walk(base) : ''}}_{${sub ? walk(sub) : ''}}`
      }
      case 'ssubsup': {
        // Sub-Superscript
        const base = findElement(el, 'e')
        const sub = findElement(el, 'sub')
        const sup = findElement(el, 'sup')
        return `{${base ? walk(base) : ''}}_{${sub ? walk(sub) : ''}}^{${sup ? walk(sup) : ''}}`
      }
      case 'rad': {
        // Radical / Sqrt
        const deg = findElement(el, 'deg')
        const base = findElement(el, 'e')
        const degStr = deg ? walk(deg).trim() : ''
        const baseStr = base ? walk(base) : ''
        return degStr ? `\\sqrt[${degStr}]{${baseStr}}` : `\\sqrt{${baseStr}}`
      }
      case 'd': {
        // Delimiter (parentheses, brackets)
        const base = findElement(el, 'e')
        return `\\left( ${base ? walk(base) : ''} \\right)`
      }
      case 'm': {
        // Matrix
        const rows = findElements(el, 'mr')
        const matrixContent = rows
          .map((row) =>
            findElements(row, 'e')
              .map((cell) => walk(cell).trim())
              .join(' & ')
          )
          .join(' \\\\ ')
        return `\\begin{matrix} ${matrixContent} \\end{matrix}`
      }
      case 't': {
        return el.textContent || ''
      }
      default: {
        let res = ''
        for (const child of Array.from(el.childNodes)) {
          res += walk(child)
        }
        return res
      }
    }
  }

  const raw = walk(mathEl).trim()
  return raw.replace(/\s+/g, ' ')
}

/**
 * Parses a .docx Word document buffer into clean GFM Markdown
 */
export function parseDocx(buffer: Uint8Array): AnyDocResult {
  const unzipped = unzipSync(buffer)
  const docXmlBytes = unzipped['word/document.xml']
  if (!docXmlBytes) {
    throw new Error('Invalid .docx file: word/document.xml not found')
  }

  const docXmlStr = strFromU8(docXmlBytes)
  const doc = parseXmlDoc(docXmlStr)

  const lines: string[] = []
  let paragraphCount = 0
  let tableCount = 0
  let formulaCount = 0

  const body = findElement(doc, 'body') || doc.documentElement
  if (!body) {
    return { markdown: '', format: 'docx', stats: { paragraphs: 0, tables: 0, formulas: 0 } }
  }

  for (const child of Array.from(body.children || [])) {
    const tagName = cleanTagName(child)

    if (tagName === 'p') {
      // Paragraph
      paragraphCount++
      const pStyle = findElement(child, 'pStyle')
      const styleVal = pStyle?.getAttribute('w:val') || pStyle?.getAttribute('val') || ''

      // Heading detection
      let headingPrefix = ''
      if (/heading\s*1/i.test(styleVal) || styleVal === 'Title') {
        headingPrefix = '# '
      } else if (/heading\s*2/i.test(styleVal) || styleVal === 'Subtitle') {
        headingPrefix = '## '
      } else if (/heading\s*3/i.test(styleVal)) {
        headingPrefix = '### '
      } else if (/heading\s*4/i.test(styleVal)) {
        headingPrefix = '#### '
      }

      // List detection
      const numPr = findElement(child, 'numPr')
      const isList = Boolean(numPr)
      const listPrefix = isList ? '- ' : ''

      let pText = ''
      for (const pChild of Array.from(child.children || [])) {
        const pChildTag = cleanTagName(pChild)

        if (pChildTag === 'r') {
          // Text run
          const t = findElement(pChild, 't')?.textContent || ''
          if (!t) continue

          const isBold = Boolean(findElement(pChild, 'b'))
          const isItalic = Boolean(findElement(pChild, 'i'))
          const isStrike = Boolean(findElement(pChild, 'strike'))

          let runText = t
          if (isBold && isItalic) {
            runText = `***${runText}***`
          } else if (isBold) {
            runText = `**${runText}**`
          } else if (isItalic) {
            runText = `*${runText}*`
          }
          if (isStrike) {
            runText = `~~${runText}~~`
          }
          pText += runText
        } else if (pChildTag === 'omath' || pChildTag === 'omathpara') {
          // Office Math
          formulaCount++
          const latex = extractOmmlToLatex(pChild)
          if (latex) {
            const isDisplay = pChildTag === 'omathpara' || (child.children && child.children.length === 1)
            pText += isDisplay ? `\n$$\n${latex}\n$$\n` : ` $${latex}$ `
          }
        }
      }

      const cleanText = pText.trim()
      if (cleanText) {
        lines.push(`${headingPrefix}${listPrefix}${cleanText}`)
      } else if (!isList && headingPrefix === '') {
        // Empty paragraph spacing
        lines.push('')
      }
    } else if (tagName === 'tbl') {
      // Table
      tableCount++
      const rows = findElements(child, 'tr')
      if (rows.length === 0) continue

      const tableGrid: string[][] = []
      for (const row of rows) {
        const cells = findElements(row, 'tc')
        const rowData = cells.map((cell) => {
          const tNodes = findElements(cell, 't')
          const texts = tNodes.map((t) => t.textContent || '')
          return texts.join(' ').replace(/\|/g, '\\|').trim()
        })
        tableGrid.push(rowData)
      }

      if (tableGrid.length > 0) {
        const maxCols = Math.max(...tableGrid.map((r) => r.length), 1)
        // Pad rows to maxCols
        const normalized = tableGrid.map((r) => {
          while (r.length < maxCols) r.push('')
          return r
        })

        // Header row
        lines.push(`| ${normalized[0].join(' | ')} |`)
        // Separator row
        lines.push(`| ${normalized[0].map(() => '---').join(' | ')} |`)
        // Body rows
        for (let i = 1; i < normalized.length; i++) {
          lines.push(`| ${normalized[i].join(' | ')} |`)
        }
        lines.push('')
      }
    }
  }

  const markdown = lines.join('\n\n').replace(/\n{3,}/g, '\n\n').trim()
  return {
    markdown,
    format: 'docx',
    stats: {
      paragraphs: paragraphCount,
      tables: tableCount,
      formulas: formulaCount,
    },
  }
}

/**
 * Parses a .pptx PowerPoint presentation buffer into GFM Markdown slides
 */
export function parsePptx(buffer: Uint8Array): AnyDocResult {
  const unzipped = unzipSync(buffer)
  const slideFiles = Object.keys(unzipped)
    .filter((k) => /^ppt\/slides\/slide\d+\.xml$/i.test(k))
    .sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''), 10) || 0
      const numB = parseInt(b.replace(/\D/g, ''), 10) || 0
      return numA - numB
    })

  if (slideFiles.length === 0) {
    throw new Error('Invalid .pptx file: No slides found in ppt/slides/')
  }

  const lines: string[] = []
  let paragraphCount = 0

  slideFiles.forEach((slideFile, idx) => {
    const slideBytes = unzipped[slideFile]
    if (!slideBytes) return
    const slideXml = strFromU8(slideBytes)
    const doc = parseXmlDoc(slideXml)

    lines.push(`## Slide ${idx + 1}`)

    const paragraphs = findElements(doc, 'p')
    let slideParagraphs = 0

    for (const p of paragraphs) {
      const tNodes = findElements(p, 't')
      const texts = tNodes.map((t) => t.textContent || '')
      const lineText = texts.join('').trim()
      if (lineText) {
        slideParagraphs++
        paragraphCount++
        if (slideParagraphs === 1) {
          // Slide headline
          lines.push(`### ${lineText}`)
        } else {
          lines.push(`- ${lineText}`)
        }
      }
    }
    lines.push('')
  })

  return {
    markdown: lines.join('\n\n').replace(/\n{3,}/g, '\n\n').trim(),
    format: 'pptx',
    stats: {
      paragraphs: paragraphCount,
      tables: 0,
      formulas: 0,
      slides: slideFiles.length,
    },
  }
}

/**
 * Parses a .xlsx Excel workbook into GFM Markdown tables
 */
export function parseXlsx(buffer: Uint8Array): AnyDocResult {
  const unzipped = unzipSync(buffer)

  // Load shared strings
  const sharedStrings: string[] = []
  if (unzipped['xl/sharedStrings.xml']) {
    const ssXml = strFromU8(unzipped['xl/sharedStrings.xml'])
    const ssDoc = parseXmlDoc(ssXml)
    const siElements = findElements(ssDoc, 'si')
    for (const si of siElements) {
      const tNodes = findElements(si, 't')
      const texts = tNodes.map((t) => t.textContent || '')
      sharedStrings.push(texts.join(''))
    }
  }

  // Load sheet1.xml
  const sheetBytes = unzipped['xl/worksheets/sheet1.xml']
  if (!sheetBytes) {
    throw new Error('Invalid .xlsx file: xl/worksheets/sheet1.xml not found')
  }

  const sheetDoc = parseXmlDoc(strFromU8(sheetBytes))
  const rows = findElements(sheetDoc, 'row')
  const tableGrid: string[][] = []

  for (const row of rows) {
    const cells = findElements(row, 'c')
    const rowData: string[] = []

    for (const c of cells) {
      const type = c.getAttribute('t')
      const valEl = findElement(c, 'v')
      const val = valEl ? valEl.textContent || '' : ''

      if (type === 's') {
        const idx = parseInt(val, 10)
        rowData.push(sharedStrings[idx] || '')
      } else if (type === 'inlineStr') {
        const isEl = findElement(c, 'is')
        const tEl = isEl ? findElement(isEl, 't') : null
        rowData.push(tEl?.textContent || '')
      } else {
        rowData.push(val)
      }
    }

    if (rowData.some((cell) => cell.trim() !== '')) {
      tableGrid.push(rowData)
    }
  }

  if (tableGrid.length === 0) {
    return { markdown: '', format: 'xlsx', stats: { paragraphs: 0, tables: 0, formulas: 0 } }
  }

  const maxCols = Math.max(...tableGrid.map((r) => r.length), 1)
  const normalized = tableGrid.map((r) => {
    while (r.length < maxCols) r.push('')
    return r.map((c) => c.replace(/\|/g, '\\|').trim())
  })

  const lines: string[] = []
  lines.push(`| ${normalized[0].join(' | ')} |`)
  lines.push(`| ${normalized[0].map(() => '---').join(' | ')} |`)
  for (let i = 1; i < normalized.length; i++) {
    lines.push(`| ${normalized[i].join(' | ')} |`)
  }

  return {
    markdown: lines.join('\n').trim(),
    format: 'xlsx',
    stats: {
      paragraphs: normalized.length,
      tables: 1,
      formulas: 0,
    },
  }
}

/**
 * Universal document parser entry point (anydoc).
 * Detects format from extension/magic bytes and dispatches to appropriate parser.
 */
export async function parseAnyDocument(
  fileOrBuffer: File | ArrayBuffer | Uint8Array,
  fileName: string = ''
): Promise<AnyDocResult> {
  let uint8: Uint8Array
  if (fileOrBuffer instanceof File) {
    const ab = await fileOrBuffer.arrayBuffer()
    uint8 = new Uint8Array(ab)
    fileName = fileName || fileOrBuffer.name
  } else if (fileOrBuffer instanceof ArrayBuffer) {
    uint8 = new Uint8Array(fileOrBuffer)
  } else {
    uint8 = fileOrBuffer
  }

  const ext = fileName.split('.').pop()?.toLowerCase() || ''

  if (ext === 'docx') {
    return parseDocx(uint8)
  }
  if (ext === 'pptx') {
    return parsePptx(uint8)
  }
  if (ext === 'xlsx') {
    return parseXlsx(uint8)
  }

  // Fallback to text decoding
  const textContent = strFromU8(uint8)
  return {
    markdown: textContent,
    format: 'text',
    stats: {
      paragraphs: textContent.split('\n\n').length,
      tables: 0,
      formulas: (textContent.match(/\$\$|\$|\\\[|\\\(|\\begin\{equation\}/g) || []).length,
    },
  }
}
