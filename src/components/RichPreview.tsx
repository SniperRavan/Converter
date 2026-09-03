import React, { useState } from 'react'
import katex from 'katex'
import { Copy, Check, Terminal, ExternalLink } from 'lucide-react'
import type { BlockNode, InlineNode, NormalizedDocument } from '../core/types'

interface InlineRendererProps {
  node: InlineNode
}

export const InlineRenderer: React.FC<InlineRendererProps> = ({ node }) => {
  switch (node.type) {
    case 'text':
      return <span>{node.value}</span>

    case 'strong':
      return (
        <strong className="font-semibold text-slate-900 dark:text-slate-100">
          {node.children.map((child, i) => (
            <InlineRenderer key={i} node={child} />
          ))}
        </strong>
      )

    case 'emphasis':
      return (
        <em className="italic">
          {node.children.map((child, i) => (
            <InlineRenderer key={i} node={child} />
          ))}
        </em>
      )

    case 'strikethrough':
      return (
        <del className="line-through opacity-70">
          {node.children.map((child, i) => (
            <InlineRenderer key={i} node={child} />
          ))}
        </del>
      )

    case 'inlineCode':
      return (
        <code className="px-1.5 py-0.5 mx-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[0.88em] text-blue-600 dark:text-blue-400 border border-slate-200/60 dark:border-slate-700/60">
          {node.value}
        </code>
      )

    case 'inlineMath': {
      try {
        const html = katex.renderToString(node.value, { throwOnError: false })
        return <span dangerouslySetInnerHTML={{ __html: html }} className="inline-math px-0.5" />
      } catch {
        return <code className="text-amber-500">${node.value}$</code>
      }
    }

    case 'link':
      return (
        <a
          href={node.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 text-blue-600 dark:text-blue-400 underline decoration-blue-500/40 underline-offset-2 hover:decoration-blue-500 transition-colors"
        >
          {node.children.map((child, i) => (
            <InlineRenderer key={i} node={child} />
          ))}
          <ExternalLink className="w-3 h-3 opacity-60 ml-0.5" />
        </a>
      )

    case 'image':
      return (
        <img
          src={node.url}
          alt={node.alt || ''}
          title={node.title}
          className="max-w-full rounded-lg border border-slate-200 dark:border-slate-700 my-2"
          loading="lazy"
        />
      )

    default:
      return null
  }
}

interface CodeBlockProps {
  language: string
  value: string
}

const CodeBlockRenderer: React.FC<CodeBlockProps> = ({ language, value }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative my-4 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 text-slate-100 shadow-sm">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/90 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-mono uppercase font-semibold text-[11px] tracking-wider text-slate-300">
            {language || 'text'}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white transition-colors"
          title="Copy code snippet"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-[11px] text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span className="text-[11px]">Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm font-mono leading-relaxed text-slate-200">
        <code>{value}</code>
      </pre>
    </div>
  )
}

interface MathBlockProps {
  value: string
}

const MathBlockRenderer: React.FC<MathBlockProps> = ({ value }) => {
  try {
    const html = katex.renderToString(value, {
      displayMode: true,
      throwOnError: false,
    })
    return (
      <div className="my-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 overflow-x-auto text-center shadow-xs">
        <div dangerouslySetInnerHTML={{ __html: html }} className="katex-display-container py-1" />
      </div>
    )
  } catch {
    return (
      <div className="my-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-mono text-sm">
        {value}
      </div>
    )
  }
}

export const BlockRenderer: React.FC<{ block: BlockNode }> = ({ block }) => {
  switch (block.type) {
    case 'heading': {
      const content = block.children.map((c, i) => <InlineRenderer key={i} node={c} />)
      if (block.level === 1) {
        return <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-6 mb-3 text-slate-900 dark:text-white">{content}</h1>
      }
      if (block.level === 2) {
        return <h2 className="text-xl sm:text-2xl font-semibold tracking-tight mt-5 mb-2.5 text-slate-900 dark:text-slate-100">{content}</h2>
      }
      if (block.level === 3) {
        return <h3 className="text-lg sm:text-xl font-semibold mt-4 mb-2 text-slate-800 dark:text-slate-200">{content}</h3>
      }
      return <h4 className="text-base sm:text-lg font-medium mt-3 mb-1.5 text-slate-800 dark:text-slate-200">{content}</h4>
    }

    case 'paragraph':
      return (
        <p className="my-3 leading-relaxed text-slate-700 dark:text-slate-300">
          {block.children.map((c, i) => (
            <InlineRenderer key={i} node={c} />
          ))}
        </p>
      )

    case 'blockquote':
      return (
        <blockquote className="my-4 pl-4 py-1 border-l-4 border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 rounded-r-lg italic text-slate-700 dark:text-slate-300">
          {block.children.map((child, i) => (
            <BlockRenderer key={i} block={child} />
          ))}
        </blockquote>
      )

    case 'codeBlock':
      return <CodeBlockRenderer language={block.language} value={block.value} />

    case 'mathBlock':
      return <MathBlockRenderer value={block.value} />

    case 'list': {
      const Tag = block.ordered ? 'ol' : 'ul'
      const listStyle = block.ordered ? 'list-decimal' : 'list-disc'
      return (
        <Tag className={`my-3 pl-6 space-y-1.5 ${listStyle} text-slate-700 dark:text-slate-300`}>
          {block.items.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {item.children.map((child, cIdx) => {
                if ('type' in child && (child.type === 'paragraph' || child.type === 'heading')) {
                  return child.children.map((c, i) => <InlineRenderer key={i} node={c} />)
                }
                if ('type' in child && child.type === 'list') {
                  return <BlockRenderer key={cIdx} block={child} />
                }
                return null
              })}
            </li>
          ))}
        </Tag>
      )
    }

    case 'table': {
      return (
        <div className="my-5 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80">
                {block.headers.map((cell, idx) => (
                  <th
                    key={idx}
                    className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-200"
                    style={{ textAlign: cell.align || 'left' }}
                  >
                    {cell.children.map((c, i) => (
                      <InlineRenderer key={i} node={c} />
                    ))}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800/70">
              {block.rows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                  {row.cells.map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      className="px-4 py-2.5 text-slate-700 dark:text-slate-300"
                      style={{ textAlign: cell.align || 'left' }}
                    >
                      {cell.children.map((c, i) => (
                        <InlineRenderer key={i} node={c} />
                      ))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }

    case 'thematicBreak':
      return <hr className="my-6 border-slate-200 dark:border-slate-800" />

    case 'rawBlock':
      return <div className="my-2 p-2 font-mono text-xs bg-slate-100 dark:bg-slate-800 rounded">{block.content}</div>

    default:
      return null
  }
}

interface RichPreviewProps {
  document: NormalizedDocument
}

export const RichPreview: React.FC<RichPreviewProps> = ({ document }) => {
  if (!document.children || document.children.length === 0) {
    return (
      <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
        <div className="w-12 h-12 mb-3 rounded-full bg-blue-500/10 dark:bg-blue-400/10 flex items-center justify-center text-blue-500">
          ✨
        </div>
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1">
          Document Canvas is Empty
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
          Paste your LLM output, Markdown, or mathematics into the left editor, or click "Sample" above to explore.
        </p>
      </div>
    )
  }

  return (
    <article className="prose prose-slate dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 leading-relaxed font-sans">
      {document.children.map((block, idx) => (
        <BlockRenderer key={idx} block={block} />
      ))}
    </article>
  )
}
