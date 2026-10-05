import { describe, it, expect } from 'vitest'
import { zipSync, strToU8 } from 'fflate'
import { DOMParser } from 'linkedom'
import { parseDocx, parsePptx, parseXlsx, parseAnyDocument } from '../src/parsers/anydoc'

if (typeof globalThis.DOMParser === 'undefined') {
  globalThis.DOMParser = DOMParser as any
}

describe('anydoc: Universal Document Parser', () => {
  it('parses .docx Word document with headings, formatting, tables, and math', () => {
    const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">
  <w:body>
    <w:p>
      <w:pPr><w:pStyle w:val="Heading1"/></w:pPr>
      <w:r><w:t>Quantum Mechanics Overview</w:t></w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:rPr><w:b/></w:rPr>
        <w:t>Energy Formula:</w:t>
      </w:r>
      <m:oMath>
        <m:f>
          <m:num><m:r><m:t>1</m:t></m:r></m:num>
          <m:den><m:r><m:t>2</m:t></m:r></m:den>
        </m:f>
        <m:r><m:t>mv</m:t></m:r>
        <m:sSup>
          <m:e><m:r><m:t></m:t></m:r></m:e>
          <m:sup><m:r><m:t>2</m:t></m:r></m:sup>
        </m:sSup>
      </m:oMath>
    </w:p>
    <w:tbl>
      <w:tr>
        <w:tc><w:p><w:r><w:t>Particle</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Spin</w:t></w:r></w:p></w:tc>
      </w:tr>
      <w:tr>
        <w:tc><w:p><w:r><w:t>Electron</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>1/2</w:t></w:r></w:p></w:tc>
      </w:tr>
    </w:tbl>
  </w:body>
</w:document>`

    const zipBuffer = zipSync({
      'word/document.xml': strToU8(docXml)
    })

    const res = parseDocx(zipBuffer)
    expect(res.format).toBe('docx')
    expect(res.stats.paragraphs).toBe(2)
    expect(res.stats.tables).toBe(1)
    expect(res.stats.formulas).toBe(1)
    expect(res.markdown).toContain('# Quantum Mechanics Overview')
    expect(res.markdown).toContain('**Energy Formula:**')
    expect(res.markdown).toContain('\\frac{1}{2}')
    expect(res.markdown).toContain('| Particle | Spin |')
    expect(res.markdown).toContain('| Electron | 1/2 |')
  })

  it('parses .pptx PowerPoint slides into structured Markdown', () => {
    const slide1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:txBody>
          <a:p><a:r><a:t>Introduction to AnyDoc</a:t></a:r></a:p>
          <a:p><a:r><a:t>First bullet point on client-side conversion</a:t></a:r></a:p>
          <a:p><a:r><a:t>Second bullet point on zero latency</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`

    const zipBuffer = zipSync({
      'ppt/slides/slide1.xml': strToU8(slide1Xml)
    })

    const res = parsePptx(zipBuffer)
    expect(res.format).toBe('pptx')
    expect(res.stats.slides).toBe(1)
    expect(res.markdown).toContain('## Slide 1')
    expect(res.markdown).toContain('### Introduction to AnyDoc')
    expect(res.markdown).toContain('- First bullet point on client-side conversion')
    expect(res.markdown).toContain('- Second bullet point on zero latency')
  })

  it('parses .xlsx Excel spreadsheets into GFM Markdown tables', () => {
    const sharedStringsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <si><t>Benchmark</t></si>
  <si><t>Score</t></si>
  <si><t>Speed</t></si>
  <si><t>Accuracy</t></si>
</sst>`

    const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1">
      <c r="A1" t="s"><v>0</v></c>
      <c r="B1" t="s"><v>1</v></c>
    </row>
    <row r="2">
      <c r="A2" t="s"><v>2</v></c>
      <c r="B2"><v>99.4</v></c>
    </row>
  </sheetData>
</worksheet>`

    const zipBuffer = zipSync({
      'xl/sharedStrings.xml': strToU8(sharedStringsXml),
      'xl/worksheets/sheet1.xml': strToU8(sheetXml)
    })

    const res = parseXlsx(zipBuffer)
    expect(res.format).toBe('xlsx')
    expect(res.stats.tables).toBe(1)
    expect(res.markdown).toContain('| Benchmark | Score |')
    expect(res.markdown).toContain('| Speed | 99.4 |')
  })

  it('parseAnyDocument dispatches correctly based on filename', async () => {
    const textBuffer = strToU8('# Plain text markdown input')
    const res = await parseAnyDocument(textBuffer, 'notes.txt')
    expect(res.format).toBe('text')
    expect(res.markdown).toBe('# Plain text markdown input')
  })
})
