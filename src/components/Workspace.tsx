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
  Sparkles,
  Bot,
  Code2,
  Globe,
} from 'lucide-react'
import { useConverterStore } from '../store/useConverterStore'
import { RichPreview } from './RichPreview'
import { CodeOutputPreview } from './CodeOutputPreview'
import { renderToMarkdown } from '../renderers/markdown'
import { renderToHtml } from '../renderers/html'
import { renderToLatex } from '../renderers/latex'
import { renderToPlainText } from '../renderers/text'
import { ExportPreviewModal, type ExportType } from './ExportPreviewModal'
import type { SupportedInputFormat, SupportedOutputFormat } from '../core/types'

export const Workspace: React.FC = () => {
  const {
    inputContent,
    setInputContent,
    inputFormat,
    setInputFormat,
    parsedDocument,
    selectedFormat,
    setSelectedFormat,
    formatOptions,
    loadSample,
    loadLlmSample,
    clearDocument,
    activeLine,
    setActiveLine,
    syncScrollEnabled,
    setSyncScrollEnabled,
    detectionResult,
  } = useConverterStore()

  const [isDragging, setIsDragging] = useState(false)
  const [copiedRichText, setCopiedRichText] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showCopyMenu, setShowCopyMenu] = useState(false)
  const [copyTarget, setCopyTarget] = useState<'word' | 'docs' | 'unicode' | 'latex'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('convertion_copy_target') as 'word' | 'docs' | 'unicode' | 'latex'
      if (saved && ['word', 'docs', 'unicode', 'latex'].includes(saved)) return saved
    }
    return 'word'
  })
  const [exportPreviewOpen, setExportPreviewOpen] = useState(false)
  const [exportPreviewType, setExportPreviewType] = useState<ExportType>('word')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleOpenExport = (type: ExportType) => {
    setExportPreviewType(type)
    setExportPreviewOpen(true)
    setShowExportMenu(false)
  }

  // Scroll sync refs
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const gutterRef = useRef<HTMLDivElement>(null)
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const isSyncingScrollRef = useRef<'editor' | 'preview' | null>(null)

  // Rendered export formats - LAZY rendering: only compute what is currently selected!
  const renderedMarkdown = useMemo(
    () => (selectedFormat === 'markdown' || showExportMenu ? renderToMarkdown(parsedDocument) : ''),
    [parsedDocument, selectedFormat, showExportMenu]
  )

  const renderedHtml = useMemo(
    () =>
      selectedFormat === 'html'
        ? renderToHtml(parsedDocument, {
            includeWrapper: formatOptions.html.includeWrapper,
            title: parsedDocument.metadata.title || 'Converted Document',
          })
        : '',
    [parsedDocument, selectedFormat, formatOptions.html.includeWrapper]
  )

  const renderedLatex = useMemo(
    () =>
      selectedFormat === 'latex'
        ? renderToLatex(parsedDocument, {
            includePreamble: formatOptions.latex.includePreamble,
            documentClass: formatOptions.latex.documentClass,
          })
        : '',
    [parsedDocument, selectedFormat, formatOptions.latex]
  )

  const renderedPlainText = useMemo(
    () => (selectedFormat === 'text' ? renderToPlainText(parsedDocument) : ''),
    [parsedDocument, selectedFormat]
  )

  const renderedJson = useMemo(
    () => (selectedFormat === 'json' ? JSON.stringify(parsedDocument, null, 2) : ''),
    [parsedDocument, selectedFormat]
  )

  // Line calculations for line numbers gutter: capped to 600 nodes to prevent memory bloat on large documents
  const lineCount = useMemo(() => {
    return Math.max(inputContent.split('\n').length, 1)
  }, [inputContent])

  const lineNumbers = useMemo(() => {
    const count = Math.min(lineCount, 600)
    return Array.from({ length: count }, (_, i) => i + 1)
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

  // Universal File Processor for all files
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

    // Auto-detect format from extension
    const ext = file.name.split('.').pop()?.toLowerCase()
    let detectedFmt: SupportedInputFormat = 'auto'
    if (ext === 'html' || ext === 'htm') detectedFmt = 'html'
    else if (ext === 'tex' || ext === 'latex') detectedFmt = 'latex'
    else if (ext === 'json') detectedFmt = 'json'
    else if (ext === 'md' || ext === 'markdown') detectedFmt = 'markdown'
    else if (['py', 'js', 'ts', 'rs', 'cpp', 'c', 'sh', 'txt'].includes(ext || '')) detectedFmt = 'text'

    setInputFormat(detectedFmt)

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      if (typeof content === 'string') {
        setInputContent(content, detectedFmt)
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

  // Copy Output Handler with multi-representation math support
  const handleCopy = async (target: 'docs' | 'word' | 'unicode' | 'latex' = copyTarget) => {
    setCopyTarget(target)
    if (typeof window !== 'undefined') {
      localStorage.setItem('convertion_copy_target', target)
    }
    setShowCopyMenu(false)

    if (selectedFormat === 'preview') {
      try {
        if (target === 'unicode') {
          const plainSnippet = renderToPlainText(parsedDocument, { mathMode: 'unicode' })
          await navigator.clipboard.writeText(plainSnippet)
        } else if (target === 'latex') {
          const latexSnippet = renderToPlainText(parsedDocument, { mathMode: 'latex' })
          await navigator.clipboard.writeText(latexSnippet)
        } else {
          const mathMode = target === 'word' ? 'mathml' : 'images'
          const htmlSnippet = renderToHtml(parsedDocument, { includeWrapper: false, mathMode })
          const plainSnippet = renderToPlainText(parsedDocument, { mathMode: 'unicode' })
          const blobHtml = new Blob([htmlSnippet], { type: 'text/html' })
          const blobText = new Blob([plainSnippet], { type: 'text/plain' })

          const data = [
            new ClipboardItem({
              'text/html': blobHtml,
              'text/plain': blobText,
            }),
          ]
          await navigator.clipboard.write(data)
        }
        setCopiedRichText(true)
        setTimeout(() => setCopiedRichText(false), 2000)
      } catch {
        const fallback = target === 'latex'
          ? renderedMarkdown
          : renderToPlainText(parsedDocument, { mathMode: 'unicode' })
        navigator.clipboard.writeText(fallback)
        setCopiedRichText(true)
        setTimeout(() => setCopiedRichText(false), 2000)
      }
    } else {
      const contentToCopy =
        selectedFormat === 'html'
          ? renderedHtml
          : selectedFormat === 'latex'
          ? renderedLatex
          : selectedFormat === 'json'
          ? renderedJson
          : selectedFormat === 'text'
          ? (target === 'latex' ? renderToPlainText(parsedDocument, { mathMode: 'latex' }) : renderedPlainText)
          : renderedMarkdown

      navigator.clipboard.writeText(contentToCopy)
      setCopiedRichText(true)
      setTimeout(() => setCopiedRichText(false), 2000)
    }
  }

  const inputFormats: { id: SupportedInputFormat; label: string; icon?: React.ReactNode; badge?: string }[] = [
    { id: 'auto', label: 'Auto-Detect', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'llm-mixed', label: 'LLM Stream (Mixed)', icon: <Bot className="w-3.5 h-3.5" />, badge: 'Universal' },
    { id: 'markdown', label: 'Markdown' },
    { id: 'html', label: 'HTML' },
    { id: 'latex', label: 'LaTeX' },
    { id: 'text', label: 'Text / Code' },
    { id: 'json', label: 'JSON AST' },
  ]

  const outputFormats: { id: SupportedOutputFormat; label: string }[] = [
    { id: 'preview', label: 'Rich Preview' },
    { id: 'markdown', label: 'Markdown' },
    { id: 'html', label: 'HTML' },
    { id: 'latex', label: 'LaTeX' },
    { id: 'text', label: 'Plain Text' },
    { id: 'json', label: 'JSON AST' },
  ]

  return (
    <div className="w-full">
      {/* Surfaced User-Centric Use-Cases Quick Bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2 px-1">
        <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mr-1 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-blue-500" />
          Quick Use-Cases:
        </span>
        <button
          onClick={() => {
            setInputFormat('llm-mixed')
            loadLlmSample()
            setSelectedFormat('preview')
            setCopyTarget('word')
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white dark:bg-[#121212] border border-[#E2DAD0] dark:border-white/15 hover:border-blue-500 text-neutral-800 dark:text-neutral-200 transition-all cursor-pointer shadow-2xs hover:scale-[1.02]"
          title="Convert ChatGPT, Claude, or DeepSeek equations to Word"
        >
          <Bot className="w-3.5 h-3.5 text-blue-500" />
          <span>ChatGPT / AI Math &rarr; Word</span>
        </button>

        <button
          onClick={() => {
            setInputFormat('latex')
            loadSample()
            setSelectedFormat('preview')
            setCopyTarget('word')
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white dark:bg-[#121212] border border-[#E2DAD0] dark:border-white/15 hover:border-amber-500 text-neutral-800 dark:text-neutral-200 transition-all cursor-pointer shadow-2xs hover:scale-[1.02]"
          title="Convert Overleaf / LaTeX CV or paper into Word document"
        >
          <Code2 className="w-3.5 h-3.5 text-amber-500" />
          <span>Overleaf / LaTeX CV &rarr; Word</span>
        </button>

        <button
          onClick={() => {
            setInputFormat('markdown')
            loadSample()
            setSelectedFormat('preview')
            setCopyTarget('docs')
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white dark:bg-[#121212] border border-[#E2DAD0] dark:border-white/15 hover:border-emerald-500 text-neutral-800 dark:text-neutral-200 transition-all cursor-pointer shadow-2xs hover:scale-[1.02]"
          title="Format Markdown notes for Google Docs or print to PDF"
        >
          <FileText className="w-3.5 h-3.5 text-emerald-500" />
          <span>Markdown Notes &rarr; PDF / Docs</span>
        </button>

        <button
          onClick={() => {
            setInputFormat('auto')
            loadSample()
            setSelectedFormat('html')
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white dark:bg-[#121212] border border-[#E2DAD0] dark:border-white/15 hover:border-purple-500 text-neutral-800 dark:text-neutral-200 transition-all cursor-pointer shadow-2xs hover:scale-[1.02]"
          title="Export clean HTML with offline MathML and SVG formulas"
        >
          <Globe className="w-3.5 h-3.5 text-purple-500" />
          <span>Formula Sheet &rarr; Clean HTML</span>
        </button>
      </div>

      {/* 2-Column Side-by-Side Converter Studio */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* ================= LEFT CARD: Universal All-Files Input ================= */}
        <div className="rounded-xl border border-[#E5DDD0] dark:border-white/15 bg-white dark:bg-[#0a0a0a] text-neutral-900 dark:text-neutral-100 shadow-sm flex flex-col transition-colors">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-[#EBE3D6] dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <h2 className="tracking-tight text-lg font-bold text-neutral-900 dark:text-white">
                  Input
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-white/10 text-neutral-600 dark:text-neutral-300 font-mono">
                  All Files Supported
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="*/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center justify-center whitespace-nowrap text-xs sm:text-sm font-medium border border-[#E2DAD0] dark:border-white/15 bg-[#FFFAF0]/50 dark:bg-[#141414] hover:bg-[#F7F2E8] dark:hover:bg-[#1f1f1f] text-neutral-800 dark:text-neutral-200 h-8 sm:h-9 rounded-md px-2.5 sm:px-3 transition-colors cursor-pointer shadow-2xs"
                  title="Upload any file (.md, .html, .tex, .json, .txt, .py, images)"
                >
                  <Upload className="h-3.5 w-3.5 mr-1 text-neutral-500 dark:text-neutral-400" />
                  <span>Upload File</span>
                </button>

                <button
                  onClick={loadSample}
                  className="inline-flex items-center justify-center whitespace-nowrap text-xs sm:text-sm font-medium border border-[#E2DAD0] dark:border-white/15 bg-[#FFFAF0]/50 dark:bg-[#141414] hover:bg-[#F7F2E8] dark:hover:bg-[#1f1f1f] text-neutral-800 dark:text-neutral-200 h-8 sm:h-9 rounded-md px-2.5 sm:px-3 transition-colors cursor-pointer shadow-2xs"
                  title="Load sample content for active mode"
                >
                  <FileText className="h-3.5 w-3.5 mr-1 text-neutral-500 dark:text-neutral-400" />
                  <span>Sample</span>
                </button>

                <button
                  onClick={clearDocument}
                  className="inline-flex items-center justify-center whitespace-nowrap text-xs sm:text-sm font-medium border border-[#E2DAD0] dark:border-white/15 bg-[#FFFAF0]/50 dark:bg-[#141414] hover:bg-[#F7F2E8] dark:hover:bg-[#1f1f1f] text-neutral-800 dark:text-neutral-200 h-8 sm:h-9 rounded-md px-2 sm:px-2.5 transition-colors cursor-pointer shadow-2xs"
                  title="Clear input"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1 text-neutral-500 dark:text-neutral-400" />
                  <span>Clear</span>
                </button>
              </div>
            </div>

            {/* Input Format Selector Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 mr-1 uppercase tracking-wider shrink-0">
                Mode:
              </span>
              {inputFormats.map((fmt) => (
                <button
                  key={fmt.id}
                  onClick={() => setInputFormat(fmt.id)}
                  className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors duration-150 cursor-pointer flex items-center gap-1 shrink-0 ${
                    inputFormat === fmt.id
                      ? 'bg-neutral-900 dark:bg-white text-white dark:text-black shadow-xs font-semibold'
                      : 'bg-[#FAF5ED] dark:bg-[#141414] text-neutral-600 dark:text-neutral-400 border border-[#EBE3D6] dark:border-white/10 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  {fmt.icon}
                  <span>{fmt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Body: Line Numbers + Textarea */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className="relative flex-1 flex min-h-[500px] max-h-[620px] bg-[#FAF5ED]/40 dark:bg-[#050505] overflow-hidden font-mono text-sm"
          >
            {/* Gutter with Line Numbers */}
            <div
              ref={gutterRef}
              aria-hidden="true"
              className="w-12 shrink-0 py-3 bg-[#F8F2E6]/60 dark:bg-[#070707] border-r border-[#EBE3D6] dark:border-white/10 select-none overflow-hidden text-right pr-2 text-neutral-400 dark:text-neutral-500 font-mono text-xs"
            >
              {lineNumbers.map((num) => (
                <div
                  key={num}
                  className={`h-5 leading-5 transition-colors ${
                    activeLine === num
                      ? 'text-neutral-950 dark:text-white font-bold bg-neutral-900/10 dark:bg-white/15 -mr-2 pr-2 border-r-2 border-neutral-900 dark:border-white'
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
              placeholder={
                inputFormat === 'llm-mixed'
                  ? 'Paste mixed LLM output here (Markdown + LaTeX Math + HTML + Tables + Code fences)...'
                  : 'Type or paste any document, code, LaTeX, or HTML here...'
              }
              className="flex w-full bg-transparent p-3 ring-offset-background placeholder:text-neutral-400 dark:placeholder:text-neutral-600 focus:outline-none resize-none border-0 font-mono text-sm leading-5 text-neutral-900 dark:text-white overflow-y-auto"
              spellCheck={false}
            />

            {isDragging && (
              <div className="absolute inset-2 rounded-xl border-2 border-dashed border-neutral-900 dark:border-white bg-neutral-900/10 dark:bg-white/10 backdrop-blur-xs flex flex-col items-center justify-center text-neutral-900 dark:text-white pointer-events-none z-20">
                <Upload className="w-8 h-8 mb-2 animate-bounce" />
                <p className="font-semibold text-xs">Drop any file to convert instantly</p>
              </div>
            )}
          </div>

          {/* Bottom Bar: Input Details */}
          <div className="h-8 px-4 border-t border-[#EBE3D6] dark:border-white/10 bg-[#FAF5ED] dark:bg-[#070707] flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 font-mono">
            <span>Ln {activeLine ?? 1}, Col 1</span>
            <span>
              Detected: <strong className="text-neutral-700 dark:text-neutral-200">{detectionResult.summary}</strong> · {lineCount} lines · {inputContent.length.toLocaleString()} chars
            </span>
          </div>
        </div>

        {/* ================= RIGHT CARD: Universal All-Files Output ================= */}
        <div className="rounded-xl border border-[#E5DDD0] dark:border-white/15 bg-white dark:bg-[#0a0a0a] text-neutral-900 dark:text-neutral-100 shadow-sm flex flex-col transition-colors">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-[#EBE3D6] dark:border-white/10 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <h2 className="tracking-tight text-lg font-bold text-neutral-900 dark:text-white">
                  Output
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-white/10 text-neutral-600 dark:text-neutral-300 font-mono">
                  All Files Export
                </span>
              </div>

              <div className="flex items-center space-x-2">
                {/* Sync Scroll Toggle */}
                <button
                  onClick={() => setSyncScrollEnabled(!syncScrollEnabled)}
                  className={`inline-flex items-center justify-center whitespace-nowrap text-xs sm:text-sm font-medium border border-[#E2DAD0] dark:border-white/15 h-8 sm:h-9 rounded-md px-2.5 transition-colors cursor-pointer shadow-2xs ${
                    syncScrollEnabled
                      ? 'bg-[#FAF5ED] dark:bg-white/10 text-neutral-900 dark:text-white border-neutral-400 dark:border-white/30'
                      : 'bg-white dark:bg-[#141414] text-neutral-500 dark:text-neutral-400 hover:bg-[#F7F2E8] dark:hover:bg-[#1f1f1f]'
                  }`}
                  title={syncScrollEnabled ? 'Sync Scroll Enabled' : 'Sync Scroll Disabled'}
                >
                  {syncScrollEnabled ? <Link2 className="w-3.5 h-3.5" /> : <Link2Off className="w-3.5 h-3.5" />}
                  <span className="ml-1 text-xs hidden sm:inline">Sync</span>
                </button>

                {/* Copy Button (Split Button for Rich Preview Target Selection) */}
                <div className="relative flex items-center">
                  <button
                    onClick={() => handleCopy()}
                    disabled={!inputContent.trim()}
                    className={`inline-flex items-center justify-center whitespace-nowrap text-xs sm:text-sm font-medium bg-neutral-900 hover:bg-black dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black disabled:pointer-events-none disabled:opacity-40 h-8 sm:h-9 ${
                      selectedFormat === 'preview'
                        ? 'rounded-l-md px-2.5 sm:px-3 border-r border-neutral-700/50 dark:border-neutral-300/50'
                        : 'rounded-md px-2.5 sm:px-3.5'
                    } shadow-xs transition-all active:scale-95 cursor-pointer font-sans`}
                  >
                    {copiedRichText ? (
                      <>
                        <Check className="h-3.5 w-3.5 mr-1.5 text-emerald-400 dark:text-emerald-600" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 mr-1.5" />
                        <span>
                          {selectedFormat !== 'preview'
                            ? 'Copy Output'
                            : copyTarget === 'word'
                            ? 'Copy for Word'
                            : copyTarget === 'docs'
                            ? 'Copy for Docs'
                            : copyTarget === 'unicode'
                            ? 'Copy Clean Text'
                            : 'Copy LaTeX'}
                        </span>
                      </>
                    )}
                  </button>

                  {selectedFormat === 'preview' && (
                    <button
                      onClick={() => setShowCopyMenu(!showCopyMenu)}
                      disabled={!inputContent.trim()}
                      className="inline-flex items-center justify-center bg-neutral-900 hover:bg-black dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black disabled:pointer-events-none disabled:opacity-40 h-8 sm:h-9 rounded-r-md px-1.5 transition-colors cursor-pointer shadow-xs"
                      title="Select math copy target"
                    >
                      <ChevronDown className="h-3 w-3 opacity-80" />
                    </button>
                  )}

                  {showCopyMenu && (
                    <div
                      onMouseLeave={() => setShowCopyMenu(false)}
                      className="absolute right-0 top-full mt-1.5 w-64 rounded-xl border border-[#E5DDD0] dark:border-white/15 bg-white dark:bg-[#121212] shadow-xl py-1.5 z-40 text-xs font-medium animate-in fade-in-50 zoom-in-95"
                    >
                      <div className="px-3 py-1 text-[10px] uppercase font-bold tracking-wider text-neutral-400 dark:text-neutral-500">
                        Math Formatting Target
                      </div>

                      <button
                        onClick={() => handleCopy('word')}
                        className={`w-full text-left px-3.5 py-2 hover:bg-[#FAF5ED] dark:hover:bg-[#1c1c1c] flex items-center justify-between text-neutral-800 dark:text-neutral-200 cursor-pointer ${
                          copyTarget === 'word' ? 'bg-[#FAF5ED]/80 dark:bg-white/[0.08] font-semibold' : ''
                        }`}
                      >
                        <div>
                          <div className="text-neutral-900 dark:text-white font-medium">MS Word (MathML)</div>
                          <div className="text-[10px] text-neutral-500">Native editable equation objects</div>
                        </div>
                        <span className="text-[10px] text-emerald-500 font-mono font-bold">WORD</span>
                      </button>

                      <button
                        onClick={() => handleCopy('docs')}
                        className={`w-full text-left px-3.5 py-2 hover:bg-[#FAF5ED] dark:hover:bg-[#1c1c1c] flex items-center justify-between text-neutral-800 dark:text-neutral-200 cursor-pointer ${
                          copyTarget === 'docs' ? 'bg-[#FAF5ED]/80 dark:bg-white/[0.08] font-semibold' : ''
                        }`}
                      >
                        <div>
                          <div className="text-neutral-900 dark:text-white font-medium">Google Docs (Visual Math)</div>
                          <div className="text-[10px] text-neutral-500">Rendered images + Unicode text</div>
                        </div>
                        <span className="text-[10px] text-blue-500 font-mono font-bold">DOCS</span>
                      </button>

                      <button
                        onClick={() => handleCopy('unicode')}
                        className={`w-full text-left px-3.5 py-2 hover:bg-[#FAF5ED] dark:hover:bg-[#1c1c1c] flex items-center justify-between text-neutral-800 dark:text-neutral-200 cursor-pointer ${
                          copyTarget === 'unicode' ? 'bg-[#FAF5ED]/80 dark:bg-white/[0.08] font-semibold' : ''
                        }`}
                      >
                        <div>
                          <div className="text-neutral-900 dark:text-white font-medium">Clean Text (Unicode)</div>
                          <div className="text-[10px] text-neutral-500">Formatted math characters in plain text</div>
                        </div>
                        <span className="text-[10px] text-cyan-500 font-mono font-bold">TXT</span>
                      </button>

                      <button
                        onClick={() => handleCopy('latex')}
                        className={`w-full text-left px-3.5 py-2 hover:bg-[#FAF5ED] dark:hover:bg-[#1c1c1c] flex items-center justify-between text-neutral-800 dark:text-neutral-200 cursor-pointer ${
                          copyTarget === 'latex' ? 'bg-[#FAF5ED]/80 dark:bg-white/[0.08] font-semibold' : ''
                        }`}
                      >
                        <div>
                          <div className="text-neutral-900 dark:text-white font-medium">LaTeX Source ($$)</div>
                          <div className="text-[10px] text-neutral-500">Raw markup for TeX/Markdown</div>
                        </div>
                        <span className="text-[10px] text-amber-500 font-mono font-bold">$$</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Export Split Button */}
                <div className="relative flex items-center">
                  <button
                    onClick={() => {
                      const defaultType: ExportType =
                        selectedFormat === 'markdown'
                          ? 'markdown'
                          : selectedFormat === 'html'
                          ? 'html'
                          : selectedFormat === 'latex'
                          ? 'latex'
                          : selectedFormat === 'text'
                          ? 'text'
                          : selectedFormat === 'json'
                          ? 'json'
                          : 'word'
                      handleOpenExport(defaultType)
                    }}
                    className="inline-flex items-center justify-center whitespace-nowrap text-xs sm:text-sm font-medium border border-r-0 border-[#E2DAD0] dark:border-white/15 bg-white dark:bg-[#141414] hover:bg-[#F7F2E8] dark:hover:bg-[#1f1f1f] text-neutral-800 dark:text-white h-8 sm:h-9 rounded-l-md px-2.5 sm:px-3 transition-colors cursor-pointer shadow-2xs"
                    title="Preview and export document"
                  >
                    <Download className="h-3.5 w-3.5 mr-1 text-neutral-500 dark:text-neutral-400" />
                    <span>Export</span>
                  </button>

                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="inline-flex items-center justify-center border border-[#E2DAD0] dark:border-white/15 bg-white dark:bg-[#141414] hover:bg-[#F7F2E8] dark:hover:bg-[#1f1f1f] text-neutral-800 dark:text-white h-8 sm:h-9 rounded-r-md px-1.5 transition-colors cursor-pointer shadow-2xs"
                    title="Select format to preview"
                  >
                    <ChevronDown className="h-3 w-3 opacity-70" />
                  </button>

                  {showExportMenu && (
                    <div
                      onMouseLeave={() => setShowExportMenu(false)}
                      className="absolute right-0 top-full mt-1.5 w-52 rounded-xl border border-[#E5DDD0] dark:border-white/15 bg-white dark:bg-[#121212] shadow-xl py-1.5 z-30 text-xs font-medium animate-in fade-in-50 zoom-in-95"
                    >
                      <div className="px-3 py-1 text-[10px] uppercase font-bold tracking-wider text-neutral-400 dark:text-neutral-500">
                        Preview &amp; Export
                      </div>

                      <button
                        onClick={() => handleOpenExport('word')}
                        className="w-full text-left px-3.5 py-2 hover:bg-[#FAF5ED] dark:hover:bg-[#1c1c1c] flex items-center justify-between text-neutral-800 dark:text-neutral-200 cursor-pointer"
                      >
                        <span>Word Document</span>
                        <span className="text-[10px] text-blue-500 font-mono">.DOC</span>
                      </button>
                      <button
                        onClick={() => handleOpenExport('pdf')}
                        className="w-full text-left px-3.5 py-2 hover:bg-[#FAF5ED] dark:hover:bg-[#1c1c1c] flex items-center justify-between text-neutral-800 dark:text-neutral-200 cursor-pointer"
                      >
                        <span>PDF Document</span>
                        <span className="text-[10px] text-red-500 font-mono">.PDF</span>
                      </button>
                      <button
                        onClick={() => handleOpenExport('html')}
                        className="w-full text-left px-3.5 py-2 hover:bg-[#FAF5ED] dark:hover:bg-[#1c1c1c] flex items-center justify-between text-neutral-800 dark:text-neutral-200 cursor-pointer"
                      >
                        <span>HTML Page</span>
                        <span className="text-[10px] text-emerald-500 font-mono">.HTML</span>
                      </button>
                      <button
                        onClick={() => handleOpenExport('markdown')}
                        className="w-full text-left px-3.5 py-2 hover:bg-[#FAF5ED] dark:hover:bg-[#1c1c1c] flex items-center justify-between text-neutral-800 dark:text-neutral-200 cursor-pointer"
                      >
                        <span>Markdown</span>
                        <span className="text-[10px] text-purple-500 font-mono">.MD</span>
                      </button>
                      <button
                        onClick={() => handleOpenExport('latex')}
                        className="w-full text-left px-3.5 py-2 hover:bg-[#FAF5ED] dark:hover:bg-[#1c1c1c] flex items-center justify-between text-neutral-800 dark:text-neutral-200 cursor-pointer"
                      >
                        <span>LaTeX Document</span>
                        <span className="text-[10px] text-amber-500 font-mono">.TEX</span>
                      </button>
                      <button
                        onClick={() => handleOpenExport('text')}
                        className="w-full text-left px-3.5 py-2 hover:bg-[#FAF5ED] dark:hover:bg-[#1c1c1c] flex items-center justify-between text-neutral-800 dark:text-neutral-200 cursor-pointer"
                      >
                        <span>Plain Text</span>
                        <span className="text-[10px] text-cyan-500 font-mono">.TXT</span>
                      </button>
                      <button
                        onClick={() => handleOpenExport('json')}
                        className="w-full text-left px-3.5 py-2 hover:bg-[#FAF5ED] dark:hover:bg-[#1c1c1c] flex items-center justify-between text-neutral-800 dark:text-neutral-200 cursor-pointer"
                      >
                        <span>JSON AST</span>
                        <span className="text-[10px] text-indigo-500 font-mono">.JSON</span>
                      </button>

                      <div className="my-1 border-t border-[#E5DDD0] dark:border-white/10" />
                      <div className="px-3 py-1 text-[10px] uppercase font-bold tracking-wider text-neutral-400 dark:text-neutral-500">
                        Quick Copy
                      </div>

                      <button
                        onClick={() => {
                          handleCopy('docs')
                          setShowExportMenu(false)
                        }}
                        className="w-full text-left px-3.5 py-2 hover:bg-[#FAF5ED] dark:hover:bg-[#1c1c1c] flex items-center justify-between text-neutral-800 dark:text-neutral-200 cursor-pointer"
                      >
                        <span>Copy for Google Docs (Images)</span>
                        <span className="text-[10px] text-blue-500 font-mono">DOCS</span>
                      </button>

                      <button
                        onClick={() => {
                          handleCopy('word')
                          setShowExportMenu(false)
                        }}
                        className="w-full text-left px-3.5 py-2 hover:bg-[#FAF5ED] dark:hover:bg-[#1c1c1c] flex items-center justify-between text-neutral-800 dark:text-neutral-200 cursor-pointer"
                      >
                        <span>Copy for Word (MathML)</span>
                        <span className="text-[10px] text-emerald-500 font-mono">WORD</span>
                      </button>

                      <button
                        onClick={() => {
                          handleCopy('unicode')
                          setShowExportMenu(false)
                        }}
                        className="w-full text-left px-3.5 py-2 hover:bg-[#FAF5ED] dark:hover:bg-[#1c1c1c] flex items-center justify-between text-neutral-800 dark:text-neutral-200 cursor-pointer"
                      >
                        <span>Copy Clean Text (Unicode)</span>
                        <span className="text-[10px] text-cyan-500 font-mono">TXT</span>
                      </button>

                      <button
                        onClick={() => {
                          handleCopy('latex')
                          setShowExportMenu(false)
                        }}
                        className="w-full text-left px-3.5 py-2 hover:bg-[#FAF5ED] dark:hover:bg-[#1c1c1c] flex items-center justify-between text-neutral-800 dark:text-neutral-200 cursor-pointer"
                      >
                        <span>Copy LaTeX Math ($$)</span>
                        <span className="text-[10px] text-amber-500 font-mono">$$</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Output Format Switcher Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 mr-1 uppercase tracking-wider shrink-0">
                Format:
              </span>
              {outputFormats.map((fmt) => (
                <button
                  key={fmt.id}
                  onClick={() => setSelectedFormat(fmt.id)}
                  className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors duration-150 cursor-pointer shrink-0 ${
                    selectedFormat === fmt.id
                      ? 'bg-neutral-900 dark:bg-white text-white dark:text-black shadow-xs font-semibold'
                      : 'bg-[#FAF5ED] dark:bg-[#141414] text-neutral-600 dark:text-neutral-400 border border-[#EBE3D6] dark:border-white/10 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  {fmt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Body: Clean Flat Rendering with ZERO CanvasBendCard slop */}
          <div
            ref={previewContainerRef}
            onScroll={handlePreviewScroll}
            className="flex-1 p-6 min-h-[500px] max-h-[620px] overflow-y-auto relative bg-white dark:bg-[#0a0a0a] select-text border-t border-[#EBE3D6] dark:border-white/10"
          >
            {/* Empty State */}
            {!inputContent.trim() ? (
              <div className="flex items-center justify-center h-full min-h-[460px] text-neutral-400 dark:text-neutral-600">
                <div className="text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-40 text-neutral-400 dark:text-neutral-600" />
                  <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Your converted document will appear here
                  </p>
                  <p className="text-xs mt-1.5 text-neutral-500 dark:text-neutral-500">
                    Paste any content, mixed LLM output, or upload a file on the left
                  </p>
                </div>
              </div>
            ) : selectedFormat === 'preview' ? (
              <div className="min-h-full">
                <RichPreview document={parsedDocument} />
              </div>
            ) : selectedFormat === 'markdown' ? (
              <div className="min-h-full">
                <CodeOutputPreview
                  content={renderedMarkdown}
                  format="markdown"
                  filename="document"
                />
              </div>
            ) : selectedFormat === 'html' ? (
              <div className="min-h-full">
                <CodeOutputPreview
                  content={renderedHtml}
                  format="html"
                  filename="document"
                />
              </div>
            ) : selectedFormat === 'latex' ? (
              <div className="min-h-full">
                <CodeOutputPreview
                  content={renderedLatex}
                  format="latex"
                  filename="document"
                />
              </div>
            ) : selectedFormat === 'json' ? (
              <div className="min-h-full">
                <CodeOutputPreview
                  content={renderedJson}
                  format="json"
                  filename="document"
                />
              </div>
            ) : (
              <div className="min-h-full">
                <CodeOutputPreview
                  content={renderedPlainText}
                  format="text"
                  filename="document"
                />
              </div>
            )}
          </div>

          {/* Bottom Status Bar */}
          <div className="h-8 px-4 border-t border-[#EBE3D6] dark:border-white/10 bg-[#FAF5ED] dark:bg-[#070707] flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 font-mono">
            <span>
              {parsedDocument.stats.words} words · {parsedDocument.stats.headings} headings · {parsedDocument.stats.tables} tables · {parsedDocument.stats.mathExpressions} math expressions
            </span>
            <span className="text-neutral-800 dark:text-neutral-300 font-medium">100% In-Browser Engine</span>
          </div>
        </div>
      </div>

      {/* Pro Tip Box */}
      <div className="text-center my-6">
        <p className="text-sm text-neutral-600 dark:text-neutral-300 max-w-2xl mx-auto bg-white/70 dark:bg-[#0d0d0d] border border-[#E5DDD0] dark:border-white/10 py-2.5 px-4 rounded-xl shadow-2xs">
          <strong className="text-neutral-900 dark:text-white font-semibold">Pro Tip:</strong> All conversions happen locally in your browser — no data is uploaded or stored. Supports all file types and LLM mixed outputs seamlessly.
        </p>
      </div>

      {/* Export Preview Modal */}
      {exportPreviewOpen && (
        <ExportPreviewModal
          key={`${exportPreviewType}-${parsedDocument.metadata.title || 'document'}`}
          isOpen={exportPreviewOpen}
          initialType={exportPreviewType}
          onClose={() => setExportPreviewOpen(false)}
          parsedDocument={parsedDocument}
        />
      )}
    </div>
  )
}

export default Workspace
