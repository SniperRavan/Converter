/**
 * Lightweight in-browser TikZ to SVG renderer.
 * Converts LaTeX TikZ diagrams (packet frames, architectural boxes, grids, flowcharts)
 * directly into crisp, responsive vector SVGs for display, print, and export.
 */

interface TikzRect {
  x1: number
  y1: number
  x2: number
  y2: number
  fill?: string
  stroke?: string
  strokeWidth?: number
  text?: string
}

interface TikzNode {
  x: number
  y: number
  text: string
  anchor?: string
  color?: string
}

export function renderTikzToSvg(tikzSource: string): string | null {
  if (!tikzSource || !tikzSource.includes('\\begin{tikzpicture}')) {
    return null
  }

  // Extract body of tikzpicture
  const match = tikzSource.match(/\\begin\{tikzpicture\}(?:\[[^\]]*\])?([\s\S]*?)\\end\{tikzpicture\}/)
  if (!match) return null
  const body = match[1]

  const rects: TikzRect[] = []
  const nodes: TikzNode[] = []
  let hasGrid = false
  let gridBounds = { x1: 0, y1: 0, x2: 32, y2: -8 }

  // 1. Detect \draw ... grid
  const gridMatch = body.match(/\\draw\[[^\]]*\]\s*\(([-\d.]+),\s*([-\d.]+)\)\s*grid\s*\(([-\d.]+),\s*([-\d.]+)\)/)
  if (gridMatch) {
    hasGrid = true
    gridBounds = {
      x1: parseFloat(gridMatch[1]),
      y1: parseFloat(gridMatch[2]),
      x2: parseFloat(gridMatch[3]),
      y2: parseFloat(gridMatch[4]),
    }
  }

  // 2. Parse \foreach \x in {0,...,31} { \node... at (\x + 0.5, 0.5) {\x}; }
  const foreachMatch = body.match(/\\foreach\s*\\x\s*in\s*\{(\d+)\.\.\.(\d+)\}\s*\{[\s\S]*?at\s*\(\\x\s*\+\s*0?\.?5?,\s*([-\d.]+)\)\s*\{([^}]+)\}/)
  if (foreachMatch) {
    const start = parseInt(foreachMatch[1], 10)
    const end = parseInt(foreachMatch[2], 10)
    const yVal = parseFloat(foreachMatch[3])
    for (let x = start; x <= end; x++) {
      nodes.push({
        x: x + 0.5,
        y: yVal,
        text: x.toString(),
        color: '#64748b',
      })
    }
  }

  // 3. Parse \draw[...] (x1, y1) rectangle (x2, y2) node[...] {Text};
  const rectRegex = /\\draw(?:\[([^\]]*)\])?\s*\(([-\d.]+),\s*([-\d.]+)\)\s*rectangle\s*\(([-\d.]+),\s*([-\d.]+)\)(?:\s*node(?:\[([^\]]*)\])?\s*\{([\s\S]*?)\})?/g
  let rm: RegExpExecArray | null
  while ((rm = rectRegex.exec(body)) !== null) {
    const style = rm[1] || ''
    const x1 = parseFloat(rm[2])
    const y1 = parseFloat(rm[3])
    const x2 = parseFloat(rm[4])
    const y2 = parseFloat(rm[5])
    const rawText = rm[7] ? rm[7].trim() : ''

    // Parse fill color from style (e.g. fill=blue!5 -> soft blue)
    let fill = '#f8fafc'
    let stroke = '#2563eb'
    if (/fill=blue!5/i.test(style)) fill = '#eff6ff'
    else if (/fill=green!5/i.test(style)) fill = '#f0fdf4'
    else if (/fill=gray!5/i.test(style)) fill = '#f1f5f9'
    else if (/fill=yellow!5/i.test(style)) fill = '#fefce8'
    else if (/fill=purple!5/i.test(style)) fill = '#faf5ff'

    const cleanText = rawText
      .replace(/\\sffamily\b/g, '')
      .replace(/\\bfseries\b/g, '')
      .replace(/\\tiny\b/g, '')
      .replace(/\\footnotesize\b/g, '')
      .replace(/\\small\b/g, '')
      .replace(/\\large\b/g, '')
      .replace(/[{}]/g, '')
      .trim()

    rects.push({
      x1,
      y1,
      x2,
      y2,
      fill,
      stroke,
      strokeWidth: 1.2,
      text: cleanText,
    })
  }

  // 4. Parse standalone \node[...] at (x, y) {Text};
  const nodeRegex = /\\node(?:\[([^\]]*)\])?\s*at\s*\(([-\d.]+),\s*([-\d.]+)\)\s*\{([^}]+)\};/g
  let nm: RegExpExecArray | null
  while ((nm = nodeRegex.exec(body)) !== null) {
    const style = nm[1] || ''
    const x = parseFloat(nm[2])
    const y = parseFloat(nm[3])
    const rawText = nm[4].trim()

    const cleanText = rawText
      .replace(/\\sffamily\b/g, '')
      .replace(/\\bfseries\b/g, '')
      .replace(/\\tiny\b/g, '')
      .replace(/\\color\{[^}]+\}/g, '')
      .replace(/[{}]/g, '')
      .trim()

    let anchor = 'middle'
    if (style.includes('anchor=east')) anchor = 'end'
    else if (style.includes('anchor=west')) anchor = 'start'

    nodes.push({
      x,
      y,
      text: cleanText,
      anchor,
      color: style.includes('color=gray') ? '#64748b' : '#334155',
    })
  }

  if (rects.length === 0 && nodes.length === 0) {
    return null
  }

  // Compute bounding box
  let minX = -3
  let maxX = 33
  let minY = -8.5
  let maxY = 1.2

  for (const r of rects) {
    minX = Math.min(minX, r.x1, r.x2)
    maxX = Math.max(maxX, r.x1, r.x2)
    minY = Math.min(minY, r.y1, r.y2)
    maxY = Math.max(maxY, r.y1, r.y2)
  }
  for (const n of nodes) {
    minX = Math.min(minX, n.x - 2)
    maxX = Math.max(maxX, n.x + 2)
    minY = Math.min(minY, n.y - 0.5)
    maxY = Math.max(maxY, n.y + 0.5)
  }

  // Scale to pixels: 1 tikz unit = 24 px
  const UNIT = 24
  const padding = 16
  const width = Math.ceil((maxX - minX) * UNIT + padding * 2)
  const height = Math.ceil((maxY - minY) * UNIT + padding * 2)

  const toSvgX = (x: number) => Math.round((x - minX) * UNIT + padding)
  const toSvgY = (y: number) => Math.round((maxY - y) * UNIT + padding)

  let svgElements = ''

  // Draw background grid if present
  if (hasGrid) {
    const gx1 = toSvgX(gridBounds.x1)
    const gx2 = toSvgX(gridBounds.x2)
    const gy1 = toSvgY(gridBounds.y1)
    const gy2 = toSvgY(gridBounds.y2)
    svgElements += `<line x1="${gx1}" y1="${gy1}" x2="${gx2}" y2="${gy1}" stroke="#cbd5e1" stroke-dasharray="2,2" />\n`
    svgElements += `<line x1="${gx1}" y1="${gy2}" x2="${gx2}" y2="${gy2}" stroke="#cbd5e1" stroke-dasharray="2,2" />\n`
  }

  // Draw rectangles and their text
  for (const r of rects) {
    const rx = toSvgX(Math.min(r.x1, r.x2))
    const ry = toSvgY(Math.max(r.y1, r.y2))
    const rw = Math.abs(r.x2 - r.x1) * UNIT
    const rh = Math.abs(r.y2 - r.y1) * UNIT

    svgElements += `  <rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" rx="4" fill="${r.fill}" stroke="${r.stroke}" stroke-width="${r.strokeWidth || 1}" />\n`

    if (r.text) {
      const lines = r.text.split(/\\\\/).map(s => s.trim()).filter(Boolean)
      const cx = rx + rw / 2
      const lineHeight = 13
      const totalH = lines.length * lineHeight
      const startY = ry + rh / 2 - totalH / 2 + 10

      lines.forEach((line, idx) => {
        const isSmall = lines.length > 2 || line.length > 12
        const fontSize = isSmall ? '9.5px' : '11px'
        const fontWeight = isSmall ? '500' : '600'
        svgElements += `  <text x="${cx}" y="${startY + idx * lineHeight}" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${fontSize}" font-weight="${fontWeight}" fill="#1e293b">${line}</text>\n`
      })
    }
  }

  // Draw standalone nodes
  for (const n of nodes) {
    const nx = toSvgX(n.x)
    const ny = toSvgY(n.y)
    svgElements += `  <text x="${nx}" y="${ny}" text-anchor="${n.anchor || 'middle'}" dominant-baseline="central" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="9px" font-weight="500" fill="${n.color || '#64748b'}">${n.text}</text>\n`
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" style="width: 100%; max-width: ${Math.min(width, 820)}px; height: auto; display: block; margin: 12px auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
  ${svgElements}
</svg>`
}
