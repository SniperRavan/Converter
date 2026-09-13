import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react'
import { unzipSync, strFromU8 } from 'fflate'
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
  ShieldCheck,
} from 'lucide-react'
import { useConverterStore } from '../store/useConverterStore'
import { RichPreview } from './RichPreview'
import { CodeOutputPreview } from './CodeOutputPreview'
import { renderToMarkdown } from '../renderers/markdown'
import { renderToHtml } from '../renderers/html'
import { renderToLatex } from '../renderers/latex'
import { renderToPlainText } from '../renderers/text'
import { formatForWordClipboard } from '../utils/exporters'
import type { ExportType } from './ExportPreviewModal'

const ExportPreviewModal = React.lazy(() =>
  import('./ExportPreviewModal').then((m) => ({ default: m.ExportPreviewModal }))
)
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
  // BUG-03: track column separately so status bar shows real column number
  const [activeCol, setActiveCol] = useState(1)
  const [copyTarget, setCopyTarget] = useState<'word' | 'docs' | 'unicode' | 'latex'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('convertion_copy_target')
      if (saved && ['docs', 'word', 'unicode', 'latex'].includes(saved)) {
        return saved as 'docs' | 'word' | 'unicode' | 'latex'
      }
      localStorage.setItem('convertion_copy_target', 'docs')
    }
    return 'docs'
  })
  const [exportPreviewOpen, setExportPreviewOpen] = useState(false)
  const [exportPreviewType, setExportPreviewType] = useState<ExportType>('word')
  const fileInputRef = useRef<HTMLInputElement>(null)
  // BUG-06: store scroll-sync reset timers so they can be cleared on unmount
  const editorSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const previewSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  // BUG-06: cleanup scroll timers on unmount to prevent setState on unmounted component
  useEffect(() => {
    return () => {
      if (editorSyncTimerRef.current) clearTimeout(editorSyncTimerRef.current)
      if (previewSyncTimerRef.current) clearTimeout(previewSyncTimerRef.current)
    }
  }, [])

  // BUG-05: Close dropdown menus on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowCopyMenu(false)
        setShowExportMenu(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // BUG-05: Close menus when clicking outside
  useEffect(() => {
    if (!showCopyMenu && !showExportMenu) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element
      if (!target.closest('[data-menu="copy"]') && !target.closest('[data-menu="export"]')) {
        setShowCopyMenu(false)
        setShowExportMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showCopyMenu, showExportMenu])

  // BUG-03: Compute real line AND column from cursor position
  const handleCursorMove = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    const pos = el.selectionStart
    const textBefore = el.value.substring(0, pos)
    const line = textBefore.split('\n').length
    const lineStart = textBefore.lastIndexOf('\n') + 1
    const col = pos - lineStart + 1
    setActiveLine(line)
    setActiveCol(col)
  }, [setActiveLine])

  // Handle Synchronized Scrolling: Editor -> Preview
  const handleEditorScroll = useCallback(() => {
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

    // BUG-06: Store timer ID so it can be cleared on unmount
    if (editorSyncTimerRef.current) clearTimeout(editorSyncTimerRef.current)
    editorSyncTimerRef.current = setTimeout(() => {
      if (isSyncingScrollRef.current === 'editor') {
        isSyncingScrollRef.current = null
      }
    }, 50)
  }, [syncScrollEnabled])

  // Handle Synchronized Scrolling: Preview -> Editor
  const handlePreviewScroll = useCallback(() => {
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

    // BUG-06: Store timer ID so it can be cleared on unmount
    if (previewSyncTimerRef.current) clearTimeout(previewSyncTimerRef.current)
    previewSyncTimerRef.current = setTimeout(() => {
      if (isSyncingScrollRef.current === 'preview') {
        isSyncingScrollRef.current = null
      }
    }, 50)
  }, [syncScrollEnabled])

  // Universal File Processor for all files
  const processFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    const binaryExts = ['docx', 'doc', 'pdf', 'odt', 'rtf', 'zip', 'tar', 'gz', 'exe', 'bin', 'pptx', 'xlsx']
    if (binaryExts.includes(ext)) {
      alert(`The file "${file.name}" is a compiled binary format. Convertion processes text and markup inputs (Markdown, LaTeX, HTML, JSON, Code). Please copy or save your document as text, Markdown, or LaTeX!`)
      return
    }

    const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name)

    if (isImage) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image exceeds 5MB limit. Please upload a smaller image to keep browser performance responsive.')
        return
      }
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

    if (ext === 'zip') {
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const buffer = event.target?.result as ArrayBuffer
          const unzipped = unzipSync(new Uint8Array(buffer))
          const fileNames = Object.keys(unzipped)
          const texFiles: Record<string, string> = {}
          for (const name of fileNames) {
            if (name.endsWith('.tex')) {
              texFiles[name] = strFromU8(unzipped[name])
            }
          }
          if (Object.keys(texFiles).length > 0) {
            let rootName = Object.keys(texFiles).find(n => /^(main|index|resume|cv)\.tex$/i.test(n.split('/').pop() || ''))
            if (!rootName) {
              rootName = Object.keys(texFiles).find(n => texFiles[n].includes('\\documentclass')) || Object.keys(texFiles)[0]
            }
            let rootTex = texFiles[rootName]
            // Recursively inline \input and \include (arxiv-latex-cleaner approach)
            rootTex = rootTex.replace(/\\(input|include)\{([^}]+)\}/g, (match, _cmd, incPath) => {
              const cleanInc = incPath.trim().replace(/\.tex$/, '') + '.tex'
              const matchedKey = Object.keys(texFiles).find(k => k === cleanInc || k.endsWith('/' + cleanInc) || k.endsWith(cleanInc))
              if (matchedKey && texFiles[matchedKey]) {
                return `\n% --- Inlined from ${matchedKey} ---\n` + texFiles[matchedKey] + '\n'
              }
              return match
            })
            setInputFormat('latex')
            setInputContent(rootTex, 'latex')
            return
          }
          const mdFiles = fileNames.filter(n => n.endsWith('.md') || n.endsWith('.markdown'))
          if (mdFiles.length > 0) {
            const content = strFromU8(unzipped[mdFiles[0]])
            setInputFormat('markdown')
            setInputContent(content, 'markdown')
            return
          }
        } catch (err) {
          console.error('Failed to extract zip archive:', err)
        }
      }
      reader.readAsArrayBuffer(file)
      return
    }

    // Auto-detect format from extension
    let detectedFmt: SupportedInputFormat = 'auto'
    if (ext === 'html' || ext === 'htm') detectedFmt = 'html'
    else if (ext === 'tex' || ext === 'latex') detectedFmt = 'latex'
    else if (ext === 'json') detectedFmt = 'json'
    else if (ext === 'md' || ext === 'markdown') detectedFmt = 'markdown'
    else if (['py', 'js', 'ts', 'rs', 'cpp', 'c', 'sh', 'txt'].includes(ext)) detectedFmt = 'text'

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
        } else if (target === 'word') {
          // Output Microsoft Word-compatible semantic markup with Word MSO styling
          const htmlSnippet = renderToHtml(parsedDocument, {
            includeWrapper: false,
            mathMode: 'semantic',
            cleanTables: true,
          })
          const plainSnippet = renderToPlainText(parsedDocument, { mathMode: 'unicode' })
          const clipboardHtml = formatForWordClipboard(htmlSnippet)
          const blobHtml = new Blob([clipboardHtml], { type: 'text/html' })
          const blobText = new Blob([plainSnippet], { type: 'text/plain' })

          const data = [
            new ClipboardItem({
              'text/html': blobHtml,
              'text/plain': blobText,
            }),
          ]
          await navigator.clipboard.write(data)
        } else {
          // Output high-fidelity Universal Semantic HTML for Docs, OneNote, Word & web editors
          const htmlSnippet = renderToHtml(parsedDocument, {
            includeWrapper: false,
            mathMode: 'semantic',
            cleanTables: true,
          })
          const plainSnippet = renderToPlainText(parsedDocument, { mathMode: 'unicode' })
          const clipboardHtml = `<!--StartFragment-->\n${htmlSnippet}\n<!--EndFragment-->`
          const blobHtml = new Blob([clipboardHtml], { type: 'text/html' })
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
        // BUG-11: use correct fallback per target — was incorrectly using renderedMarkdown for latex
        let fallback: string
        if (target === 'latex') {
          fallback = renderToPlainText(parsedDocument, { mathMode: 'latex' })
        } else if (target === 'unicode') {
          fallback = renderToPlainText(parsedDocument, { mathMode: 'unicode' })
        } else {
          fallback = renderToPlainText(parsedDocument, { mathMode: 'unicode' })
        }
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
      {/* Surfaced User-Centric Use-Cases Quick Bar with generous breathing room above */}
      <div className="pt-6 sm:pt-10 mb-4">
        <div className="flex items-center gap-2 overflow-x-auto touch-scroll-x no-scrollbar py-1 px-1 -mx-1 sm:flex-wrap">
          <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider shrink-0 flex items-center gap-1.5 mr-0.5 select-none">
            <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span className="hidden sm:inline">Quick Use-Cases:</span>
            <span className="sm:hidden">Templates:</span>
          </span>
          <button
            onClick={() => {
              setInputFormat('llm-mixed')
              loadLlmSample()
              setSelectedFormat('preview')
              setCopyTarget('word')
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white dark:bg-[#121212] border border-[#E2DAD0] dark:border-white/15 hover:border-blue-500 text-neutral-800 dark:text-neutral-200 transition-all cursor-pointer shadow-2xs hover:scale-[1.02] shrink-0 whitespace-nowrap active:scale-95"
            title="Convert ChatGPT, Claude, or DeepSeek equations to Word"
          >
            <Bot className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span>ChatGPT / AI Math &rarr; Word</span>
          </button>

          <button
            onClick={() => {
              setInputFormat('latex')
              loadSample()
              setSelectedFormat('preview')
              setCopyTarget('word')
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white dark:bg-[#121212] border border-[#E2DAD0] dark:border-white/15 hover:border-amber-500 text-neutral-800 dark:text-neutral-200 transition-all cursor-pointer shadow-2xs hover:scale-[1.02] shrink-0 whitespace-nowrap active:scale-95"
            title="Convert Overleaf / LaTeX CV or paper into Word document"
          >
            <Code2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>Overleaf / LaTeX CV &rarr; Word</span>
          </button>

          <button
            onClick={() => {
              setInputFormat('markdown')
              loadSample()
              setSelectedFormat('preview')
              setCopyTarget('word')
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white dark:bg-[#121212] border border-[#E2DAD0] dark:border-white/15 hover:border-emerald-500 text-neutral-800 dark:text-neutral-200 transition-all cursor-pointer shadow-2xs hover:scale-[1.02] shrink-0 whitespace-nowrap active:scale-95"
            title="Format Markdown notes for Google Docs or print to PDF"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Markdown Notes &rarr; PDF / Docs</span>
          </button>

          <button
            onClick={() => {
              setInputFormat('auto')
              loadSample()
              setSelectedFormat('html')
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white dark:bg-[#121212] border border-[#E2DAD0] dark:border-white/15 hover:border-purple-500 text-neutral-800 dark:text-neutral-200 transition-all cursor-pointer shadow-2xs hover:scale-[1.02] shrink-0 whitespace-nowrap active:scale-95"
            title="Export clean HTML with offline MathML and SVG formulas"
          >
            <Globe className="w-3.5 h-3.5 text-purple-500 shrink-0" />
            <span>Formula Sheet &rarr; Clean HTML</span>
          </button>
        </div>
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
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs touch-scroll-x no-scrollbar">
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
              {/* BUG-14: Visual indicator when gutter is capped at 600 */}
              {lineCount > 600 && (
                <div className="h-5 leading-5 text-center text-neutral-400 dark:text-neutral-600 text-[10px]" title={`${lineCount} total lines`}>
                  ⋯
                </div>
              )}
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
          <div className="h-8 px-3 sm:px-4 border-t border-[#EBE3D6] dark:border-white/10 bg-[#FAF5ED] dark:bg-[#070707] flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 font-mono select-none overflow-hidden gap-2">
            {/* Left: Cursor coordinates and metrics (never wraps) */}
            <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap text-[11px]">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-black/[0.04] dark:bg-white/[0.08] text-neutral-800 dark:text-neutral-200 font-semibold font-mono text-[10px] tracking-tight">
                Ln {activeLine ?? 1}, Col {activeCol}
              </span>
              <span className="text-neutral-300 dark:text-neutral-700">·</span>
              <span className="text-neutral-600 dark:text-neutral-400">
                {lineCount.toLocaleString()} {lineCount === 1 ? 'line' : 'lines'}
              </span>
              <span className="text-neutral-300 dark:text-neutral-700 hidden xs:inline">·</span>
              <span className="text-neutral-500 dark:text-neutral-400 hidden xs:inline">
                {inputContent.length.toLocaleString()} chars
              </span>
            </div>

            {/* Right: Live Detection with Pulse */}
            <div className="flex items-center gap-1.5 shrink-0 min-w-0 text-[11px] truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
              <span className="text-neutral-400 dark:text-neutral-500 uppercase tracking-wider text-[9px] font-bold hidden sm:inline">
                Detected
              </span>
              <span className="font-semibold text-neutral-800 dark:text-neutral-200 truncate" title={detectionResult.summary}>
                {detectionResult.summary}
              </span>
            </div>
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
                {/* BUG-08: Sync Scroll only meaningful in preview mode */}
                {selectedFormat === 'preview' && (
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
                )}

                {/* Copy Button (Split Button for Rich Preview Target Selection) */}
                <div className="relative flex items-center" data-menu="copy">
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
                            ? 'Copy Rich Text'
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
                      className="absolute right-0 top-full mt-1.5 w-68 rounded-xl border border-[#E5DDD0] dark:border-white/15 bg-white dark:bg-[#121212] shadow-xl py-1.5 z-40 text-xs font-medium animate-in fade-in-50 zoom-in-95"
                    >
                      <div className="px-3 py-1 text-[10px] uppercase font-bold tracking-wider text-neutral-400 dark:text-neutral-500">
                        Math Formatting Target
                      </div>

                      <button
                        onClick={() => handleCopy('docs')}
                        className={`w-full text-left px-3.5 py-2 hover:bg-[#FAF5ED] dark:hover:bg-[#1c1c1c] flex items-center justify-between text-neutral-800 dark:text-neutral-200 cursor-pointer ${
                          copyTarget === 'docs' ? 'bg-[#FAF5ED]/80 dark:bg-white/[0.08] font-semibold' : ''
                        }`}
                      >
                        <div>
                          <div className="text-neutral-900 dark:text-white font-medium">Universal Rich Text (Recommended)</div>
                          <div className="text-[10px] text-neutral-500">For Docs, OneNote, Word & Web (fractions & exponents)</div>
                        </div>
                        <span className="text-[10px] text-blue-500 font-mono font-bold">RICH</span>
                      </button>

                      <button
                        onClick={() => handleCopy('word')}
                        className={`w-full text-left px-3.5 py-2 hover:bg-[#FAF5ED] dark:hover:bg-[#1c1c1c] flex items-center justify-between text-neutral-800 dark:text-neutral-200 cursor-pointer ${
                          copyTarget === 'word' ? 'bg-[#FAF5ED]/80 dark:bg-white/[0.08] font-semibold' : ''
                        }`}
                      >
                        <div>
                          <div className="text-neutral-900 dark:text-white font-medium">Microsoft Word (OMML)</div>
                          <div className="text-[10px] text-neutral-500">Native editable equation objects</div>
                        </div>
                        <span className="text-[10px] text-emerald-500 font-mono font-bold">WORD</span>
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
                <div className="relative flex items-center" data-menu="export">
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
                        <span className="text-[10px] text-blue-500 font-mono">.DOCX</span>
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
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs touch-scroll-x no-scrollbar">
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

          {/* Bottom Status Bar: Document Metrics */}
          <div className="h-8 px-3 sm:px-4 border-t border-[#EBE3D6] dark:border-white/10 bg-[#FAF5ED] dark:bg-[#070707] flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 font-mono select-none overflow-hidden gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 min-w-0 text-[11px] truncate">
              <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                {parsedDocument.stats.words.toLocaleString()} words
              </span>
              {parsedDocument.stats.headings > 0 && (
                <>
                  <span className="text-neutral-300 dark:text-neutral-700">·</span>
                  <span className="text-neutral-600 dark:text-neutral-400 hidden sm:inline">
                    {parsedDocument.stats.headings} {parsedDocument.stats.headings === 1 ? 'heading' : 'headings'}
                  </span>
                </>
              )}
              {parsedDocument.stats.tables > 0 && (
                <>
                  <span className="text-neutral-300 dark:text-neutral-700">·</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    {parsedDocument.stats.tables} {parsedDocument.stats.tables === 1 ? 'table' : 'tables'}
                  </span>
                </>
              )}
              {parsedDocument.stats.mathExpressions > 0 && (
                <>
                  <span className="text-neutral-300 dark:text-neutral-700">·</span>
                  <span className="text-purple-600 dark:text-purple-400 font-medium">
                    {parsedDocument.stats.mathExpressions} math
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0 text-[11px] text-neutral-700 dark:text-neutral-300 font-medium whitespace-nowrap">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="hidden sm:inline">100% In-Browser</span>
              <span className="sm:hidden">Offline</span>
            </div>
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
        <React.Suspense fallback={null}>
          <ExportPreviewModal
            isOpen={exportPreviewOpen}
            initialType={exportPreviewType}
            onClose={() => setExportPreviewOpen(false)}
            parsedDocument={parsedDocument}
          />
        </React.Suspense>
      )}
    </div>
  )
}
