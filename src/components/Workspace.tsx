import React, { useRef, useState, useMemo } from 'react'
import {
  Upload,
  Trash2,
  Copy,
  Check,
  Download,
  FileSpreadsheet,
} from 'lucide-react'
import { useConverterStore } from '../store/useConverterStore'
import { RichPreview } from './RichPreview'
import { CodeOutputPreview } from './CodeOutputPreview'
import { CanvasBendCard } from './CanvasBendCard'
import { renderToMarkdown } from '../renderers/markdown'
import { renderToHtml } from '../renderers/html'
import { renderToLatex } from '../renderers/latex'
import { renderToPlainText } from '../renderers/text'

export const Workspace: React.FC = () => {
  const {
    inputContent,
    setInputContent,
    parsedDocument,
    selectedFormat,
    formatOptions,
    loadSample,
    clearDocument,
  } = useConverterStore()

  const [isDragging, setIsDragging] = useState(false)
  const [copiedRichText, setCopiedRichText] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Memoized rendered export strings from canonical AST
  const renderedMarkdown = useMemo(
    () => renderToMarkdown(parsedDocument),
    [parsedDocument]
  )

  const renderedHtml = useMemo(
    () =>
      renderToHtml(parsedDocument, {
        includeWrapper: formatOptions.html.includeWrapper,
        title: parsedDocument.metadata.title || 'Converted Document',
      }),
    [parsedDocument, formatOptions.html.includeWrapper]
  )

  const renderedLatex = useMemo(
    () =>
      renderToLatex(parsedDocument, {
        includePreamble: formatOptions.latex.includePreamble,
        documentClass: formatOptions.latex.documentClass,
      }),
    [parsedDocument, formatOptions.latex]
  )

  const renderedPlainText = useMemo(
    () => renderToPlainText(parsedDocument),
    [parsedDocument]
  )

  // Handle file uploads (txt, md, tex, html)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      if (typeof content === 'string') {
        setInputContent(content)
      }
    }
    reader.readAsText(file)
  }

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      if (typeof content === 'string') {
        setInputContent(content)
      }
    }
    reader.readAsText(file)
  }

  // Copy formatted rich text into system clipboard with rich MIME support
  const handleCopyRichText = async () => {
    try {
      const htmlSnippet = renderToHtml(parsedDocument, { includeWrapper: false })
      const plainSnippet = renderToPlainText(parsedDocument)

      const blobHtml = new Blob([htmlSnippet], { type: 'text/html' })
      const blobText = new Blob([plainSnippet], { type: 'text/plain' })

      const data = [
        new ClipboardItem({
          'text/html': blobHtml,
          'text/plain': blobText,
        }),
      ]
      await navigator.clipboard.write(data)
      setCopiedRichText(true)
      setTimeout(() => setCopiedRichText(false), 2000)
    } catch {
      // Fallback for browsers that restrict rich ClipboardItem
      navigator.clipboard.writeText(renderedMarkdown)
      setCopiedRichText(true)
      setTimeout(() => setCopiedRichText(false), 2000)
    }
  }

  // Download preview as HTML
  const handleDownloadPreviewHtml = () => {
    const fullHtml = renderToHtml(parsedDocument, {
      includeWrapper: true,
      title: 'Converted Document',
    })
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'converted-document.html'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
      {/* LEFT COLUMN: Input Workspace */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex flex-col h-[640px] rounded-2xl border transition-all ${
          isDragging
            ? 'border-blue-500 ring-4 ring-blue-500/10 bg-blue-50/20 dark:bg-blue-950/20'
            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs'
        }`}
      >
        {/* Input Header Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Document Input
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".md,.markdown,.txt,.tex,.html,.json"
              onChange={handleFileUpload}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
              title="Upload text or markdown file"
            >
              <Upload className="w-3.5 h-3.5 text-blue-500" />
              <span>Upload</span>
            </button>

            <button
              onClick={loadSample}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
              title="Load rich sample with math, tables, code, and lists"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-500" />
              <span>Sample</span>
            </button>

            <button
              onClick={clearDocument}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              title="Clear input"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
        </div>

        {/* Text Area */}
        <div className="relative flex-1 flex flex-col p-4">
          <textarea
            value={inputContent}
            onChange={(e) => setInputContent(e.target.value)}
            placeholder="Paste your LLM output, Markdown, LaTeX, or structured text here..."
            className="w-full h-full resize-none bg-transparent font-mono text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden"
            spellCheck={false}
          />

          {/* Drag and drop overlay */}
          {isDragging && (
            <div className="absolute inset-0 m-2 rounded-xl border-2 border-dashed border-blue-500 bg-blue-500/10 backdrop-blur-xs flex flex-col items-center justify-center text-blue-600 dark:text-blue-400 pointer-events-none">
              <Upload className="w-8 h-8 mb-2 animate-bounce" />
              <p className="font-semibold text-sm">Drop document file to import</p>
            </div>
          )}
        </div>

        {/* Input Footer Note */}
        <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between text-[11px] text-slate-400">
          <span>Real-time debounced AST parsing</span>
          <span>{inputContent.length} chars</span>
        </div>
      </div>

      {/* RIGHT COLUMN: Output Preview & Renderers */}
      <div className="flex flex-col h-[640px] rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
        {/* Output Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              {selectedFormat === 'preview'
                ? 'Rich Document Preview'
                : `${selectedFormat.toUpperCase()} Converted Output`}
            </span>
          </div>

          {selectedFormat === 'preview' && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyRichText}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-2xs"
                title="Copy formatted rich text to paste into Word, Docs, or email"
              >
                {copiedRichText ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      Copied Rich Text
                    </span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Rich Text</span>
                  </>
                )}
              </button>

              <button
                onClick={handleDownloadPreviewHtml}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shadow-sm shadow-blue-500/20"
                title="Download as standalone HTML document"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download HTML</span>
              </button>
            </div>
          )}
        </div>

        {/* Output Body Container */}
        <div className="flex-1 p-5 overflow-auto">
          {selectedFormat === 'preview' && (
            <CanvasBendCard className="h-full">
              <RichPreview document={parsedDocument} />
            </CanvasBendCard>
          )}

          {selectedFormat === 'markdown' && (
            <CodeOutputPreview
              content={renderedMarkdown}
              format="markdown"
              filename="converted-document"
            />
          )}

          {selectedFormat === 'html' && (
            <CodeOutputPreview
              content={renderedHtml}
              format="html"
              filename="converted-document"
            />
          )}

          {selectedFormat === 'latex' && (
            <CodeOutputPreview
              content={renderedLatex}
              format="latex"
              filename="converted-document"
            />
          )}

          {selectedFormat === 'text' && (
            <CodeOutputPreview
              content={renderedPlainText}
              format="text"
              filename="converted-document"
            />
          )}
        </div>
      </div>
    </div>
  )
}
