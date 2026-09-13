import type { NormalizedDocument } from '../core/types'
import { computeDocumentStats } from '../core/stats'

function extractBalancedBraces(str: string, startIdx: number): { content: string; endIdx: number } | null {
  let depth = 1
  for (let i = startIdx; i < str.length; i++) {
    if (str[i] === '{') depth++
    else if (str[i] === '}') {
      depth--
      if (depth === 0) return { content: str.slice(startIdx, i), endIdx: i }
    }
  }
  return null
}

function extractNBracedArgs(str: string, startIdx: number, count: number): { args: string[]; endIdx: number } | null {
  const args: string[] = []
  let cursor = startIdx
  for (let c = 0; c < count; c++) {
    const openBrace = str.indexOf('{', cursor)
    if (openBrace === -1) return null
    let depth = 1
    let closeBrace = -1
    for (let i = openBrace + 1; i < str.length; i++) {
      if (str[i] === '{') depth++
      else if (str[i] === '}') {
        depth--
        if (depth === 0) {
          closeBrace = i
          break
        }
      }
    }
    if (closeBrace === -1) return null
    args.push(str.slice(openBrace + 1, closeBrace).trim())
    cursor = closeBrace + 1
  }
  return { args, endIdx: cursor }
}

function cleanLatexInline(text: string, primaryColor: string): { html: string; markdown: string } {
  let s = text
    .replace(/\\small\b/g, '')
    .replace(/\\footnotesize\b/g, '')
    .replace(/\\vspace\*?\{[^}]*\}/g, '')
    .replace(/\\hspace\*?\{[^}]*\}/g, '')
    .replace(/\\noindent\b/g, '')
    .replace(/\r?\n/g, ' ')
    .trim()

  // Convert math | and normalize spacing
  s = s.replace(/\s*\$\s*\\?\|\s*\$\s*/g, ' | ')

  // En and em dashes
  s = s.replace(/---/g, '—').replace(/--/g, '–')

  // FontAwesome icon mappings
  const iconReplacements: [RegExp, string][] = [
    [/\\faMapMarker\*?~?/g, '📍 '],
    [/\\faPhone\*?~?/g, '📞 '],
    [/\\faEnvelope\*?~?/g, '✉️ '],
    [/\\faGlobe\*?~?/g, '🌐 '],
    [/\\faGithub\*?~?/g, '🐙 '],
    [/\\faLinkedin(?:In)?\*?~?/g, '💼 '],
    [/\\faHeadphones\*?~?/g, '🎧 '],
    [/\\faBookOpen\*?~?/g, '📖 '],
    [/\\faLaptopCode\*?~?/g, '💻 '],
    [/\\faCalendar\*?~?/g, '📅 '],
    [/\\faGraduationCap\*?~?/g, '🎓 '],
    [/\\faBriefcase\*?~?/g, '💼 '],
  ]

  for (const [regex, rep] of iconReplacements) {
    s = s.replace(regex, rep)
  }

  // Non-breaking space
  s = s.replace(/~/g, ' ')

  // Normalize spaces
  s = s.replace(/[ \t]+/g, ' ')

  // HTML conversion
  let html = s
  html = html.replace(/\\textbf\{([^}]+)\}/g, '<strong>$1</strong>')
  html = html.replace(/\\(?:textit|emph)\{([^}]+)\}/g, '<em>$1</em>')
  html = html.replace(/\\texttt\{([^}]+)\}/g, '<code>$1</code>')
  html = html.replace(
    /\\href\{([^}]+)\}\{([^}]+)\}/g,
    `<a href="$1" target="_blank" rel="noopener noreferrer" style="color: ${primaryColor}; text-decoration: none;">$2</a>`
  )
  html = html.replace(/\\&/g, '&')
  html = html.replace(/\\#/g, '#')
  html = html.replace(/\\%/g, '%')
  html = html.replace(/\\_/g, '_')
  html = html.replace(/[{}]/g, '')

  // Markdown conversion
  let md = s
  md = md.replace(/\\textbf\{([^}]+)\}/g, '**$1**')
  md = md.replace(/\\(?:textit|emph)\{([^}]+)\}/g, '*$1*')
  md = md.replace(/\\texttt\{([^}]+)\}/g, '`$1`')
  md = md.replace(/\\href\{([^}]+)\}\{([^}]+)\}/g, '[$2]($1)')
  md = md.replace(/\\&/g, '&')
  md = md.replace(/\\#/g, '#')
  md = md.replace(/\\%/g, '%')
  md = md.replace(/\\_/g, '_')
  md = md.replace(/[{}]/g, '')

  return { html: html.trim(), markdown: md.trim() }
}

