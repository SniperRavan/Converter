/**
 * Converts LaTeX mathematical expressions into formatted, human-readable Unicode Math.
 * Handles Greek letters, superscripts, subscripts, fractions, operators, and functions.
 */

const GREEK_MAP: Record<string, string> = {
  '\\alpha': 'α',
  '\\beta': 'β',
  '\\gamma': 'γ',
  '\\delta': 'δ',
  '\\epsilon': 'ε',
  '\\varepsilon': 'ε',
  '\\zeta': 'ζ',
  '\\eta': 'η',
  '\\theta': 'θ',
  '\\vartheta': 'θ',
  '\\iota': 'ι',
  '\\kappa': 'κ',
  '\\lambda': 'λ',
  '\\mu': 'μ',
  '\\nu': 'ν',
  '\\xi': 'ξ',
  '\\pi': 'π',
  '\\varpi': 'ϖ',
  '\\rho': 'ρ',
  '\\varrho': 'ϱ',
  '\\sigma': 'σ',
  '\\varsigma': 'ς',
  '\\tau': 'τ',
  '\\upsilon': 'υ',
  '\\phi': 'φ',
  '\\varphi': 'ϕ',
  '\\chi': 'χ',
  '\\psi': 'ψ',
  '\\omega': 'ω',
  '\\Gamma': 'Γ',
  '\\Delta': 'Δ',
  '\\Theta': 'Θ',
  '\\Lambda': 'Λ',
  '\\Xi': 'Ξ',
  '\\Pi': 'Π',
  '\\Sigma': 'Σ',
  '\\Upsilon': 'Υ',
  '\\Phi': 'Φ',
  '\\Psi': 'Ψ',
  '\\Omega': 'Ω',
}

const SYMBOL_MAP: Record<string, string> = {
  '\\sum': '∑',
  '\\prod': '∏',
  '\\int': '∫',
  '\\iint': '∬',
  '\\iiint': '∭',
  '\\oint': '∮',
  '\\infty': '∞',
  '\\partial': '∂',
  '\\nabla': '∇',
  '\\pm': '±',
  '\\mp': '∓',
  '\\times': '×',
  '\\div': '÷',
  '\\cdot': '·',
  '\\ast': '∗',
  '\\star': '⋆',
  '\\circ': '∘',
  '\\bullet': '•',
  '\\leq': '≤',
  '\\le': '≤',
  '\\geq': '≥',
  '\\ge': '≥',
  '\\neq': '≠',
  '\\ne': '≠',
  '\\approx': '≈',
  '\\equiv': '≡',
  '\\sim': '∼',
  '\\simeq': '≃',
  '\\propto': '∝',
  '\\in': '∈',
  '\\notin': '∉',
  '\\subset': '⊂',
  '\\supset': '⊃',
  '\\subseteq': '⊆',
  '\\supseteq': '⊇',
  '\\cup': '∪',
  '\\cap': '∩',
  '\\forall': '∀',
  '\\exists': '∃',
  '\\nexists': '∄',
  '\\empty': '∅',
  '\\emptyset': '∅',
  '\\to': '→',
  '\\rightarrow': '→',
  '\\leftarrow': '←',
  '\\Rightarrow': '⇒',
  '\\Leftarrow': '⇐',
  '\\leftrightarrow': '↔',
  '\\Leftrightarrow': '⇔',
  '\\uparrow': '↑',
  '\\downarrow': '↓',
  '\\angle': '∠',
  '\\perp': '⊥',
  '\\hbar': 'ℏ',
  '\\hslash': 'ℏ',
  '\\dagger': '†',
  '\\ddagger': '‡',
  '\\langle': '⟨',
  '\\rangle': '⟩',
  '\\ell': 'ℓ',
  '\\Re': 'ℜ',
  '\\Im': 'ℑ',
  '\\wp': '℘',
  '\\aleph': 'ℵ',
  '\\prime': '′',
  '\\degree': '°',
  '\\ldots': '…',
  '\\cdots': '⋯',
  '\\vdots': '⋮',
  '\\ddots': '⋱',
  '\\lfloor': '⌊',
  '\\rfloor': '⌋',
  '\\lceil': '⌈',
  '\\rceil': '⌉',
}

const MATHCAL_MAP: Record<string, string> = {
  H: 'ℋ',
  L: 'ℒ',
  Z: '𝒵',
  D: '𝒟',
  F: 'ℱ',
  E: 'ℰ',
  B: 'ℬ',
  M: 'ℳ',
  R: 'ℛ',
  P: '𝒫',
  C: '𝒞',
  N: '𝒩',
  Q: '𝒬',
  A: '𝒜',
  G: '𝒢',
  I: 'ℐ',
  J: '𝒥',
  K: '𝒦',
  O: '𝒪',
  S: '𝒮',
  T: '𝒯',
  U: '𝒰',
  V: '𝒱',
  W: '𝒲',
  X: '𝒳',
  Y: '𝒴',
}

