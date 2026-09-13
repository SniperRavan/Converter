import type { BlockNode, InlineNode, NormalizedDocument } from '../core/types'

function escapeLatex(text: string): string {
  return text
    .replace(/\\/g, '\u0000BACKSLASH\u0000')
    .replace(/([&%$#_{}])/g, '\\$1')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}')
    .replace(/</g, '\\textless{}')
    .replace(/>/g, '\\textgreater{}')
    .replace(/\u0000BACKSLASH\u0000/g, '\\textbackslash{}')
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
      const hasHeaders = Boolean(block.headers && block.headers.length > 0)
      const hasRows = Boolean(block.rows && block.rows.length > 0)
      if (!hasHeaders && !hasRows) return ''

      const numCols = Math.max(
        block.headers?.length || 0,
        block.rows?.[0]?.cells.length || 0,
        1
      )

      const colSpecs = Array.from({ length: numCols }, (_, i) => {
        const a = block.alignments?.[i]
        if (a === 'center') return 'c'
        if (a === 'right') return 'r'
        return 'l'
      }).join(' ')

      const headerContent = hasHeaders
        ? block.headers
            .map(c => `\\textbf{${c.children.map(renderInlineToLatex).join('')}}`)
            .join(' & ') + ' \\\\\n\\hline\n'
        : ''

      const rowsContent = hasRows
        ? block.rows
            .map(row => row.cells.map(c => c.children.map(renderInlineToLatex).join('')).join(' & ') + ' \\\\')
            .join('\n') + '\n\\hline\n'
        : ''

      return `\\begin{table}[h]\n\\centering\n\\begin{tabular}{${colSpecs}}\n\\hline\n${headerContent}${rowsContent}\\end{tabular}\n\\end{table}\n`
    }

    case 'thematicBreak':
      return '\\noindent\\rule{\\textwidth}{0.4pt}\n'

    case 'rawBlock': {
      const clean = block.content
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .trim()
      return clean ? `${escapeLatex(clean)}\n\n` : ''
    }

    default:
      return ''
  }
}

export interface LatexRenderOptions {
  includePreamble?: boolean
  documentClass?: 'article' | 'report' | 'book'
}

export function renderToLatex(doc: NormalizedDocument, options: LatexRenderOptions = {}): string {
  const extractText = (inlines: InlineNode[]): string =>
    inlines.map((i) => ('children' in i ? extractText((i as any).children) : (i as any).value || '')).join('')

  const firstBlock = doc.children[0]
  const firstBlockIsH1 = firstBlock && firstBlock.type === 'heading' && firstBlock.level === 1
  const h1Title = firstBlockIsH1 ? extractText(firstBlock.children).trim() : undefined

  // Determine document title: metadata.title, or first H1
  const title = doc.metadata?.title || h1Title
  const author = doc.metadata?.author
  const date = doc.metadata?.date

  // In full document mode with preamble:
  // If the first block is an H1 that was used as document title, promote it to \title + \maketitle
  // and omit it from the body to avoid duplicate title. Shift subsequent headings.
  const promoteFirstH1ToTitle = Boolean(
    options.includePreamble && firstBlockIsH1 && (doc.metadata?.title === h1Title || !doc.metadata?.title)
  )

  const bodyBlocks = promoteFirstH1ToTitle ? doc.children.slice(1) : doc.children

  const headingLevels = bodyBlocks
    .filter((c): c is BlockNode & { type: 'heading' } => c.type === 'heading')
    .map(h => h.level)
  const minHeadingLevel = headingLevels.length > 0 ? Math.min(...headingLevels) : 1
  const levelShift = minHeadingLevel > 1 ? minHeadingLevel - 1 : 0

  const body = bodyBlocks.map(c => renderBlockToLatex(c, levelShift)).join('\n')

  if (!options.includePreamble) {
    return (promoteFirstH1ToTitle ? doc.children.map(c => renderBlockToLatex(c, 0)).join('\n') : body).trim() + '\n'
  }

  const docClass = options.documentClass || 'article'

  const titleLine = title ? `\\title{${escapeLatex(title)}}` : ''
  const authorLine = author ? `\\author{${escapeLatex(author)}}` : ''
  const dateLine = date ? `\\date{${escapeLatex(date)}}` : (title ? '\\date{\\today}' : '')
  const makeTitleCmd = title ? '\\maketitle\n' : ''

  const metadataPreamble = [titleLine, authorLine, dateLine].filter(Boolean).join('\n')

  return `\\documentclass{${docClass}}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{graphicx}
\\usepackage{hyperref}
\\usepackage{listings}
\\usepackage{ulem}

${metadataPreamble ? metadataPreamble + '\n' : ''}
\\begin{document}
${makeTitleCmd}
${body.trim()}

\\end{document}
`
}
