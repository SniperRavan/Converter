import type { BlockNode, InlineNode, NormalizedDocument } from '../core/types'

function escapeLatex(text: string): string {
  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/([&%$#_{}])/g, '\\$1')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}')
    .replace(/</g, '\\textless{}')
    .replace(/>/g, '\\textgreater{}')
}

function renderInlineToLatex(node: InlineNode): string {
  switch (node.type) {
    case 'text':
      return escapeLatex(node.value)
    case 'strong':
      return `\\textbf{${node.children.map(renderInlineToLatex).join('')}}`
    case 'emphasis':
      return `\\textit{${node.children.map(renderInlineToLatex).join('')}}`
    case 'strikethrough':
      return `\\sout{${node.children.map(renderInlineToLatex).join('')}}`
    case 'inlineCode':
      return `\\texttt{${escapeLatex(node.value)}}`
    case 'inlineMath':
      return `$${node.value}$`
    case 'link':
      return `\\href{${node.url}}{${node.children.map(renderInlineToLatex).join('')}}`
    case 'image':
      return `\\begin{figure}[h]\\centering\\includegraphics[width=0.8\\textwidth]{${node.url}}\\caption{${escapeLatex(node.alt || '')}}\\end{figure}`
    default:
      return ''
  }
}

function renderBlockToLatex(block: BlockNode, levelShift = 0): string {
  switch (block.type) {
    case 'heading': {
      const titles = ['section', 'subsection', 'subsubsection', 'paragraph', 'subparagraph', 'textbf']
      const effectiveLevel = Math.max(1, block.level - levelShift)
      const cmd = titles[effectiveLevel - 1] || 'textbf'
      const content = block.children.map(renderInlineToLatex).join('')
      if (cmd === 'textbf') {
        return `\\noindent\\textbf{${content}}\n`
      }
      return `\\${cmd}{${content}}\n`
    }

    case 'paragraph': {
      const content = block.children.map(renderInlineToLatex).join('')
      return `${content}\n`
    }

    case 'blockquote': {
      const inner = block.children.map(c => renderBlockToLatex(c, levelShift)).join('\n')
      return `\\begin{quote}\n${inner.trim()}\n\\end{quote}\n`
    }

    case 'codeBlock': {
      return `\\begin{lstlisting}[language=${block.language || 'text'}]\n${block.value}\n\\end{lstlisting}\n`
    }

    case 'mathBlock': {
      return `\\begin{equation}\n${block.value.trim()}\n\\end{equation}\n`
    }

    case 'list': {
      const env = block.ordered ? 'enumerate' : 'itemize'
      const items = block.items
        .map(item => {
          const content = item.children
            .map(child => {
              if ('type' in child && (child.type === 'paragraph' || child.type === 'heading')) {
                return child.children.map(renderInlineToLatex).join('')
              }
              if ('type' in child && child.type === 'list') {
                return '\n' + renderBlockToLatex(child)
              }
              return ''
            })
            .join(' ')
          return `  \\item ${content}`
        })
        .join('\n')
      return `\\begin{${env}}\n${items}\n\\end{${env}}\n`
    }

    case 'table': {
      if (!block.headers || block.headers.length === 0) return ''

      const colSpecs = block.alignments.map(a => {
        if (a === 'center') return 'c'
        if (a === 'right') return 'r'
        return 'l'
      }).join(' ')

      const headerContent = block.headers
        .map(c => `\\textbf{${c.children.map(renderInlineToLatex).join('')}}`)
        .join(' & ') + ' \\\\'

      const rowsContent = block.rows
        .map(row => row.cells.map(c => c.children.map(renderInlineToLatex).join('')).join(' & ') + ' \\\\')
        .join('\n')

      return `\\begin{table}[h]\n\\centering\n\\begin{tabular}{${colSpecs}}\n\\hline\n${headerContent}\n\\hline\n${rowsContent}\n\\hline\n\\end{tabular}\n\\end{table}\n`
    }

    case 'thematicBreak':
      return '\\noindent\\rule{\\textwidth}{0.4pt}\n'

    case 'rawBlock':
      return `${block.content}\n`

    default:
      return ''
  }
}

export interface LatexRenderOptions {
  includePreamble?: boolean
  documentClass?: 'article' | 'report' | 'book'
}

export function renderToLatex(doc: NormalizedDocument, options: LatexRenderOptions = {}): string {
  const headingLevels = doc.children
    .filter((c): c is BlockNode & { type: 'heading' } => c.type === 'heading')
    .map(h => h.level)
  const minHeadingLevel = headingLevels.length > 0 ? Math.min(...headingLevels) : 1
  const levelShift = minHeadingLevel > 1 ? minHeadingLevel - 1 : 0

  const body = doc.children.map(c => renderBlockToLatex(c, levelShift)).join('\n')

  if (!options.includePreamble) {
    return body.trim() + '\n'
  }

  const docClass = options.documentClass || 'article'
  return `\\documentclass{${docClass}}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{graphicx}
\\usepackage{hyperref}
\\usepackage{listings}
\\usepackage{ulem}

\\title{Converted Document}
\\author{Convertion}
\\date{\\today}

\\begin{document}
\\maketitle

${body.trim()}

\\end{document}
`
}