export const SUPERSCRIPT_MAP: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '+': '⁺',
  '-': '⁻',
  '=': '⁼',
  '(': '⁽',
  ')': '⁾',
  'i': 'ⁱ',
  'n': 'ⁿ',
  'm': 'ᵐ',
  'x': 'ˣ',
  'y': 'ʸ',
  'a': 'ᵃ',
  'b': 'ᵇ',
  'c': 'ᶜ',
  'd': 'ᵈ',
  'e': 'ᵉ',
  'f': 'ᶠ',
  'g': 'ᵍ',
  'h': 'ʰ',
  'j': 'ʲ',
  'k': 'ᵏ',
  'o': 'ᵒ',
  'p': 'ᵖ',
  'r': 'ʳ',
  's': 'ˢ',
  't': 'ᵗ',
  'u': 'ᵘ',
  'v': 'ᵛ',
  'w': 'ʷ',
  'z': 'ᶻ',
  'N': 'ᴺ',
  'T': 'ᵀ',
  'M': 'ᴹ',
  'H': 'ᴴ',
  '†': '†',
}

export const SUBSCRIPT_MAP: Record<string, string> = {
  '0': '₀',
  '1': '₁',
  '2': '₂',
  '3': '₃',
  '4': '₄',
  '5': '₅',
  '6': '₆',
  '7': '₇',
  '8': '₈',
  '9': '₉',
  '+': '₊',
  '-': '₋',
  '=': '₌',
  '(': '₍',
  ')': '₎',
  'a': 'ₐ',
  'e': 'ₑ',
  'h': 'ₕ',
  'i': 'ᵢ',
  'j': 'ⱼ',
  'k': 'ₖ',
  'l': 'ₗ',
  'm': 'ₘ',
  'n': 'ₙ',
  'o': 'ₒ',
  'p': 'ₚ',
  'r': 'ᵣ',
  's': 'ₛ',
  't': 'ₜ',
  'u': 'ᵤ',
  'v': 'ᵥ',
  'x': 'ₓ',
  'y': 'ᵧ',
  'β': 'ᵦ',
  'γ': 'ᵧ',
  'ρ': 'ᵨ',
  'φ': 'ᵩ',
  'χ': 'ᵪ',
}

/**
 * Extracts balanced curly brace contents starting at startIndex.
 */
function extractBraced(str: string, startIndex: number): { content: string; endIndex: number } | null {
  if (str[startIndex] !== '{') return null
  let depth = 0
  for (let i = startIndex; i < str.length; i++) {
    if (str[i] === '{') depth++
    else if (str[i] === '}') {
      depth--
      if (depth === 0) {
        return { content: str.slice(startIndex + 1, i), endIndex: i }
      }
    }
  }
  return null
}

/**
 * Converts a LaTeX formula into readable Unicode math.
 * Example: `J(\theta) = \frac{1}{2m} \sum_{i=1}^{m} (h_\theta(x^{(i)}) - y^{(i)})^2`
 * Output:  `J(θ) = 1/(2m) ∑ᵢ₌₁ᵐ (h_θ(x⁽ⁱ⁾) - y⁽ⁱ⁾)²`
 */
