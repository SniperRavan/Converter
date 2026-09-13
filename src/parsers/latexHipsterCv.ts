import type { NormalizedDocument } from '../core/types'
import { computeDocumentStats } from '../core/stats'

const PIRATE_AVATAR_SVG = `
<svg width="112" height="112" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" style="border-radius: 50%; border: 2.5px solid #2c3038; box-shadow: 0 2px 8px rgba(0,0,0,0.15); display: block; margin: 0 auto; background: #2c3038;">
  <defs>
    <clipPath id="avatar-clip">
      <circle cx="60" cy="60" r="58" />
    </clipPath>
    <linearGradient id="skin" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#e0a97a"/>
      <stop offset="100%" stop-color="#c68a55"/>
    </linearGradient>
    <linearGradient id="bandana" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#b91c1c"/>
      <stop offset="100%" stop-color="#ef4444"/>
    </linearGradient>
  </defs>
  <g clip-path="url(#avatar-clip)">
    <rect width="120" height="120" fill="#334155" />
    <path d="M15 125 C15 95 35 88 60 88 C85 88 105 95 105 125 Z" fill="#1e293b" />
    <path d="M45 92 L60 120 L75 92 Z" fill="#f8fafc" />
    <path d="M26 48 C22 68 24 88 28 105 M32 46 C28 66 30 86 35 102 M88 46 C92 66 90 86 85 102 M94 48 C98 68 96 88 92 105" stroke="#261b14" stroke-width="4" stroke-linecap="round" fill="none" />
    <rect x="51" y="70" width="18" height="22" fill="url(#skin)" />
    <ellipse cx="60" cy="54" rx="23" ry="26" fill="url(#skin)" />
    <path d="M37 52 C33 70 38 85 41 98 M83 52 C87 70 82 85 79 98" stroke="#3d2314" stroke-width="3.5" stroke-linecap="round" fill="none" />
    <path d="M35 44 C42 32 78 32 85 44 C82 48 38 48 35 44 Z" fill="url(#bandana)" />
    <path d="M33 43 Q60 36 87 43" stroke="#991b1b" stroke-width="3" fill="none" />
    <path d="M35 45 C28 48 25 55 27 62 C29 56 34 52 36 49 Z" fill="#b91c1c" />
    <circle cx="36" cy="74" r="2.5" fill="#f59e0b" />
    <circle cx="37" cy="82" r="2.5" fill="#06b6d4" />
    <circle cx="83" cy="76" r="2.5" fill="#f59e0b" />
    <ellipse cx="51" cy="53" rx="3.5" ry="2.5" fill="#0f172a" />
    <ellipse cx="69" cy="53" rx="3.5" ry="2.5" fill="#0f172a" />
    <circle cx="52" cy="52" r="1" fill="#ffffff" />
    <circle cx="70" cy="52" r="1" fill="#ffffff" />
    <path d="M46 53 Q51 50 56 53 M64 53 Q69 50 74 53" stroke="#0f172a" stroke-width="1.8" fill="none" stroke-linecap="round" />
    <path d="M47 48 Q51 46 56 49 M64 49 Q69 46 73 48" stroke="#1c1917" stroke-width="2" fill="none" stroke-linecap="round" />
    <path d="M59 52 L57 61 L63 61" stroke="#9a6438" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M52 65 Q60 67 68 65" stroke="#1c1917" stroke-width="1.8" fill="none" stroke-linecap="round" />
    <path d="M57 68 Q60 74 63 68" fill="#1c1917" />
    <path d="M58 74 L57 82 M62 74 L63 82" stroke="#1c1917" stroke-width="1.5" stroke-linecap="round" />
  </g>
</svg>
`
const SHIP_LOGO_SVG = `
<svg width="34" height="28" viewBox="0 0 36 30" xmlns="http://www.w3.org/2000/svg" style="display: block; opacity: 0.85; flex-shrink: 0;">
  <path d="M6 24 C12 28 24 28 30 24 C28 20 8 20 6 24 Z" fill="#2c3038" />
  <line x1="18" y1="6" x2="18" y2="21" stroke="#2c3038" stroke-width="2" stroke-linecap="round" />
  <path d="M18 7 Q26 10 18 15 Q13 11 18 7 Z" fill="#475569" />
  <path d="M18 15 Q24 17 18 20 Q14 18 18 15 Z" fill="#64748b" />
  <line x1="10" y1="12" x2="10" y2="21" stroke="#2c3038" stroke-width="1.5" stroke-linecap="round" />
  <path d="M10 13 Q15 15 10 19 Q7 16 10 13 Z" fill="#475569" />
</svg>
`
const MEDAL_LOGO_SVG = `
<svg width="28" height="28" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" style="display: block; opacity: 0.85; flex-shrink: 0;">
  <circle cx="16" cy="18" r="10" fill="#d97706" stroke="#78350f" stroke-width="1.5" />
  <circle cx="16" cy="18" r="8" fill="#f59e0b" />
  <path d="M11 6 L14 12 L9 12 Z" fill="#dc2626" />
  <path d="M21 6 L18 12 L23 12 Z" fill="#2563eb" />
  <text x="16" y="22" font-family="serif" font-size="10" font-weight="bold" fill="#78350f" text-anchor="middle">★</text>
</svg>
`

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

