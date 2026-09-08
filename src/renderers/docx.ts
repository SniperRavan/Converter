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

interface RunStyle {
  bold?: boolean
  italic?: boolean
  strike?: boolean
  code?: boolean
  color?: string
  size?: number
  underline?: boolean
}

function latexToOmml(latex: string, displayMode: boolean): string {
  try {
    const raw = katex.renderToString(latex, {
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
    return mml2omml(cleanMathml)
  } catch {
    const fallbackText = latexToUnicode(latex) || latex
    return `<m:oMath><m:r><m:t xml:space="preserve">${escapeXml(fallbackText)}</m:t></m:r></m:oMath>`
  }
}

function renderInlineToOpenXml(node: InlineNode, style: RunStyle = {}): string {
  switch (node.type) {
    case 'text': {
      let rPr = ''
      if (style.bold) rPr += '<w:b/>'
      if (style.italic) rPr += '<w:i/>'
      if (style.strike) rPr += '<w:strike/>'
      if (style.color) rPr += `<w:color w:val="${style.color}"/>`
      if (style.underline) rPr += '<w:u w:val="single"/>'
      if (style.code) {
        rPr += '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="19"/><w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/>'
      }
      const rPrXml = rPr ? `<w:rPr>${rPr}</w:rPr>` : ''
      return `<w:r>${rPrXml}<w:t xml:space="preserve">${escapeXml(node.value)}</w:t></w:r>`
    }

    case 'strong':
      return node.children.map((c) => renderInlineToOpenXml(c, { ...style, bold: true })).join('')

    case 'emphasis':
      return node.children.map((c) => renderInlineToOpenXml(c, { ...style, italic: true })).join('')

    case 'strikethrough':
      return node.children.map((c) => renderInlineToOpenXml(c, { ...style, strike: true })).join('')

    case 'inlineCode': {
      const codeRPr = '<w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/><w:sz w:val="19"/><w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/></w:rPr>'
      return `<w:r>${codeRPr}<w:t xml:space="preserve">${escapeXml(node.value)}</w:t></w:r>`
    }

    case 'inlineMath':
      return latexToOmml(node.value, false)

    case 'link': {
      const linkStyle = { ...style, color: '2563EB', underline: true }
      if (node.children && node.children.length > 0) {
        return node.children.map((c) => renderInlineToOpenXml(c, linkStyle)).join('')
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

function renderBlockToOpenXml(block: BlockNode): string {
  switch (block.type) {
    case 'heading': {
      const hNode = block as HeadingNode
      const sizes: Record<number, number> = { 1: 36, 2: 28, 3: 24, 4: 22, 5: 20, 6: 18 }
      const sz = sizes[hNode.level] || 24
      const jc = hNode.level === 1 ? '<w:jc w:val="center"/>' : ''
      const border = hNode.level === 2 ? '<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="2" w:color="003884"/></w:pBdr>' : ''
      const color = hNode.level <= 2 ? '003884' : '1E293B'
      const inlines = hNode.children.map((c) => renderInlineToOpenXml(c)).join('')

      return `<w:p><w:pPr>${jc}${border}<w:spacing w:before="240" w:after="120"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="${sz}"/><w:color w:val="${color}"/></w:rPr><w:t xml:space="preserve"></w:t></w:r>${inlines}</w:p>`
    }

    case 'paragraph': {
      const pNode = block as ParagraphNode
      const inlines = pNode.children.map((c) => renderInlineToOpenXml(c)).join('')
      const align = pNode.align ? `<w:jc w:val="${pNode.align}"/>` : ''
      return `<w:p><w:pPr>${align}<w:spacing w:after="140" w:line="276" w:lineRule="auto"/></w:pPr>${inlines}</w:p>`
    }

    case 'mathBlock': {
      const mNode = block as MathBlockNode
      const omml = latexToOmml(mNode.value, true)
      return `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="160" w:after="160"/></w:pPr><m:oMathPara>${omml}</m:oMathPara></w:p>`
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
      return block.children.map((child) => {
        if (child.type === 'paragraph') {
          const inlines = child.children.map((c) => renderInlineToOpenXml(c, { italic: true, color: '475569' })).join('')
          return `<w:p><w:pPr><w:pBdr><w:left w:val="single" w:sz="24" w:space="8" w:color="94A3B8"/></w:pBdr><w:ind w:left="400"/><w:spacing w:before="80" w:after="80"/></w:pPr>${inlines}</w:p>`
        }
        return renderBlockToOpenXml(child)
      }).join('')
    }

    case 'list': {
      const lNode = block as ListNode
      return lNode.items.map((item, idx) => {
        const bullet = lNode.ordered ? `${(lNode.start || 1) + idx}.` : '•'
        const inlines = item.children.map((child) => {
          if (child.type === 'paragraph') return child.children.map((c) => renderInlineToOpenXml(c)).join('')
          if ('children' in child) return (child.children as InlineNode[]).map((c) => renderInlineToOpenXml(c)).join('')
          return ''
        }).join('')

        return `<w:p><w:pPr><w:ind w:left="480" w:hanging="240"/><w:spacing w:after="60"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="334155"/></w:rPr><w:t xml:space="preserve">${bullet} </w:t></w:r>${inlines}</w:p>`
      }).join('')
    }

    case 'table': {
      const tNode = block as TableNode
      const hasHeaders = tNode.headers && tNode.headers.length > 0
      const hasRows = tNode.rows && tNode.rows.length > 0
      if (!hasHeaders && !hasRows) return ''

      let trs = ''
      if (hasHeaders) {
        const ths = tNode.headers.map((cell: TableCellNode, idx: number) => {
          const inlines = cell.children.map((c: InlineNode) => renderInlineToOpenXml(c, { bold: true })).join('')
          const align = tNode.alignments?.[idx] ? `<w:jc w:val="${tNode.alignments[idx]}"/>` : ''
          return `<w:tc><w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/><w:tcMar><w:top w:w="120" w:type="dxa"/><w:bottom w:w="120" w:type="dxa"/><w:left w:w="160" w:type="dxa"/><w:right w:w="160" w:type="dxa"/></w:tcMar></w:tcPr><w:p><w:pPr>${align}<w:spacing w:after="0"/></w:pPr>${inlines}</w:p></w:tc>`
        }).join('')
        trs += `<w:tr><w:trPr><w:tblHeader/></w:trPr>${ths}</w:tr>`
      }

      if (hasRows) {
        for (const row of tNode.rows) {
          const tds = row.cells.map((cell: TableCellNode, idx: number) => {
            const inlines = cell.children.map((c: InlineNode) => renderInlineToOpenXml(c)).join('')
            const align = tNode.alignments?.[idx] ? `<w:jc w:val="${tNode.alignments[idx]}"/>` : ''
            return `<w:tc><w:tcPr><w:tcMar><w:top w:w="100" w:type="dxa"/><w:bottom w:w="100" w:type="dxa"/><w:left w:w="160" w:type="dxa"/><w:right w:w="160" w:type="dxa"/></w:tcMar></w:tcPr><w:p><w:pPr>${align}<w:spacing w:after="0"/></w:pPr>${inlines}</w:p></w:tc>`
          }).join('')
          trs += `<w:tr>${tds}</w:tr>`
        }
      }

      return `<w:tbl>
        <w:tblPr>
          <w:tblW w:w="5000" w:type="pct"/>
          <w:tblBorders>
            <w:top w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
            <w:left w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
            <w:bottom w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
            <w:right w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
            <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
            <w:insideV w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
          </w:tblBorders>
        </w:tblPr>
        ${trs}
      </w:tbl><w:p><w:pPr><w:spacing w:after="160"/></w:pPr></w:p>`
    }

    case 'thematicBreak':
      return '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="8" w:space="1" w:color="CBD5E1"/></w:pBdr><w:spacing w:before="120" w:after="120"/></w:pPr></w:p>'

    default:
      return ''
  }
}

export function renderToDocx(doc: NormalizedDocument): Uint8Array {
  const bodyXml = doc.children.map(renderBlockToOpenXml).join('\n')

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`

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
    'word/document.xml': strToU8(documentXml),
  })
}