export function latexToUnicode(tex: string): string {
  if (!tex || !tex.trim()) return ''
  let s = tex.trim()

  // 1. Convert Greek letters
  for (const [k, v] of Object.entries(GREEK_MAP)) {
    s = s.replace(new RegExp(k.replace('\\', '\\\\') + '(?![a-zA-Z])', 'g'), v)
  }

  // 2. Convert mathematical symbols
  for (const [k, v] of Object.entries(SYMBOL_MAP)) {
    s = s.replace(new RegExp(k.replace('\\', '\\\\') + '(?![a-zA-Z])', 'g'), v)
  }

  // 3. Convert Square Roots: \sqrt[n]{x} or \sqrt{x}
  s = s.replace(/\\sqrt\[([^\]]+)\]\{([^{}]+)\}/g, (_m, root, inner) => `${root}√(${inner.trim()})`)
  s = s.replace(/\\sqrt\{([^{}]+)\}/g, (_m, inner) => `√(${inner.trim()})`)

  // 4. Convert Fractions: \frac{a}{b} with balanced brace support
  let fracIdx = 0
  while ((fracIdx = s.indexOf('\\frac')) !== -1) {
    let p = fracIdx + 5
    while (p < s.length && /\s/.test(s[p])) p++
    const num = extractBraced(s, p)
    if (!num) break
    p = num.endIndex + 1
    while (p < s.length && /\s/.test(s[p])) p++
    const den = extractBraced(s, p)
    if (!den) break

    const n = latexToUnicode(num.content).trim()
    const d = latexToUnicode(den.content).trim()
    const simpleN = !/[+\-*/=]/.test(n)
    const simpleD = !/[+\-*/=]/.test(d)
    let frac: string
    if (simpleN && simpleD && d.length <= 2) frac = `${n}/${d}`
    else if (simpleN) frac = `${n}/(${d})`
    else frac = `(${n})/(${d})`

    s = s.slice(0, fracIdx) + frac + s.slice(den.endIndex + 1)
  }

  // 5. Convert Superscripts: ^{...} or ^x
  s = s.replace(/\^\{([^{}]+)\}/g, (_m, inner) => {
    const chars: string[] = inner.trim().split('')
    if (chars.every((c: string) => c in SUPERSCRIPT_MAP)) {
      return chars.map((c: string) => SUPERSCRIPT_MAP[c] || c).join('')
    }
    return `^(${inner.trim()})`
  })
  s = s.replace(/\^([0-9a-zA-Z+-])/g, (_m, c: string) => (c in SUPERSCRIPT_MAP ? SUPERSCRIPT_MAP[c] : `^${c}`))
  s = s.replace(/\^[†\u2020]/g, '†')

  // 6. Convert Subscripts: _{...} or _x
  s = s.replace(/_\{([^{}]+)\}/g, (_m, inner) => {
    const chars: string[] = inner.trim().split('')
    if (chars.every((c: string) => c in SUBSCRIPT_MAP)) {
      return chars.map((c: string) => SUBSCRIPT_MAP[c] || c).join('')
    }
    return `_(${inner.trim()})`
  })
  s = s.replace(/_([0-9a-zA-Z+-\u0370-\u03FF])/g, (_m, c: string) => (c in SUBSCRIPT_MAP ? SUBSCRIPT_MAP[c] : `_${c}`))

  // 7. Accents & Calligraphy
  s = s.replace(/\\hat\{([^{}]+)\}/g, '$1\u0302')
  s = s.replace(/\\hat\s*([a-zA-Z\u0370-\u03FF])/g, '$1\u0302')
  s = s.replace(/\\vec\{([^{}]+)\}/g, '$1\u20D7')
  s = s.replace(/\\vec\s*([a-zA-Z\u0370-\u03FF])/g, '$1\u20D7')
  s = s.replace(/\\bar\{([^{}]+)\}/g, '$1\u0304')
  s = s.replace(/\\bar\s*([a-zA-Z\u0370-\u03FF])/g, '$1\u0304')
  s = s.replace(/\\dot\{([^{}]+)\}/g, '$1\u0307')
  s = s.replace(/\\dot\s*([a-zA-Z\u0370-\u03FF])/g, '$1\u0307')
  s = s.replace(/\\ddot\{([^{}]+)\}/g, '$1\u0308')
  s = s.replace(/\\ddot\s*([a-zA-Z\u0370-\u03FF])/g, '$1\u0308')
  s = s.replace(/\\tilde\{([^{}]+)\}/g, '$1\u0303')
  s = s.replace(/\\tilde\s*([a-zA-Z\u0370-\u03FF])/g, '$1\u0303')

  s = s.replace(/\\mathcal\{([A-Z])\}/g, (_m, char) => MATHCAL_MAP[char] || char)
  s = s.replace(/\\mathcal\s*([A-Z])/g, (_m, char) => MATHCAL_MAP[char] || char)

  // 8. Math functions without backslash
  s = s.replace(
    /\\(sin|cos|tan|sec|csc|cot|arcsin|arccos|arctan|sinh|cosh|tanh|exp|ln|log|lim|max|min|sup|inf|det|dim|ker|deg)(?![a-zA-Z])/g,
    '$1'
  )

  // 9. Strip font and text enclosures while preserving inner content
  const fontCommandRegex = /\\(mathrm|mathbf|mathit|mathsf|mathtt|mathbb|mathcal|text)\{([^{}]+)\}/g
  while (fontCommandRegex.test(s)) {
    s = s.replace(fontCommandRegex, '$2')
  }

  // 10. Bra-ket / Dirac notation
  s = s.replace(/\\braket\{([^{}]+)\}/g, '⟨$1⟩')
  s = s.replace(/\\ket\{([^{}]+)\}/g, '|$1⟩')
  s = s.replace(/\\bra\{([^{}]+)\}/g, '⟨$1|')

  // 11. Clean delimiters: \left., \right., \left\|, \right\|, \left, \right, \left(, \right), etc.
  s = s.replace(/\\(left|right)\./g, '')
  s = s.replace(/\\left\s*\\\|/g, '‖').replace(/\\right\s*\\\|/g, '‖')
  s = s.replace(/\\\|/g, '‖')
  s = s.replace(/\\left([()[\]{}|])/g, '$1')
  s = s.replace(/\\right([()[\]{}|])/g, '$1')
  s = s.replace(/\\(left|right)\s*/g, '')
  s = s.replace(/\\\{/g, '{').replace(/\\\}/g, '}')

  // 9. Remove LaTeX spacing commands
  s = s
    .replace(/\\[,;!]/g, ' ')
    .replace(/\\quad/g, '   ')
    .replace(/\\qquad/g, '      ')
    .replace(/\\(big|Big|bigg|Bigg)[lrm]?/g, '')

  // 10. Strip remaining stray braces
  s = s.replace(/[{}]/g, '')

  // 11. Normalize excessive whitespace
  s = s.replace(/[ \t]+/g, ' ').trim()

  return s
}
