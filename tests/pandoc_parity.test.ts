import { describe, it, expect } from 'vitest'
import { DOMParser } from 'linkedom'
if (typeof globalThis.DOMParser === 'undefined') {
  globalThis.DOMParser = DOMParser as any
}
import { parseMarkdown } from '../src/parsers/markdown'
import { parseHtml } from '../src/parsers/html'
import { renderToHtml } from '../src/renderers/html'
import { renderToPlainText } from '../src/renderers/text'
import { renderToDocx } from '../src/renderers/docx'
import { normalizeUniversalInput } from '../src/parsers/normalizer'
import { unzipSync, strFromU8 } from 'fflate'

describe('Pandoc Parity & Universal Enhancements', () => {
  describe('Smart Typography & Punctuation', () => {
    it('normalizes en-dashes between number ranges', () => {
      const input = 'From 1990--2020 on pp. 45--50'
      const normalized = normalizeUniversalInput(input)
      expect(normalized).toContain('1990–2020')
      expect(normalized).toContain('45–50')
    })

    it('normalizes em-dashes between words while preserving thematic breaks', () => {
      const input = 'Deep thought---indeed fascinating.\n\n---\n\nNext section.'
      const doc = parseMarkdown(input)
      expect(doc.children[0].type).toBe('paragraph')
      const pText = renderToPlainText(doc)
      expect(pText).toContain('thought—indeed')
      // Ensure thematic break block is still recognized
      expect(doc.children.some((c) => c.type === 'thematicBreak')).toBe(true)
    })

    it('normalizes ellipses', () => {
      const input = 'Wait for it... done.'
      const normalized = normalizeUniversalInput(input)
      expect(normalized).toContain('Wait for it… done.')
    })
  })

  describe('Subscripts & Superscripts', () => {
    it('converts Pandoc markdown sub/sup syntax into Unicode equivalents', () => {
      const input = 'Water is H~2~O and Einstein wrote E=mc^2^.'
      const doc = parseMarkdown(input)
      const text = renderToPlainText(doc)
      expect(text).toContain('H₂O')
      expect(text).toContain('E=mc²')
    })

    it('converts HTML <sub> and <sup> into Unicode equivalents', () => {
      const input = '<p>CO<sub>2</sub> and x<sup>3</sup></p>'
      const doc = parseHtml(input)
      const text = renderToPlainText(doc)
      expect(text).toContain('CO₂')
      expect(text).toContain('x³')
    })
  })

  describe('HTML Semantic Tag Enhancements', () => {
    it('handles <kbd> and <mark> elements', () => {
      const input = '<p>Press <kbd>Ctrl</kbd> + <kbd>C</kbd> to copy <mark>important</mark> text.</p>'
      const doc = parseHtml(input)
      const htmlOut = renderToHtml(doc)
      expect(htmlOut).toContain('<code>Ctrl</code>')
      expect(htmlOut).toContain('<strong>important</strong>')
    })

    it('converts HTML definition lists (<dl>, <dt>, <dd>) into structured term lists', () => {
      const input = `
        <dl>
          <dt>Pandoc</dt>
          <dd>A universal document converter.</dd>
          <dt>Convertion</dt>
          <dd>A zero-backend client-side converter.</dd>
        </dl>
      `
      const doc = parseHtml(input)
      expect(doc.children[0].type).toBe('list')
      const textOut = renderToPlainText(doc)
      expect(textOut).toContain('Pandoc: A universal document converter.')
      expect(textOut).toContain('Convertion: A zero-backend client-side converter.')
    })

    it('converts <details> and <summary> disclosure widgets gracefully', () => {
      const input = `
        <details>
          <summary>More Info</summary>
          <p>Hidden explanation text.</p>
        </details>
      `
      const doc = parseHtml(input)
      expect(doc.children[0].type).toBe('blockquote')
      const textOut = renderToPlainText(doc)
      expect(textOut).toContain('More Info')
      expect(textOut).toContain('Hidden explanation text.')
    })
  })

  describe('Callout / Admonition Rendering', () => {
    it('renders colored callout boxes in HTML for [!NOTE] and [!TIP]', () => {
      const input = '> [!NOTE]\n> This is an important note.'
      const doc = parseMarkdown(input)
      const htmlOut = renderToHtml(doc)
      expect(htmlOut).toContain('callout-note')
      expect(htmlOut).toContain('#2563eb')
      expect(htmlOut).toContain('Note:')
    })

    it('renders clean callout headers in Plaintext', () => {
      const input = '> [!WARNING]\n> Be careful with credentials.'
      const doc = parseMarkdown(input)
      const textOut = renderToPlainText(doc)
      expect(textOut).toContain('[WARNING] Be careful with credentials.')
    })

    it('renders professional colored border callout shading in DOCX OpenXML', async () => {
      const input = '> [!TIP]\n> Pro-tip for high performance.'
      const doc = parseMarkdown(input)
      const buffer = await renderToDocx(doc)
      const zip = unzipSync(new Uint8Array(buffer))
      const docXml = strFromU8(zip['word/document.xml'])
      expect(docXml).toContain('w:color="059669"')
      expect(docXml).toContain('w:fill="ECFDF5"')
      expect(docXml).toContain('Tip:')
    })
  })

  describe('Task Lists & Checkboxes', () => {
    it('renders HTML checkboxes for task lists', () => {
      const input = '- [x] Finished item\n- [ ] Pending item'
      const doc = parseMarkdown(input)
      const htmlOut = renderToHtml(doc)
      expect(htmlOut).toContain('type="checkbox"')
      expect(htmlOut).toContain('checked=""')
    })

    it('renders clean plaintext checkboxes without redundant bullet symbols', () => {
      const input = '- [x] Finished item\n- [ ] Pending item'
      const doc = parseMarkdown(input)
      const textOut = renderToPlainText(doc)
      expect(textOut).toContain('[x] Finished item')
      expect(textOut).toContain('[ ] Pending item')
      expect(textOut).not.toContain('• [x]')
    })

    it('renders Unicode ballot boxes in DOCX OpenXML for task lists', async () => {
      const input = '- [x] Finished item\n- [ ] Pending item'
      const doc = parseMarkdown(input)
      const buffer = await renderToDocx(doc)
      const zip = unzipSync(new Uint8Array(buffer))
      const docXml = strFromU8(zip['word/document.xml'])
      expect(docXml).toContain('☑')
      expect(docXml).toContain('☐')
    })
  })
})
