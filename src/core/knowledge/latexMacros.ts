import rawKnowledge from './latex_macros.json' with { type: 'json' }

export interface LatexKnowledge {
  _meta: {
    description: string
    source: string
    generatedAt: string
  }
  topCommands: string[]
  knownArities: Record<string, number>
  mathEnvironments: string[]
  allEnvironments: string[]
  packages: string[]
}

export const LATEX_MACROS_KNOWLEDGE: LatexKnowledge = rawKnowledge as LatexKnowledge
export const KNOWN_ARITIES: Record<string, number> = LATEX_MACROS_KNOWLEDGE.knownArities
export const MATH_ENVIRONMENTS: Set<string> = new Set(LATEX_MACROS_KNOWLEDGE.mathEnvironments)
