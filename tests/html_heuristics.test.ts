import { describe, it, expect } from 'vitest'
import { parseHtml } from '../src/parsers/html'
import { DOMParser } from 'linkedom'

// Setup global DOMParser in test environment
if (typeof globalThis.DOMParser === 'undefined') {
  globalThis.DOMParser = DOMParser as any
}

describe('HTML Multi-Signal Heuristics Parser', () => {
  it('detects ARIA role="heading" and aria-level attributes', () => {
    const html = `
      <div role="heading" aria-level="1">Main Document Header</div>
      <p>Introductory paragraph.</p>
      <div role="heading" aria-level="3">Sub-subsection Title</div>
    `
    const doc = parseHtml(html)
    expect(doc.children[0].type).toBe('heading')
    if (doc.children[0].type === 'heading') {
      expect(doc.children[0].level).toBe(1)
    }

    expect(doc.children[2].type).toBe('heading')
    if (doc.children[2].type === 'heading') {
      expect(doc.children[2].level).toBe(3)
    }
  })

  it('detects figure and figcaption semantically', () => {
    const html = `
      <figure>
        <img src="chart.png" alt="Benchmark plot" />
        <figcaption>Figure 1: Latency distribution across 500 nodes.</figcaption>
      </figure>
    `
    const doc = parseHtml(html)
    expect(doc.children.length).toBe(2)
    expect(doc.children[0].type).toBe('paragraph')
    expect(doc.children[1].type).toBe('paragraph')
  })

  it('promotes numbered bold paragraphs to headings', () => {
    const html = `
      <p><strong>1. Executive Summary</strong></p>
      <p>Normal text follows here.</p>
      <p><strong>1.2 Detailed Metrics</strong></p>
    `
    const doc = parseHtml(html)
    expect(doc.children[0].type).toBe('heading')
    if (doc.children[0].type === 'heading') {
      expect(doc.children[0].level).toBe(2)
    }

    expect(doc.children[2].type).toBe('heading')
    if (doc.children[2].type === 'heading') {
      expect(doc.children[2].level).toBe(3)
    }
  })

  it('preserves standard headings, tables, and lists', () => {
    const html = `
      <h1>Standard H1</h1>
      <p>Paragraph</p>
      <ul><li>Item A</li><li>Item B</li></ul>
      <table><tr><th>Col 1</th></tr><tr><td>Data 1</td></tr></table>
    `
    const doc = parseHtml(html)
    expect(doc.children[0].type).toBe('heading')
    expect(doc.children[1].type).toBe('paragraph')
    expect(doc.children[2].type).toBe('list')
    expect(doc.children[3].type).toBe('table')
  })
})
