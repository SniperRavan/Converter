import React, { useRef, useState, useMemo } from 'react'
import {
  Upload,
  RotateCcw,
  Copy,
  Check,
  Download,
  FileText,
  Link2,
  Link2Off,
  ChevronDown,
} from 'lucide-react'
import { useConverterStore } from '../store/useConverterStore'
import { RichPreview } from './RichPreview'
import { CodeOutputPreview } from './CodeOutputPreview'
import { CanvasBendCard } from './CanvasBendCard'
import { renderToMarkdown } from '../renderers/markdown'
import { renderToHtml } from '../renderers/html'
import { renderToLatex } from '../renderers/latex'
import { renderToPlainText } from '../renderers/text'
import { exportToWord, exportToPdf, exportToFile } from '../utils/exporters'

export const Workspace: React.FC = () => {
  const {
    inputContent,
    setInputContent,
    parsedDocument,
    selectedFormat,
    setSelectedFormat,
    formatOptions,
    loadSample,
    clearDocument,
    activeLine,
    setActiveLine,
    syncScrollEnabled,
    setSyncScrollEnabled,
  } = useConverterStore()

  const [isDragging, setIsDragging] = useState(false)
  const [copiedRichText, setCopiedRichText] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Scroll sync refs
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const gutterRef = useRef<HTMLDivElement>(null)
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const isSyncingScrollRef = useRef<'editor' | 'preview' | null>(null)

  // Rendered export formats
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

  // Line calculations for line numbers gutter
  const lineCount = useMemo(() => {
    return Math.max(inputContent.split('\n').length, 1)
  }, [inputContent])

  const lineNumbers = useMemo(() => {
    return Array.from({ length: lineCount }, (_, i) => i + 1)
  }, [lineCount])

  // Track cursor position for line indicator
  const handleCursorMove = () => {
    const el = textareaRef.current
    if (!el) return
    const pos = el.selectionStart
    const line = el.value.substring(0, pos).split('\n').length
    setActiveLine(line)
  }

  // Handle Synchronized Scrolling: Editor -> Preview
  const handleEditorScroll = () => {
    const textarea = textareaRef.current
    const gutter = gutterRef.current
    const preview = previewContainerRef.current

    if (!textarea) return

    if (gutter) {
      gutter.scrollTop = textarea.scrollTop
    }

    if (!syncScrollEnabled || isSyncingScrollRef.current === 'preview') return

    isSyncingScrollRef.current = 'editor'
    if (preview) {
      const scrollableDist = textarea.scrollHeight - textarea.clientHeight
      const percentage = scrollableDist > 0 ? textarea.scrollTop / scrollableDist : 0
      preview.scrollTop = percentage * (preview.scrollHeight - preview.clientHeight)
    }

    setTimeout(() => {
      if (isSyncingScrollRef.current === 'editor') {
        isSyncingScrollRef.current = null
      }
    }, 50)
  }

  // Handle Synchronized Scrolling: Preview -> Editor
  const handlePreviewScroll = () => {
    if (!syncScrollEnabled || isSyncingScrollRef.current === 'editor') return

    const textarea = textareaRef.current
    const preview = previewContainerRef.current
    if (!textarea || !preview) return

    isSyncingScrollRef.current = 'preview'
    const scrollableDist = preview.scrollHeight - preview.clientHeight
    const percentage = scrollableDist > 0 ? preview.scrollTop / scrollableDist : 0
    textarea.scrollTop = percentage * (textarea.scrollHeight - textarea.clientHeight)

    if (gutterRef.current) {
      gutterRef.current.scrollTop = textarea.scrollTop
    }

    setTimeout(() => {
      if (isSyncingScrollRef.current === 'preview') {
        isSyncingScrollRef.current = null
      }
    }, 50)
  }

  // Smart File Processor
  const processFile = (file: File) => {
    const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name)

    if (isImage) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string
        if (typeof dataUrl === 'string') {
          const cleanName = file.name.replace(/\.[^/.]+$/, '')
          const imageMd = `\n\n![${cleanName}](${dataUrl})\n\n`
          setInputContent(inputContent ? `${inputContent}\n${imageMd}` : imageMd)
        }
      }
      reader.readAsDataURL(file)
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      if (typeof content === 'string') {
        setInputContent(content)
      }
    }
    reader.readAsText(file)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

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
    if (file) processFile(file)
  }

  // Copy Rich Text to Clipboard (Exact formatting for Word, Docs, Notion)
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

  return (
    <div className="w-full">
      {/* 2-Column Grid matching markdowntorichtext.com */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* ================= LEFT CARD: Markdown Input ================= */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 text-slate-900 dark:text-slate-100 shadow-sm flex flex-col transition-colors">
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800">
            <h3 className="tracking-tight text-lg font-semibold text-slate-900 dark:text-white">
              Markdown Input
            </h3>

            <div className="flex items-center space-x-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".md,.markdown,.txt,.tex,.html,.json,.png,.jpg,.jpeg,.svg"
                onChange={handleFileUpload}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 h-9 rounded-md px-3 transition-colors cursor-pointer shadow-2xs"
                title="Upload Markdown file"
              >
                <Upload className="h-4 w-4 mr-1.5 text-slate-500 dark:text-slate-400" />
                <span>Upload .md</span>
              </button>

              <button
                onClick={loadSample}
                className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 h-9 rounded-md px-3 transition-colors cursor-pointer shadow-2xs"
                title="Load sample Markdown content"
              >
                <FileText className="h-4 w-4 mr-1.5 text-slate-500 dark:text-slate-400" />
                <span>Sample</span>
              </button>

              <button
                onClick={clearDocument}
                className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 h-9 rounded-md px-3 transition-colors cursor-pointer shadow-2xs"
                title="Clear content"
              >
                <RotateCcw className="h-4 w-4 mr-1.5 text-slate-500 dark:text-slate-400" />
                <span>Clear</span>
              </button>
            </div>
          </div>

          {/* Body: Line Numbers + Textarea */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className="relative flex-1 flex min-h-[500px] max-h-[620px] bg-slate-50/40 dark:bg-black/20 overflow-hidden font-mono text-sm"
          >
            {/* Gutter with Line Numbers */}
            <div
              ref={gutterRef}
              aria-hidden="true"
              className="w-12 shrink-0 py-3 bg-slate-100/60 dark:bg-black/30 border-r border-slate-200/80 dark:border-slate-800 select-none overflow-hidden text-right pr-2 text-slate-400/80 font-mono text-xs"
            >
              {lineNumbers.map((num) => (
                <div
                  key={num}
                  className={`h-5 leading-5 transition-colors ${
                    activeLine === num
                      ? 'text-blue-600 dark:text-blue-400 font-bold bg-blue-500/10 -mr-2 pr-2 border-r-2 border-blue-500'
                      : ''
                  }`}
                >
                  {num}
                </div>
              ))}
            </div>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={inputContent}
              onChange={(e) => setInputContent(e.target.value)}
              onKeyUp={handleCursorMove}
              onClick={handleCursorMove}
              onScroll={handleEditorScroll}
              placeholder="Type your Markdown here..."
              className="flex w-full bg-transparent p-3 ring-offset-background placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none resize-none border-0 font-mono text-sm leading-5 text-slate-800 dark:text-slate-200 overflow-y-auto"
              spellCheck={false}
            />

            {isDragging && (
              <div className="absolute inset-2 rounded-xl border-2 border-dashed border-blue-500 bg-blue-500/10 backdrop-blur-xs flex flex-col items-center justify-center text-blue-600 dark:text-blue-400 pointer-events-none">
                <Upload className="w-8 h-8 mb-2 animate-bounce" />
                <p className="font-semibold text-xs">Drop file or image to load</p>
              </div>
            )}
          </div>

          {/* Bottom Bar: Word & Char Count */}
          <div className="h-8 px-4 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>Ln {activeLine ?? 1}, Col 1</span>
            <span>{lineCount} lines · {inputContent.length.toLocaleString()} characters</span>
          </div>
        </div>

        {/* ================= RIGHT CARD: Rich Text Preview ================= */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 text-slate-900 dark:text-slate-100 shadow-sm flex flex-col transition-colors">
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <h3 className="tracking-tight text-lg font-semibold text-slate-900 dark:text-white">
                Rich Text Preview
              </h3>

              {/* View Switcher Tabs */}
              <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs">
                <button
                  onClick={() => setSelectedFormat('preview')}
                  className={`px-2 py-1 rounded-md font-medium transition-all ${
                    selectedFormat === 'preview'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Rich
                </button>
                <button
                  onClick={() => setSelectedFormat('html')}
                  className={`px-2 py-1 rounded-md font-medium transition-all ${
                    selectedFormat === 'html'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  HTML
                </button>
                <button
                  onClick={() => setSelectedFormat('latex')}
                  className={`px-2 py-1 rounded-md font-medium transition-all ${
                    selectedFormat === 'latex'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  LaTeX
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Sync Scroll Toggle */}
              <button
                onClick={() => setSyncScrollEnabled(!syncScrollEnabled)}
                className={`inline-flex items-center justify-center whitespace-nowrap text-sm font-medium border border-slate-200 dark:border-slate-700 h-9 rounded-md px-2.5 transition-colors cursor-pointer shadow-2xs ${
                  syncScrollEnabled
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-800'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                title={syncScrollEnabled ? 'Sync Scroll Enabled' : 'Sync Scroll Disabled'}
              >
                {syncScrollEnabled ? <Link2 className="w-4 h-4" /> : <Link2Off className="w-4 h-4" />}
                <span className="ml-1 text-xs hidden sm:inline">Sync</span>
              </button>

              {/* Copy Rich Text (Primary Blue Button matching markdowntorichtext.com) */}
              <button
                onClick={handleCopyRichText}
                disabled={!inputContent.trim()}
                className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 disabled:pointer-events-none disabled:opacity-50 h-9 rounded-md px-3.5 shadow-xs transition-all active:scale-95 cursor-pointer font-sans"
              >
                {copiedRichText ? (
                  <>
                    <Check className="h-4 w-4 mr-1.5 text-emerald-300" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1.5" />
                    <span>Copy Rich Text</span>
                  </>
                )}
              </button>

              {/* Export Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 h-9 rounded-md px-3 transition-colors cursor-pointer shadow-2xs"
                >
                  <Download className="h-4 w-4 mr-1 text-slate-500 dark:text-slate-400" />
                  <span className="hidden sm:inline">Export</span>
                  <ChevronDown className="h-3.5 w-3.5 ml-1 opacity-70" />
                </button>

                {showExportMenu && (
                  <div
                    onMouseLeave={() => setShowExportMenu(false)}
                    className="absolute right-0 mt-1.5 w-44 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl py-1 z-30 text-xs font-medium animate-in fade-in-50 zoom-in-95"
                  >
                    <button
                      onClick={() => {
                        exportToWord(renderedHtml, 'document')
                        setShowExportMenu(false)
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-slate-700 dark:text-slate-200"
                    >
                      <span>Word (.doc)</span>
                      <span className="text-[10px] text-blue-500 font-mono">MS Word</span>
                    </button>
                    <button
                      onClick={() => {
                        exportToPdf(renderedHtml, 'document')
                        setShowExportMenu(false)
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-slate-700 dark:text-slate-200"
                    >
                      <span>PDF Document</span>
                      <span className="text-[10px] text-red-500 font-mono">.PDF</span>
                    </button>
                    <button
                      onClick={() => {
                        exportToFile(renderedHtml, 'document.html', 'text/html;charset=utf-8')
                        setShowExportMenu(false)
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-slate-700 dark:text-slate-200"
                    >
                      <span>HTML Page</span>
                      <span className="text-[10px] text-emerald-500 font-mono">.HTML</span>
                    </button>
                    <button
                      onClick={() => {
                        exportToFile(renderedMarkdown, 'document.md', 'text/markdown;charset=utf-8')
                        setShowExportMenu(false)
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-slate-700 dark:text-slate-200"
                    >
                      <span>Markdown</span>
                      <span className="text-[10px] text-purple-500 font-mono">.MD</span>
                    </button>
                    <button
                      onClick={() => {
                        exportToFile(renderedLatex, 'document.tex', 'application/x-tex;charset=utf-8')
                        setShowExportMenu(false)
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between text-slate-700 dark:text-slate-200"
                    >
                      <span>LaTeX Document</span>
                      <span className="text-[10px] text-amber-500 font-mono">.TEX</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Body: Rich Preview or Code Preview */}
          <div
            ref={previewContainerRef}
            onScroll={handlePreviewScroll}
            className="flex-1 p-6 min-h-[500px] max-h-[620px] overflow-y-auto relative bg-white dark:bg-slate-900/40 select-text border-t border-slate-200/80 dark:border-slate-800"
          >
            {/* Empty State matching markdowntorichtext.com */}
            {!inputContent.trim() ? (
              <div className="flex items-center justify-center h-full min-h-[460px] text-slate-400 dark:text-slate-500">
                <div className="text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-40 text-slate-400" />
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Your rich text will appear here
                  </p>
                  <p className="text-xs mt-1.5 text-slate-500">
                    Start typing Markdown on the left to see the preview
                  </p>
                </div>
              </div>
            ) : selectedFormat === 'preview' ? (
              <CanvasBendCard className="min-h-full">
                <RichPreview document={parsedDocument} />
              </CanvasBendCard>
            ) : selectedFormat === 'html' ? (
              <CanvasBendCard className="min-h-full">
                <CodeOutputPreview
                  content={renderedHtml}
                  format="html"
                  filename="document"
                />
              </CanvasBendCard>
            ) : selectedFormat === 'latex' ? (
              <CanvasBendCard className="min-h-full">
                <CodeOutputPreview
                  content={renderedLatex}
                  format="latex"
                  filename="document"
                />
              </CanvasBendCard>
            ) : (
              <CanvasBendCard className="min-h-full">
                <CodeOutputPreview
                  content={renderedPlainText}
                  format="text"
                  filename="document"
                />
              </CanvasBendCard>
            )}
          </div>

          {/* Bottom Status Bar */}
          <div className="h-8 px-4 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span>{parsedDocument.stats.words} words · {parsedDocument.stats.paragraphs} paragraphs</span>
            <span className="text-emerald-500 font-medium">100% In-Browser</span>
          </div>
        </div>
      </div>

      {/* Pro Tip Box matching markdowntorichtext.com */}
      <div className="text-center my-6">
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl mx-auto bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/80 py-2.5 px-4 rounded-xl">
          <strong className="text-slate-700 dark:text-slate-300 font-semibold">Pro Tip:</strong> All conversions happen locally in your browser — no data is uploaded or stored. It’s fast, private, and completely free to use.
        </p>
      </div>
    </div>
  )
}

export default Workspace
