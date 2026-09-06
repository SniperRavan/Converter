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
}

const SUPERSCRIPT_MAP: Record<string, string> = {
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
  'k': 'ᵏ',
  't': 'ᵗ',
}

const SUBSCRIPT_MAP: Record<string, string> = {
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

  // 4. Convert Fractions: \frac{a}{b}
  // Loop to handle nested fractions iteratively
  let fracIter = 0
  while (/\\frac\{([^{}]+)\}\{([^{}]+)\}/.test(s) && fracIter < 5) {
    s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, (_m, num, den) => {
      const n = num.trim()
      const d = den.trim()
      const simpleN = !/[+\-*/=]/.test(n)
      const simpleD = !/[+\-*/=]/.test(d)
      if (simpleN && simpleD && d.length <= 2) return `${n}/${d}`
      if (simpleN) return `${n}/(${d})`
      return `(${n})/(${d})`
    })
    fracIter++
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

  // 6. Convert Subscripts: _{...} or _x
  s = s.replace(/_\{([^{}]+)\}/g, (_m, inner) => {
    const chars: string[] = inner.trim().split('')
    if (chars.every((c: string) => c in SUBSCRIPT_MAP)) {
      return chars.map((c: string) => SUBSCRIPT_MAP[c] || c).join('')
    }
    return `_(${inner.trim()})`
  })
  s = s.replace(/_([0-9a-zA-Z+-])/g, (_m, c: string) => (c in SUBSCRIPT_MAP ? SUBSCRIPT_MAP[c] : `_${c}`))

  // 7. Strip font and text enclosures while preserving inner content
  s = s.replace(/\\(mathrm|mathbf|mathit|mathsf|mathtt|mathbb|mathcal|text)\{([^{}]+)\}/g, '$2')

  // 8. Clean delimiters: \left(, \right), \left[, \right], etc.
  s = s.replace(/\\left([()[\]{}|])/g, '$1')
  s = s.replace(/\\right([()[\]{}|])/g, '$1')
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