export function parseLatexResume(content: string): NormalizedDocument | null {
  // Strip LaTeX comments
  const tex = content.replace(/(?<!\\)%.*$/gm, '')

  // Extract primary color (default Deep Navy #003884)
  let primaryColor = '#003884'
  const colorMatch = tex.match(/\\definecolor\{primary\}\{rgb\}\{([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\}/i)
  if (colorMatch) {
    const r = Math.round(parseFloat(colorMatch[1]) * 255)
    const g = Math.round(parseFloat(colorMatch[2]) * 255)
    const b = Math.round(parseFloat(colorMatch[3]) * 255)
    const toHex = (n: number) => n.toString(16).padStart(2, '0')
    primaryColor = `#${toHex(r)}${toHex(g)}${toHex(b)}`
  } else {
    const hexMatch = tex.match(/\\definecolor\{primary\}\{HTML\}\{([0-9a-fA-F]{6})\}/i)
    if (hexMatch) {
      primaryColor = `#${hexMatch[1]}`
    }
  }

  // Extract candidate name and contact rows
  let candidateName = 'Resume'
  const contactLinesHtml: string[] = []
  const contactLinesMd: string[] = []

  const centerMatch = tex.match(/\\begin\{center\}([\s\S]*?)\\end\{center\}/)
  if (centerMatch) {
    const centerBody = centerMatch[1]
    const nameMatch = centerBody.match(/\\textbf\{\\Huge\s*(?:\\scshape)?\s*(?:\\color\{[^}]+\})?\s*([^}]+)\}/)
    if (nameMatch) {
      candidateName = nameMatch[1].trim()
    } else {
      const hugeMatch = centerBody.match(/\\Huge\s*(?:\\scshape)?\s*(?:\\textbf)?\{?([^}\\]+)\}?/)
      if (hugeMatch) candidateName = hugeMatch[1].trim()
    }

    const smallIdx = centerBody.indexOf('\\small')
    const restOfCenter = smallIdx !== -1 ? centerBody.slice(smallIdx + 6) : centerBody.replace(/\\textbf\{\\Huge[\s\S]*?\}/, '')
    const rawLines = restOfCenter
      .split(/\\\\(?:\[[^\]]*\])?/)
      .map(l => l.replace(/\\small\b/, '').trim())
      .filter(Boolean)

    for (const rLine of rawLines) {
      const parts = rLine.split('~|~').map(p => p.trim()).filter(Boolean)
      const formattedPartsHtml = parts.map(p => {
        const { html } = cleanLatexInline(p, primaryColor)
        return `<span>${html}</span>`
      })
      const formattedPartsMd = parts.map(p => cleanLatexInline(p, primaryColor).markdown)

      contactLinesHtml.push(`
        <div align="center" style="font-size: 11.5px; color: #334155; margin-bottom: 3px; display: flex; justify-content: center; align-items: center; gap: 8px; flex-wrap: wrap;">
          ${formattedPartsHtml.join('<span style="color: #94a3b8;">|</span>')}
        </div>
      `)
      contactLinesMd.push(formattedPartsMd.join(' · '))
    }
  }

  // Parse sections
  const sectionRegex = /\\section\{([^}]+)\}/g
  let m: RegExpExecArray | null
  const sectionList: { title: string; body: string }[] = []
  const sIndices: { title: string; index: number; endIdx: number }[] = []

  while ((m = sectionRegex.exec(tex)) !== null) {
    sIndices.push({
      title: m[1].replace(/\\&/g, '&').trim(),
      index: m.index,
      endIdx: m.index + m[0].length,
    })
  }

  for (let i = 0; i < sIndices.length; i++) {
    const cur = sIndices[i]
    const nxt = sIndices[i + 1]
    const end = nxt ? nxt.index : tex.indexOf('\\end{document}')
    const body = tex.slice(cur.endIdx, end !== -1 ? end : undefined).trim()
    sectionList.push({ title: cur.title, body })
  }

  function parseItemList(listStr: string): { html: string; md: string; items: string[] } {
    const items: string[] = []
    let cursor = 0
    while (cursor < listStr.length) {
      const itemMatch = listStr.slice(cursor).match(/\\(?:resumeItem|item)\b/)
      if (!itemMatch || itemMatch.index === undefined) break
      const start = cursor + itemMatch.index
      const isResumeItem = listStr.slice(start, start + 11).startsWith('\\resumeItem')
      if (isResumeItem) {
        const openBrace = listStr.indexOf('{', start)
        if (openBrace !== -1) {
          const extracted = extractBalancedBraces(listStr, openBrace + 1)
          if (extracted) {
            items.push(extracted.content.trim())
            cursor = extracted.endIdx + 1
            continue
          }
        }
      }
      const afterItem = start + itemMatch[0].length
      const nextItemMatch = listStr.slice(afterItem).match(/\\(?:resumeItem|item)\b|\\end\{itemize\}|\\resumeItemListEnd/)
      const end = nextItemMatch && nextItemMatch.index !== undefined ? afterItem + nextItemMatch.index : listStr.length
      items.push(listStr.slice(afterItem, end).trim())
      cursor = end
    }

    const html = `
      <ul style="margin: 2px 0 5px 0; padding-left: 14px; list-style-type: none;">
        ${items
          .map(it => {
            const { html: itemHtml } = cleanLatexInline(it, primaryColor)
            return `
            <li style="position: relative; padding-left: 14px; margin-bottom: 2px; font-size: 11.5px; line-height: 1.45; color: #334155;">
              <span style="position: absolute; left: 0; top: 0; color: ${primaryColor}; font-size: 10px;">•</span>
              ${itemHtml}
            </li>
          `
          })
          .join('\n')}
      </ul>
    `

    const md = items.map(it => `- ${cleanLatexInline(it, primaryColor).markdown}`).join('\n')
    return { html, md, items }
  }

  let renderedHtml = `
<style>
  .resume-sheet {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    max-width: 820px;
    margin: 0 auto;
    padding: 28px 36px 36px 36px;
    background: #ffffff;
    color: #1e293b;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    border-radius: 4px;
    line-height: 1.45;
  }
  .resume-sheet h1 {
    font-family: 'Times New Roman', Times, Georgia, serif;
    font-size: 26px;
    font-weight: 700;
    color: ${primaryColor};
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin: 0 0 5px 0;
    text-align: center;
  }
  .resume-sheet h2 {
    font-family: 'Times New Roman', Times, Georgia, serif;
    font-size: 13.5px;
    font-weight: 700;
    color: ${primaryColor};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 12px 0 4px 0;
    padding-bottom: 2px;
    border-bottom: 1.5px solid ${primaryColor};
  }
</style>
<div class="resume-sheet">
  <!-- Header -->
  <div style="text-align: center; margin-bottom: 12px;" align="center">
    <h1>${candidateName}</h1>
    ${contactLinesHtml.join('\n')}
  </div>
`

  let renderedMd = `# ${candidateName}\n\n${contactLinesMd.join('\n\n')}\n\n---\n\n`

  for (const sec of sectionList) {
    renderedHtml += `<h2>${sec.title}</h2>\n`
    renderedMd += `## ${sec.title}\n\n`

    const secBody = sec.body

    // Case 1: \hfill distributed row (e.g. Interests & Hobbies)
    if (secBody.includes('\\hfill')) {
      const rawItems = secBody
        .replace(/\\noindent\b/g, '')
        .replace(/\\small\b/g, '')
        .replace(/\\vspace\*?\{[^}]*\}/g, '')
        .replace(/\\hspace\*?\{[^}]*\}/g, '')
        .replace(/[{}]/g, '')
        .split('\\hfill')
        .map(s => s.trim())
        .filter(Boolean)

      const cleanItems = rawItems.map(it => cleanLatexInline(it, primaryColor))
      renderedHtml += `
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11.5px; color: #334155; padding: 2px 4px 4px 4px;">
          ${cleanItems.map(c => `<span>${c.html}</span>`).join('\n')}
        </div>
      `
      renderedMd += `${cleanItems.map(c => c.markdown).join('  ·  ')}\n\n`
      continue
    }

    // Case 2: Standalone item list (e.g. Technical Skills, Certifications)
    if (
      (secBody.includes('\\resumeItemListStart') || secBody.includes('\\begin{itemize}')) &&
      !secBody.includes('\\resumeSubheading') &&
      !secBody.includes('\\resumeProjectHeading')
    ) {
      const listParsed = parseItemList(secBody)
      renderedHtml += listParsed.html
      renderedMd += listParsed.md + '\n\n'
      continue
    }

    // Case 3: Pure paragraph / text (e.g. Summary)
    if (!secBody.includes('\\resumeSubheading') && !secBody.includes('\\resumeProjectHeading')) {
      const { html, markdown } = cleanLatexInline(secBody, primaryColor)
      renderedHtml += `<p style="font-size: 11.5px; line-height: 1.5; color: #334155; margin: 3px 0 5px 0; text-align: justify;">${html}</p>`
      renderedMd += `${markdown}\n\n`
      continue
    }

    // Case 4: Sequential subheadings and project headings
    let cursor = 0
    while (cursor < secBody.length) {
      const subIdx = secBody.indexOf('\\resumeSubheading', cursor)
      const projIdx = secBody.indexOf('\\resumeProjectHeading', cursor)

      if (subIdx === -1 && projIdx === -1) {
        break
      }

      if (subIdx !== -1 && (projIdx === -1 || subIdx < projIdx)) {
        // \resumeSubheading{inst}{loc}{degree}{date}
        const parsed = extractNBracedArgs(secBody, subIdx + 17, 4)
        if (!parsed) {
          cursor = subIdx + 17
          continue
        }
        const [inst, loc, degree, date] = parsed.args
        const instC = cleanLatexInline(inst, primaryColor)
        const locC = cleanLatexInline(loc, primaryColor)
        const degC = cleanLatexInline(degree, primaryColor)
        const dateC = cleanLatexInline(date, primaryColor)

        const nextSub = secBody.indexOf('\\resumeSubheading', parsed.endIdx)
        const nextProj = secBody.indexOf('\\resumeProjectHeading', parsed.endIdx)
        let endOfEntry = secBody.length
        if (nextSub !== -1 && nextSub < endOfEntry) endOfEntry = nextSub
        if (nextProj !== -1 && nextProj < endOfEntry) endOfEntry = nextProj

        const entryContent = secBody.slice(parsed.endIdx, endOfEntry)
        const listParsed =
          entryContent.includes('\\resumeItemListStart') || entryContent.includes('\\begin{itemize}')
            ? parseItemList(entryContent)
            : null

        renderedHtml += `
          <div style="display: flex; justify-content: space-between; align-items: baseline; font-size: 12px; margin-top: 5px; margin-bottom: 1px;">
            <div style="font-weight: 700; color: #0f172a;">${instC.html}</div>
            <div style="font-size: 11.5px; color: #475569; white-space: nowrap; margin-left: 12px; flex-shrink: 0;">${locC.html}</div>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: baseline; font-size: 11.5px; margin-bottom: 2px; color: #475569;">
            <div><em>${degC.html}</em></div>
            <div style="font-size: 11.5px; color: #475569; white-space: nowrap; margin-left: 12px; flex-shrink: 0;">${dateC.html}</div>
          </div>
          ${listParsed ? listParsed.html : ''}
        `

        renderedMd += `### ${instC.markdown} — *${locC.markdown}* *(${dateC.markdown})*\n*${degC.markdown}*\n`
        if (listParsed) renderedMd += `${listParsed.md}\n\n`
        else renderedMd += '\n'

        cursor = endOfEntry
      } else {
        // \resumeProjectHeading{title}{date}
        const parsed = extractNBracedArgs(secBody, projIdx + 21, 2)
        if (!parsed) {
          cursor = projIdx + 21
          continue
        }
        const [projTitle, date] = parsed.args
        const titleC = cleanLatexInline(projTitle, primaryColor)
        const dateC = cleanLatexInline(date, primaryColor)

        const nextSub = secBody.indexOf('\\resumeSubheading', parsed.endIdx)
        const nextProj = secBody.indexOf('\\resumeProjectHeading', parsed.endIdx)
        let endOfEntry = secBody.length
        if (nextSub !== -1 && nextSub < endOfEntry) endOfEntry = nextSub
        if (nextProj !== -1 && nextProj < endOfEntry) endOfEntry = nextProj

        const entryContent = secBody.slice(parsed.endIdx, endOfEntry)
        const listParsed =
          entryContent.includes('\\resumeItemListStart') || entryContent.includes('\\begin{itemize}')
            ? parseItemList(entryContent)
            : null

        renderedHtml += `
          <div style="display: flex; justify-content: space-between; align-items: baseline; font-size: 12px; margin-top: 5px; margin-bottom: 2px;">
            <div style="color: #0f172a;">${titleC.html}</div>
            <div style="font-size: 11.5px; color: #475569; font-weight: 500; white-space: nowrap; margin-left: 12px; flex-shrink: 0;">${dateC.html}</div>
          </div>
          ${listParsed ? listParsed.html : ''}
        `

        renderedMd += `### ${titleC.markdown} *(${dateC.markdown})*\n`
        if (listParsed) renderedMd += `${listParsed.md}\n\n`
        else renderedMd += '\n'

        cursor = endOfEntry
      }
    }
  }

  renderedHtml += `</div>`

  const children = [
    {
      type: 'rawBlock' as const,
      content: renderedHtml,
      markdown: renderedMd.trim(),
      latex: content,
    },
  ]

  const stats = computeDocumentStats(children)

  return {
    type: 'document',
    version: 1,
    metadata: {
      title: candidateName,
      author: candidateName,
      createdAt: new Date().toISOString(),
      sourceFormat: 'latex',
    },
    children,
    stats,
  }
}
