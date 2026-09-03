import React, { useRef, useState, useMemo } from 'react'
import {
  Upload,
  Trash2,
  Copy,
  Check,
  Download,
  FileSpreadsheet,
  Terminal,
  FileCode2,
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
    detectionResult,
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

  // Handle file uploads
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
      {/* LEFT COLUMN: Input Terminal (Double-Bezel Architecture) */}
      <div className="group relative rounded-[2rem] p-1.5 bg-gradient-to-b from-slate-200/80 via-slate-200/40 to-transparent dark:from-white/[0.12] dark:via-white/[0.04] dark:to-transparent border border-slate-200/90 dark:border-white/[0.08] shadow-xl shadow-black/5 dark:shadow-black/40 flex flex-col">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative flex-1 flex flex-col min-h-[600px] h-full rounded-[calc(2rem-0.375rem)] bg-white/95 dark:bg-[#0c0e15]/95 border border-slate-200/60 dark:border-white/[0.05] overflow-hidden transition-all ${
            isDragging ? 'ring-2 ring-blue-500 bg-blue-50/30 dark:bg-blue-950/20' : ''
          }`}
        >
          {/* Top Terminal Bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/80 dark:border-white/[0.06] bg-slate-50/80 dark:bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-xs shadow-blue-500/50" />
              <span className="font-semibold text-xs tracking-wider uppercase text-slate-800 dark:text-slate-200">
                Input Source
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400 font-medium">
                {detectionResult.summary}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <input
                ref={fileInputRef}
                type="file"
                accept=".md,.markdown,.txt,.tex,.html,.json"
                onChange={handleFileUpload}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/[0.08] transition-colors"
                title="Upload file (.md, .txt, .tex, .html)"
              >
                <Upload className="w-3.5 h-3.5 text-blue-500" />
                <span>Upload</span>
              </button>

              <button
                onClick={loadSample}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/[0.08] transition-colors"
                title="Load complex mixed sample"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-500" />
                <span>Sample</span>
              </button>

              <button
                onClick={clearDocument}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                title="Clear content"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Textarea Surface */}
          <div className="relative flex-1 p-4 flex flex-col">
            <textarea
              value={inputContent}
              onChange={(e) => setInputContent(e.target.value)}
              placeholder="Paste raw LLM response, Markdown, LaTeX equations, or tables here..."
              className="w-full flex-1 min-h-[480px] resize-none bg-transparent font-mono text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-hidden"
              spellCheck={false}
            />

            {isDragging && (
              <div className="absolute inset-3 rounded-2xl border-2 border-dashed border-blue-500 bg-blue-500/10 backdrop-blur-xs flex flex-col items-center justify-center text-blue-600 dark:text-blue-400 pointer-events-none">
                <Upload className="w-10 h-10 mb-2 animate-bounce" />
                <p className="font-semibold text-sm">Drop document file to parse</p>
              </div>
            )}
          </div>

          {/* Footer Metrics */}
          <div className="px-4 py-2.5 border-t border-slate-100 dark:border-white/[0.04] bg-slate-50/50 dark:bg-white/[0.01] flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <Terminal className="w-3 h-3 text-slate-400" />
              <span>Real-time AST normalization</span>
            </span>
            <span>{inputContent.length.toLocaleString()} characters</span>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Output Canvas (Double-Bezel Architecture) */}
      <div className="group relative rounded-[2rem] p-1.5 bg-gradient-to-b from-slate-200/80 via-slate-200/40 to-transparent dark:from-white/[0.12] dark:via-white/[0.04] dark:to-transparent border border-slate-200/90 dark:border-white/[0.08] shadow-xl shadow-black/5 dark:shadow-black/40 flex flex-col">
        <div className="relative flex-1 flex flex-col min-h-[600px] h-full rounded-[calc(2rem-0.375rem)] bg-white/95 dark:bg-[#0c0e15]/95 border border-slate-200/60 dark:border-white/[0.05] overflow-hidden">
          
          {/* Top Canvas Bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/80 dark:border-white/[0.06] bg-slate-50/80 dark:bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-xs shadow-emerald-400/50" />
              <span className="font-semibold text-xs tracking-wider uppercase text-slate-800 dark:text-slate-200">
                {selectedFormat === 'preview' ? 'Visual Rich Preview' : `${selectedFormat.toUpperCase()} Output`}
              </span>
            </div>

            {selectedFormat === 'preview' ? (
              <div className="flex items-center gap-2">
                {/* Button-in-Button Pattern for Copy Rich Text */}
                <button
                  onClick={handleCopyRichText}
                  className="group/btn flex items-center gap-2 pl-3.5 pr-2 py-1.5 rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.06] hover:bg-slate-50 dark:hover:bg-white/[0.12] text-xs font-medium text-slate-800 dark:text-slate-200 transition-all shadow-xs active:scale-[0.98]"
                  title="Copy formatted rich text to clipboard"
                >
                  <span className="text-xs">
                    {copiedRichText ? 'Copied Rich Text!' : 'Copy Rich Text'}
                  </span>
                  <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center transition-transform group-hover/btn:scale-105">
                    {copiedRichText ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3 h-3 text-slate-600 dark:text-slate-300" />
                    )}
                  </span>
                </button>

                {/* Download Button */}
                <button
                  onClick={handleDownloadPreviewHtml}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-all shadow-md shadow-blue-500/20 active:scale-[0.98]"
                  title="Download standalone HTML document"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Export HTML</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <FileCode2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Synchronized with AST</span>
              </div>
            )}
          </div>

          {/* Canvas Render Surface */}
          <div className="flex-1 p-5 sm:p-6 overflow-auto">
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
    </div>
  )
}