export function parseHipsterCv(content: string): NormalizedDocument | null {
  let firstName = 'Jack'
  let lastName = 'Sparrow'
  let role = 'Captain'
  const headerIdx = content.indexOf('\\simpleheader')
  if (headerIdx !== -1) {
    const parsed = extractNBracedArgs(content, headerIdx + 13, 5)
    if (parsed) {
      firstName = parsed.args[1].trim()
      lastName = parsed.args[2].trim()
      role = parsed.args[3].trim()
    }
  } else {
    const titleMatch = content.match(/\\title\{([^}]+)\}/)
    const authorMatch = content.match(/\\author\{([^}]+)\}/)
    if (authorMatch) {
      const parts = authorMatch[1].replace(/\\LaTeX\{\}/g, 'LaTeX').trim().split(/\s+/)
      firstName = parts[0] || 'Jack'
      lastName = parts.slice(1).join(' ') || 'Sparrow'
    }
    if (titleMatch) role = titleMatch[1].trim()
  }
  const fullName = `${firstName} ${lastName}`.trim()

  const paracolMatch = content.match(/\\begin\{paracol\}\{2\}([\s\S]*?)\\end\{paracol\}/)
  const paracolBody = paracolMatch ? paracolMatch[1] : content

  const switchColIdx = paracolBody.indexOf('\\switchcolumn')
  const leftColRaw = switchColIdx !== -1 ? paracolBody.slice(0, switchColIdx) : ''
  const rightColRaw = switchColIdx !== -1 ? paracolBody.slice(switchColIdx + 13) : paracolBody

  const photoMatch = content.match(/\\roundpic\{([^}]+)\}/)
  const photoSrc = photoMatch ? photoMatch[1].trim() : 'jack.jpg'

  const expandLorem = (str: string) =>
    str.replace(/\\lorem\b/g, 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec a diam lectus. ')

  const bgSections: { label: string; text: string; isMono?: boolean }[] = []
  let searchIdx = 0
  while (true) {
    const idx = leftColRaw.indexOf('\\bg{', searchIdx)
    if (idx === -1) break
    const parsed = extractNBracedArgs(leftColRaw, idx + 3, 3)
    if (!parsed) {
      searchIdx = idx + 4
      continue
    }
    const label = parsed.args[2].trim()
    const startOfText = parsed.endIdx

    const nextBg = leftColRaw.indexOf('\\bg{', startOfText)
    const nextBubble = leftColRaw.indexOf('\\infobubble', startOfText)
    let endOfText = leftColRaw.length
    if (nextBg !== -1 && nextBg < endOfText) endOfText = nextBg
    if (nextBubble !== -1 && nextBubble < endOfText) endOfText = nextBubble

    const rawSection = leftColRaw.slice(startOfText, endOfText)
    const isMono = /\\texttt|Android|Linux/i.test(rawSection)

    const cleaned = expandLorem(rawSection)
      .replace(/\\{1,2}\s*\[\s*-?[\d.]+\s*(?:pt|mm|cm|in|ex|em)?\s*\]/g, '\n')
      .replace(/\\\\/g, '\n')
      .replace(/\\bigskip\b/g, '\n')
      .replace(/\\medskip\b/g, '\n')
      .replace(/\\smallskip\b/g, '\n')
      .replace(/\\footnotesize\b/g, '')
      .replace(/\\small\b/g, '')
      .replace(/\\vspace\*?\{[^}]*\}/g, '')
      .replace(/\\texttt\{([^}]+)\}/g, '$1')
      .replace(/~/g, ' ')
      .replace(/[{}]/g, '')
      .trim()

    bgSections.push({ label, text: cleaned, isMono })
    searchIdx = parsed.endIdx
  }

  const infoBubbles: { icon: string; text: string; link?: string }[] = []
  let bubbleIdx = 0
  while (true) {
    const idx = leftColRaw.indexOf('\\infobubble', bubbleIdx)
    if (idx === -1) break
    const parsed = extractNBracedArgs(leftColRaw, idx + 11, 4)
    if (!parsed) {
      bubbleIdx = idx + 11
      continue
    }
    const rawIcon = parsed.args[0].trim()
    const text = parsed.args[3].trim()
    let iconChar = '@'
    let link = ''
    if (rawIcon.includes('faAt') || (text.includes('@') && text.includes('.'))) {
      iconChar = '@'
      link = `mailto:${text}`
    } else if (rawIcon.includes('faTwitter') || text.startsWith('@')) {
      iconChar = '🐦'
      link = `https://twitter.com/${text.replace('@', '')}`
    } else if (rawIcon.includes('faFacebook')) {
      iconChar = 'f'
    } else if (rawIcon.includes('faGithub')) {
      iconChar = '🐙'
      link = `https://github.com/${text}`
    }
    infoBubbles.push({ icon: iconChar, text, link })
    bubbleIdx = parsed.endIdx
  }

  const leftColHtml = `
    <aside style="width: 27%; min-width: 215px; max-width: 250px; background-color: #eaeded; padding: 24px 16px 28px; box-sizing: border-box; text-align: right; font-size: 11px; color: #334155; display: flex; flex-direction: column;">
      <div style="display: flex; justify-content: center; margin-bottom: 20px;">
        ${PIRATE_AVATAR_SVG}
      </div>

      ${bgSections.map(sec => {
        const lines = sec.text.split('\n').map(l => l.trim()).filter(Boolean)
        const innerContent = sec.isMono
          ? `<div style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 10px; line-height: 1.65; color: #475569; text-align: right;">
              ${lines.map(l => `<div>${l}</div>`).join('')}
             </div>`
          : `<div style="font-size: 10.5px; line-height: 1.45; color: #475569; text-align: right;">
              ${lines.map(l => `<div>${l}</div>`).join('')}
             </div>`

        return `
          <div style="margin-top: 12px; margin-bottom: 4px;">
            <div style="display: flex; justify-content: flex-end; margin-bottom: 5px;">
              <span style="background-color: #2aa1c2; color: #ffffff; font-size: 10.5px; font-weight: 700; padding: 3px 9px; border-radius: 3px; display: inline-block; letter-spacing: 0.2px;">
                ${sec.label}
              </span>
            </div>
            ${innerContent}
          </div>
        `
      }).join('')}

      <div style="margin-top: auto; padding-top: 24px; display: flex; flex-direction: column; gap: 8px;">
        ${infoBubbles.map(b => `
          <div style="display: flex; align-items: center; justify-content: flex-start; gap: 8px; font-size: 11px; font-weight: 500;">
            <span style="width: 22px; height: 22px; border-radius: 50%; background-color: #2aa1c2; color: #ffffff; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; flex-shrink: 0;">
              ${b.icon}
            </span>
            ${b.link
              ? `<a href="${b.link}" style="color: #1e293b; text-decoration: none;">${b.text}</a>`
              : `<span style="color: #1e293b;">${b.text}</span>`
            }
          </div>
        `).join('')}
      </div>
    </aside>
  `

  const parseEvents = (sourceText: string) => {
    const events: { dates: string; title: string; role: string; loc: string; desc: string; logo: string }[] = []
    let cursor = 0
    while (true) {
      const idx = sourceText.indexOf('\\cvevent', cursor)
      if (idx === -1) break
      const parsed = extractNBracedArgs(sourceText, idx + 8, 6)
      if (!parsed) {
        cursor = idx + 8
        continue
      }
      events.push({
        dates: parsed.args[0].replace(/--/g, '–').trim(),
        title: parsed.args[1].trim(),
        role: parsed.args[2].trim(),
        loc: parsed.args[3].replace(/\\color\{[^}]+\}/g, '').trim(),
        desc: expandLorem(parsed.args[4]).trim(),
        logo: parsed.args[5].trim(),
      })
      cursor = parsed.endIdx
    }
    return events
  }

  const parseDegrees = (sourceText: string) => {
    const degrees: { year: string; title: string; level: string; uni: string; logo: string }[] = []
    let cursor = 0
    while (true) {
      const idx = sourceText.indexOf('\\cvdegree', cursor)
      if (idx === -1) break
      const parsed = extractNBracedArgs(sourceText, idx + 9, 6)
      if (!parsed) {
        cursor = idx + 9
        continue
      }
      degrees.push({
        year: parsed.args[0].replace(/--/g, '–').trim(),
        title: parsed.args[1].trim(),
        level: parsed.args[2].trim(),
        uni: parsed.args[3].replace(/\\color\{[^}]+\}/g, '').trim(),
        logo: parsed.args[5].trim(),
      })
      cursor = parsed.endIdx
    }
    return degrees
  }

  const parseSkills = (sourceText: string) => {
    const skills: { label: string; pct: number; color: string }[] = []
    let cursor = 0
    while (true) {
      const bgIdx = sourceText.indexOf('\\bg{', cursor)
      if (bgIdx === -1) break
      const barIdx = sourceText.indexOf('\\barrule', bgIdx)
      if (barIdx === -1 || barIdx > bgIdx + 120) {
        cursor = bgIdx + 4
        continue
      }
      const bgParsed = extractNBracedArgs(sourceText, bgIdx + 3, 3)
      const barParsed = extractNBracedArgs(sourceText, barIdx + 8, 3)
      if (bgParsed && barParsed) {
        let label = bgParsed.args[2].trim()
        if (label === '\\LaTeX') label = 'LaTeX'
        const pct = Math.round((parseFloat(barParsed.args[0]) || 0.5) * 100)
        const colorName = barParsed.args[2].trim()
        const color = colorName === 'cvgreen' ? '#2aa1c2' : '#e67e22'
        skills.push({ label, pct, color })
        cursor = barParsed.endIdx
      } else {
        cursor = bgIdx + 4
      }
    }
    return skills
  }

  const renderEventList = (events: ReturnType<typeof parseEvents>) => {
    return events.map(ev => `
      <div style="display: flex; flex-direction: row; margin-bottom: 14px;">
        <div style="width: 78px; text-align: right; padding-right: 12px; font-size: 11px; font-weight: 500; color: #475569; flex-shrink: 0; line-height: 1.4;">
          ${ev.dates}
        </div>
        <div style="flex: 1; border-left: 1.5px solid #2c3038; padding-left: 12px; padding-bottom: 8px; min-width: 0;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
            <div>
              <div style="font-size: 12.5px; font-weight: 700; color: #0f172a; line-height: 1.2;">${ev.title}</div>
              <div style="font-size: 11px; font-weight: 500; color: #64748b; margin-top: 2px;">
                ${ev.role ? `${ev.role.toUpperCase()} · ` : ''}${ev.loc} <span style="color: #dc2626;">📍</span>
              </div>
            </div>
            ${ev.logo ? (ev.logo.includes('disney') ? SHIP_LOGO_SVG : MEDAL_LOGO_SVG) : ''}
          </div>
          ${ev.desc ? `<div style="font-size: 11px; color: #475569; line-height: 1.4; margin-top: 4px;">${ev.desc}</div>` : ''}
        </div>
      </div>
    `).join('')
  }

  const renderDegrees = (degrees: ReturnType<typeof parseDegrees>) => {
    return degrees.map(d => `
      <div style="display: flex; flex-direction: row; align-items: center; margin-bottom: 10px; font-size: 11px;">
        <div style="width: 42px; font-weight: 500; color: #475569; flex-shrink: 0;">${d.year}</div>
        <div style="flex: 1; min-width: 0;">
          <div style="font-weight: 700; color: #0f172a;">${d.title}</div>
          <div style="color: #64748b; font-size: 10.5px;">
            ${d.level ? `${d.level.toUpperCase()} · ` : ''}${d.uni} <span style="color: #0284c7;">🏛️</span>
          </div>
        </div>
        ${d.logo ? (d.logo.includes('disney') ? SHIP_LOGO_SVG : MEDAL_LOGO_SVG) : ''}
      </div>
    `).join('')
  }

  const renderSkills = (skills: ReturnType<typeof parseSkills>) => {
    return skills.map(s => `
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
        <span style="width: 68px; text-align: center; background-color: #e2e8f0; color: #1e293b; font-size: 10.5px; font-weight: 600; padding: 2px 6px; border-radius: 3px; flex-shrink: 0;">
          ${s.label}
        </span>
        <div style="flex: 1; height: 7px; background-color: transparent;">
          <div style="width: ${s.pct}%; height: 7px; background-color: ${s.color}; border-radius: 2px;"></div>
        </div>
      </div>
    `).join('')
  }

  const sectionHeading = (title: string) => `
    <div style="margin-top: 14px; margin-bottom: 8px;">
      <h2 style="font-size: 13.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #1e293b; margin: 0; padding-bottom: 2px; border-bottom: 1.5px solid #2c3038;">
        ${title}
      </h2>
    </div>
  `

  const curriculumIdx = rightColRaw.indexOf('Curriculum')
  const shortResumePart = curriculumIdx !== -1 ? rightColRaw.slice(0, curriculumIdx) : rightColRaw
  const curriculumPart = curriculumIdx !== -1 ? rightColRaw.slice(curriculumIdx) : ''

  const rightColHtml = `
    <main style="flex: 1; min-width: 0; background-color: #ffffff; padding: 22px 28px 24px; box-sizing: border-box; color: #1e293b; font-size: 12px; display: flex; flex-direction: column;">
      ${sectionHeading('Short Resumé')}
      ${renderEventList(parseEvents(shortResumePart))}

      <!-- Minipages Row 1: Degrees & Programming -->
      <div style="display: flex; flex-direction: row; gap: 24px; margin-bottom: 10px;">
        <div style="flex: 1.1; min-width: 0;">
          ${sectionHeading('Degrees')}
          ${renderDegrees(parseDegrees(rightColRaw))}
        </div>
        <div style="flex: 0.9; min-width: 0;">
          ${sectionHeading('Programming')}
          <div style="padding-top: 4px;">
            ${renderSkills(parseSkills(rightColRaw))}
          </div>
        </div>
      </div>

      ${sectionHeading('Curriculum')}
      ${renderEventList(parseEvents(curriculumPart))}

      <!-- Minipages Row 2: Certificates & Languages / Publications & Talks -->
      <div style="display: flex; flex-direction: row; gap: 24px; margin-bottom: 14px;">
        <div style="flex: 1; min-width: 0;">
          ${sectionHeading('Certificates & Grants')}
          <div style="font-size: 11px; line-height: 1.5; color: #334155;">
            <div style="display: flex; gap: 8px; margin-bottom: 2px;"><strong style="width: 65px; flex-shrink: 0;">1708</strong><span>Captain's Certificates</span></div>
            <div style="display: flex; gap: 8px; margin-bottom: 2px;"><strong style="width: 65px; flex-shrink: 0;">1710</strong><span>Travel grant</span></div>
            <div style="display: flex; gap: 8px;"><strong style="width: 65px; flex-shrink: 0;">1715–1716</strong><span>Grant from the Pirate's Company</span></div>
          </div>

          ${sectionHeading('Languages')}
          <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 4px;">
            <tr>
              <td style="font-weight: 700; padding: 2px 6px 2px 0; border-right: 1px solid #94a3b8; width: 62px;">English</td>
              <td style="padding: 2px 8px; width: 28px; color: #475569;">C2</td>
              <td style="padding: 2px 0; color: #64748b; font-size: 10px;">mother tongue</td>
            </tr>
            <tr>
              <td style="font-weight: 700; padding: 2px 6px 2px 0; border-right: 1px solid #94a3b8;">French</td>
              <td style="padding: 2px 8px; color: #475569;">C2</td>
              <td style="padding: 2px 0;">
                <span style="color: #2aa1c2; font-size: 11px; letter-spacing: 2px;">●●●</span><span style="color: #cbd5e1; font-size: 11px; letter-spacing: 2px;">●</span>
              </td>
            </tr>
            <tr>
              <td style="font-weight: 700; padding: 2px 6px 2px 0; border-right: 1px solid #94a3b8;">Spanish</td>
              <td style="padding: 2px 8px; color: #475569;">C2</td>
              <td style="padding: 2px 0;">
                <span style="color: #2aa1c2; font-size: 11px; letter-spacing: 2px;">●</span><span style="color: #cbd5e1; font-size: 11px; letter-spacing: 2px;">●●●</span>
              </td>
            </tr>
            <tr>
              <td style="font-weight: 700; padding: 2px 6px 2px 0; border-right: 1px solid #94a3b8;">Italian</td>
              <td style="padding: 2px 8px; color: #475569;">C2</td>
              <td style="padding: 2px 0;">
                <span style="color: #2aa1c2; font-size: 11px; letter-spacing: 2px;">●●●</span><span style="color: #cbd5e1; font-size: 11px; letter-spacing: 2px;">●</span>
              </td>
            </tr>
          </table>
        </div>

        <div style="flex: 1; min-width: 0;">
          ${sectionHeading('Publications')}
          <div style="font-size: 11px; line-height: 1.45; color: #334155;">
            <div style="display: flex; gap: 8px; margin-bottom: 4px;">
              <strong style="width: 40px; flex-shrink: 0;">1729</strong>
              <span><em>How I almost got killed by Lady Swan</em>, Tortuga Printing Press.</span>
            </div>
            <div style="display: flex; gap: 8px;">
              <strong style="width: 40px; flex-shrink: 0;">1720</strong>
              <span>“Privateering for Beginners”, in: <em>The Pragmatic Pirate</em> (1/1720).</span>
            </div>
          </div>

          ${sectionHeading('Talks')}
          <div style="font-size: 11px; line-height: 1.45; color: #334155;">
            <div style="display: flex; gap: 8px;">
              <strong style="width: 62px; flex-shrink: 0;">Nov. 1726</strong>
              <span>“How I lost my ship (& and how to get it back)”, at: <em>Annual Pirate's Conference</em> in Tortuga, Nov. 1726.</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div style="margin-top: auto; padding-top: 20px; text-align: center; font-size: 10.5px; color: #475569; line-height: 1.6;">
        <div>${fullName} ✉️ The Black Pearl 📍 Tortuga 📞 0099/333 5647380</div>
        <div style="margin-top: 3px;">
          <span style="display: inline-flex; align-items: center; gap: 4px; border: 1px solid #00d4ff; padding: 1px 6px; border-radius: 2px;">
            <span style="color: #0284c7;">@</span>
            <a href="mailto:jack@sparrow.com" style="color: #0284c7; text-decoration: none;">jack@sparrow.com</a>
          </span>
        </div>
      </div>
    </main>
  `

  const fullHtml = `
    <div style="max-width: 880px; margin: 0 auto; background: #ffffff; color: #1e293b; font-family: 'Raleway', system-ui, -apple-system, sans-serif; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border-radius: 4px; overflow: hidden; line-height: 1.45; border: 1px solid rgba(0,0,0,0.08);">
      <header style="background: #2c3038; color: #ffffff; padding: 26px 20px 22px; text-align: center;">
        <div style="font-size: 32px; font-weight: 300; letter-spacing: 0.5px; color: #ffffff; line-height: 1.2;">
          ${firstName} <span style="font-weight: 800;">${lastName}</span>
        </div>
        <div style="font-size: 13px; font-weight: 400; letter-spacing: 1.5px; color: #cbd5e1; margin-top: 6px; text-transform: uppercase;">
          ${role}
        </div>
      </header>
      <div style="display: flex; flex-direction: row; min-height: 850px; align-items: stretch;">
        ${leftColHtml}
        ${rightColHtml}
      </div>
    </div>
  `

  function formatBarRule(pct: number): string {
    const totalBlocks = 10
    const filled = Math.round((pct / 100) * totalBlocks)
    const empty = totalBlocks - filled
    return `${'█'.repeat(filled)}${'░'.repeat(empty)} ${pct}%`
  }

  const markdown = `
# ${fullName}

### ${role}

---

![Profile Photo](${photoSrc})

### About me
${bgSections.find(s => s.label.toLowerCase().includes('about'))?.text || ''}

### personal
${bgSections.find(s => s.label.toLowerCase().includes('personal'))?.text || ''}

${infoBubbles.map(b => `${b.icon === '@' ? '✉️' : b.icon === '🐦' ? '🐦' : b.icon} [${b.text}](${b.link || b.text})`).join('\n\n')}

## Short Resumé
| Date | Position | Logo |
| --- | --- | --- |
${parseEvents(shortResumePart).map(e => `| ${e.dates} | **${e.title}**<br>${e.role ? `${e.role} · ` : ''}${e.loc}<br>${e.desc} | ${e.logo ? `![Logo](${e.logo})` : ''} |`).join('\n')}

## Degrees
${parseDegrees(rightColRaw).map(d => `* **${d.year}** | **${d.title}** — ${d.level} · ${d.uni}`).join('\n')}

## Programming
| Skill | Level |
| --- | --- |
${parseSkills(rightColRaw).map(s => `| **${s.label}** | ${formatBarRule(s.pct)} |`).join('\n')}

## Curriculum
| Date | Position | Logo |
| --- | --- | --- |
${parseEvents(curriculumPart).map(e => `| ${e.dates} | **${e.title}**<br>${e.role ? `${e.role} · ` : ''}${e.loc}<br>${e.desc} | ${e.logo ? `![Logo](${e.logo})` : ''} |`).join('\n')}

## Certificates & Grants
* **1708**: Captain's Certificates
* **1710**: Travel grant
* **1715–1716**: Grant from the Pirate's Company

## Languages
| Language | Level | Description |
| --- | --- | --- |
| **English** | C2 | mother tongue |
| **French** | C2 | ●●●○ |
| **Spanish** | C2 | ●○○○ |
| **Italian** | C2 | ●●●○ |

## Publications
* **1729**: *How I almost got killed by Lady Swan*, Tortuga Printing Press.
* **1720**: “Privateering for Beginners”, in: *The Pragmatic Pirate* (1/1720).

## Talks
* **Nov. 1726**: “How I lost my ship (& and how to get it back)”, at: *Annual Pirate's Conference* in Tortuga, Nov. 1726.

---
${fullName} · The Black Pearl · Tortuga · 0099/333 5647380 · [jack@sparrow.com](mailto:jack@sparrow.com)
  `.trim()

  const children = [
    {
      type: 'rawBlock' as const,
      content: fullHtml,
      markdown,
    },
  ]

  const stats = computeDocumentStats(children)

  return {
    type: 'document',
    version: 1,
    metadata: {
      title: fullName,
      author: fullName,
      date: role,
      createdAt: new Date().toISOString(),
      sourceFormat: 'latex',
    },
    children,
    stats,
  }
}
