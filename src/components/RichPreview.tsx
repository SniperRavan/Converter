import React, { useState } from 'react'
import katex from 'katex'
import DOMPurify from 'dompurify'
import { Copy, Check, Terminal, ExternalLink } from 'lucide-react'
import type { BlockNode, InlineNode, NormalizedDocument } from '../core/types'
import { useConverterStore } from '../store/useConverterStore'
import { latexToUnicode } from '../utils/mathUnicode'

interface InlineRendererProps {
  node: InlineNode
}

export const InlineRenderer: React.FC<InlineRendererProps> = ({ node }) => {
  switch (node.type) {
    case 'text':
      return <span>{node.value}</span>

    case 'strong':
      return (
        <strong className="font-semibold text-slate-950 dark:text-white">
          {node.children.map((child, i) => (
            <InlineRenderer key={i} node={child} />
          ))}
        </strong>
      )

    case 'emphasis':
      return (
        <em className="italic text-slate-800 dark:text-slate-200">
          {node.children.map((child, i) => (
            <InlineRenderer key={i} node={child} />
          ))}
        </em>
      )

    case 'strikethrough':
      return (
        <del className="line-through opacity-60">
          {node.children.map((child, i) => (
            <InlineRenderer key={i} node={child} />
          ))}
        </del>
      )

    case 'inlineCode':
      return (
        <code className="px-1.5 py-0.5 mx-0.5 rounded bg-slate-200/60 dark:bg-white/[0.08] font-mono text-[0.88em] text-blue-600 dark:text-blue-400 border border-slate-300/40 dark:border-white/[0.08]">
          {node.value}
        </code>
      )

    case 'inlineMath': {
      let html = ''
      let isError = false
      try {
        html = katex.renderToString(node.value, { throwOnError: false })
      } catch {
        isError = true
      }
      if (isError) {
        return <code className="text-amber-500 font-mono">${node.value}$</code>
      }
      return <span dangerouslySetInnerHTML={{ __html: html }} className="inline-math px-0.5 text-slate-900 dark:text-slate-100" />
    }

    case 'link': {
      const isOnlyImage = node.children.length === 1 && node.children[0].type === 'image'
      if (isOnlyImage) {
        return (
          <a
            href={node.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block align-middle mx-0.5 transition-opacity hover:opacity-80"
          >
            <InlineRenderer node={node.children[0]} />
          </a>
        )
      }
      return (
        <a
          href={node.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 text-blue-600 dark:text-blue-400 font-medium underline decoration-blue-500/30 underline-offset-2 hover:decoration-blue-500 transition-colors"
        >
          {node.children.map((child, i) => (
            <InlineRenderer key={i} node={child} />
          ))}
          <ExternalLink className="w-3 h-3 opacity-60 ml-0.5" />
        </a>
      )
    }

    case 'image': {
      const isBadgeOrIcon =
        Boolean(node.url && (
          /shields\.io|badge|skillicons|typing-svg|capsule-render|giphy\.gif|streak-stats|summary-cards/i.test(node.url) ||
          /\.(svg|gif)$/i.test(node.url)
        ))

      return (
        <img
          src={node.url}
          alt={node.alt || ''}
          title={node.title}
          className={
            isBadgeOrIcon
              ? 'inline-block align-middle my-1 mx-0.5 max-h-9 object-contain'
              : 'max-w-full rounded-xl border border-slate-200 dark:border-white/10 my-3 shadow-md'
          }
          loading="lazy"
        />
      )
    }

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
    <div className="relative my-3 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 bg-[#0a0c13] text-slate-100 shadow-md">
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-white/[0.06] bg-white/[0.02] text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-mono uppercase font-semibold text-[11px] tracking-wider text-slate-300">
            {language || 'text'}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white transition-all active:scale-95"
          title="Copy code snippet"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-[11px] text-emerald-400 font-medium">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span className="text-[11px]">Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-xs sm:text-sm font-mono leading-relaxed text-slate-200">
        <code>{value}</code>
      </pre>
    </div>
  )
}

interface MathBlockProps {
  value: string
}

const MathBlockRenderer: React.FC<MathBlockProps> = ({ value }) => {
  let html = ''
  let isError = false
  try {
    html = katex.renderToString(value, {
      displayMode: true,
      throwOnError: false,
    })
  } catch {
    isError = true
  }

  if (isError) {
    return (
      <div className="my-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-500 font-mono text-xs">
        {value}
      </div>
    )
  }

  return (
    <div className="my-3.5 p-4 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/[0.08] overflow-x-auto text-center shadow-xs">
      <div dangerouslySetInnerHTML={{ __html: html }} className="py-1 text-slate-900 dark:text-slate-100" />
    </div>
  )
}

export const BlockRenderer: React.FC<{ block: BlockNode; isActive?: boolean }> = ({ block, isActive }) => {
  const activeClass = isActive
    ? 'ring-2 ring-blue-500/80 bg-blue-500/[0.06] dark:bg-blue-500/[0.12] rounded-lg p-1.5 -m-1.5 transition-all duration-200 shadow-xs'
    : 'transition-all duration-200'

  const renderContent = () => {
    switch (block.type) {
      case 'heading': {
        const content = block.children.map((c, i) => <InlineRenderer key={i} node={c} />)
        if (block.level === 1) {
          return (
            <div
              role="heading"
              aria-level={1}
              className="text-2xl sm:text-3xl font-bold tracking-tight mt-5 mb-2.5 text-slate-950 dark:text-white font-sans"
            >
              {content}
            </div>
          )
        }
        if (block.level === 2) {
          return (
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight mt-5 mb-2 pb-1 border-b border-slate-200/60 dark:border-white/[0.06] text-slate-900 dark:text-slate-100 font-sans">
              {content}
            </h2>
          )
        }
        if (block.level === 3) {
          return (
            <h3 className="text-lg sm:text-xl font-semibold mt-4 mb-1.5 text-slate-800 dark:text-slate-200 font-sans">
              {content}
            </h3>
          )
        }
        return (
          <h4 className="text-base font-medium mt-3 mb-1 text-slate-800 dark:text-slate-200 font-sans">
            {content}
          </h4>
        )
      }

      case 'paragraph':
        return (
          <p className="my-2.5 leading-relaxed text-slate-700 dark:text-slate-300">
            {block.children.map((c, i) => (
              <InlineRenderer key={i} node={c} />
            ))}
          </p>
        )

      case 'blockquote':
        return (
          <blockquote className="my-3 pl-4 py-1.5 border-l-3 border-blue-500 bg-blue-50/50 dark:bg-blue-500/[0.04] rounded-r-lg italic text-slate-700 dark:text-slate-300">
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
          <Tag className={`my-2.5 pl-6 space-y-1 ${listStyle} text-slate-700 dark:text-slate-300`}>
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
        const hasHeaders = Boolean(block.headers && block.headers.length > 0)
        return (
          <div className="my-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10 shadow-xs">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              {hasHeaders && (
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04]">
                    {block.headers.map((cell, idx) => (
                      <th
                        key={idx}
                        className="px-4 py-2.5 font-semibold text-slate-900 dark:text-white"
                        style={{ textAlign: cell.align || 'left' }}
                      >
                        {cell.children.map((c, i) => (
                          <InlineRenderer key={i} node={c} />
                        ))}
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody className="divide-y divide-slate-200/70 dark:divide-white/[0.04]">
                {block.rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors">
                    {row.cells.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        className="px-4 py-2 text-slate-700 dark:text-slate-300"
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
        return <hr className="my-5 border-slate-200 dark:border-white/10" />

      case 'rawBlock': {
        const trimmed = block.content.trim()
        // If it is purely structural HTML markup (e.g. <table>, <tr>, <td>, </td>, </tr>, </table>, <div>, </div>)
        // without text or images, don't render an ugly raw code block.
        const isPureStructuralTag = /^(<\/?(table|tbody|thead|tr|td|th|div)\b[^>]*>\s*)+$/i.test(trimmed)
        if (isPureStructuralTag) {
          return null
        }

        // If it contains HTML markup (like <img...>, <p...>, <a...>, etc.), render it visually sanitized
        if (/<[a-z][\s\S]*>/i.test(trimmed)) {
          const cleanHtml =
            typeof DOMPurify !== 'undefined' && typeof DOMPurify.sanitize === 'function'
              ? DOMPurify.sanitize(block.content, {
                  USE_PROFILES: { html: true, svg: true },
                  ADD_ATTR: [
                    'target',
                    'rel',
                    'style',
                    'align',
                    'width',
                    'height',
                    'src',
                    'alt',
                    'hspace',
                    'vspace',
                    'class',
                    'id',
                  ],
                })
              : block.content
          return (
            <div
              className="my-2 leading-relaxed [&_img]:inline-block [&_img]:align-middle"
              dangerouslySetInnerHTML={{ __html: cleanHtml }}
            />
          )
        }

        return (
          <div className="my-2 p-2.5 font-mono text-xs bg-slate-100 dark:bg-white/[0.05] rounded-lg">
            {block.content}
          </div>
        )
      }

      default:
        return null
    }
  }

  return <div className={activeClass}>{renderContent()}</div>
}

interface RichPreviewProps {
  document: NormalizedDocument
}

export const RichPreview: React.FC<RichPreviewProps> = ({ document }) => {
  const { activeLine } = useConverterStore()

  const handleSelectionCopy = (e: React.ClipboardEvent<HTMLElement>) => {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed || !e.clipboardData) return

    const range = selection.getRangeAt(0)
    const cloned = range.cloneContents()

    // Check if selection contains KaTeX math
    const katexNodes = cloned.querySelectorAll('.katex')
    if (katexNodes.length === 0) return

    // 1. Plain text: Replace math with formatted Unicode Math
    const textClone = cloned.cloneNode(true) as DocumentFragment
    textClone.querySelectorAll('.katex').forEach((kNode) => {
      const annotation = kNode.querySelector('annotation[encoding*="tex"]') || kNode.querySelector('annotation')
      const latex = annotation?.textContent?.trim() || ''
      const unicodeMath = latex ? latexToUnicode(latex) : ''
      const span = window.document.createElement('span')
      span.textContent = unicodeMath || latex
      kNode.replaceWith(span)
    })
    const plainText = textClone.textContent || ''

    // 2. HTML: Pure MathML without duplicate .katex-html visual spans
    const htmlClone = cloned.cloneNode(true) as DocumentFragment
    htmlClone.querySelectorAll('.katex').forEach((kNode) => {
      const mathml = kNode.querySelector('.katex-mathml math')
      const annotation = kNode.querySelector('annotation')
      if (annotation) annotation.remove()
      const katexHtml = kNode.querySelector('.katex-html')
      if (katexHtml) katexHtml.remove()
      if (mathml) {
        kNode.replaceWith(mathml)
      }
    })
    const tempDiv = window.document.createElement('div')
    tempDiv.appendChild(htmlClone)
    const cleanHtml = tempDiv.innerHTML

    e.clipboardData.setData('text/plain', plainText)
    e.clipboardData.setData('text/html', cleanHtml)
    e.preventDefault()
  }

  if (!document.children || document.children.length === 0) {
    return (
      <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-8 text-slate-400">
        <div className="w-12 h-12 mb-3 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
          ✨
        </div>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
          Visual Preview Ready
        </h3>
        <p className="text-xs text-slate-500 max-w-sm">
          Type or paste markdown on the left to see live formatting with synchronized line tracking.
        </p>
      </div>
    )
  }

  return (
    <article
      onCopy={handleSelectionCopy}
      className="prose prose-slate dark:prose-invert max-w-none text-slate-800 dark:text-slate-200 leading-relaxed font-sans text-sm"
    >
      {document.children.map((block, idx) => {
        const isBlockActive =
          activeLine != null &&
          block.startLine != null &&
          block.endLine != null &&
          activeLine >= block.startLine &&
          activeLine <= block.endLine

        return <BlockRenderer key={idx} block={block} isActive={isBlockActive} />
      })}
    </article>
  )
}
