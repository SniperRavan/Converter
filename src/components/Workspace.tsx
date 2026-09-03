import React, { useRef, useState, useMemo } from 'react'
import {
  Upload,
  Trash2,
  Copy,
  Check,
  Download,
  FileSpreadsheet,
  Link2,
  Link2Off,
  Code2,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import { useConverterStore } from '../store/useConverterStore'
import { RichPreview } from './RichPreview'
import { CodeOutputPreview } from './CodeOutputPreview'
import { CanvasBendCard } from './CanvasBendCard'
import { GlassObject } from './canvasui/GlassObject'
import heroImg from '../assets/hero.png'
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
    setSelectedFormat,
    formatOptions,
    loadSample,
    clearDocument,
    detectionResult,
    activeLine,
    setActiveLine,
    syncScrollEnabled,
    setSyncScrollEnabled,
    glassAssetUrl,
    setGlassAssetUrl,
    motionMode,
  } = useConverterStore()

  const [isDragging, setIsDragging] = useState(false)
  const [copiedRichText, setCopiedRichText] = useState(false)
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

  // Track cursor position to determine active line (VS Code style)
  const handleCursorMove = () => {
    const el = textareaRef.current
    if (!el) return
    const pos = el.selectionStart
    const line = el.value.substring(0, pos).split('\n').length
    setActiveLine(line)
  }

  // Handle Synchronized Scrolling: Editor -> Preview & Gutter
  const handleEditorScroll = () => {
    const textarea = textareaRef.current
    const gutter = gutterRef.current
    const preview = previewContainerRef.current

    if (!textarea) return

    // Always lock gutter scroll to textarea scroll
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

  // Smart File Processor: Handles Text, Images, and 3D Models without binary corruption
  const processFile = (file: File) => {
    const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name)
    const is3DModel = /\.(glb|gltf)$/i.test(file.name)

    if (isImage) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string
        if (typeof dataUrl === 'string') {
          setGlassAssetUrl(dataUrl)
          const cleanName = file.name.replace(/\.[^/.]+$/, '')
          const imageMd = `\n\n![${cleanName}](${dataUrl})\n\n`
          setInputContent(inputContent ? `${inputContent}\n${imageMd}` : imageMd)
        }
      }
      reader.readAsDataURL(file)
      return
    }

    if (is3DModel) {
      const objectUrl = URL.createObjectURL(file)
      setGlassAssetUrl(objectUrl)
      setSelectedFormat('glass')
      return
    }

    // Standard markdown/text files
    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      if (typeof content === 'string') {
        setInputContent(content)
      }
    }
    reader.readAsText(file)
  }

  // File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  // Drag & Drop
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

  // Copy Rich Text
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

  // Download Standalone HTML
  const handleDownloadPreviewHtml = () => {
    const fullHtml = renderToHtml(parsedDocument, {
      includeWrapper: true,
      title: 'Converted Document',
    })
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'document.html'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex-1 min-h-0 w-full grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch h-full">
      {/* ================= LEFT COLUMN: Source Editor ================= */}
      <div className="flex flex-col h-full min-h-0 rounded-2xl border border-slate-200/90 dark:border-white/[0.08] bg-white/95 dark:bg-[#0c0e15]/95 shadow-md overflow-hidden">
        {/* Editor Top Bar */}
        <div className="h-11 shrink-0 px-3.5 border-b border-slate-200/80 dark:border-white/[0.06] bg-slate-50/90 dark:bg-white/[0.02] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 shadow-xs shadow-blue-500/50" />
            <span className="font-semibold text-xs tracking-wider uppercase text-slate-800 dark:text-slate-200">
              Input Markdown
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400 font-medium">
              {detectionResult.primaryFormat}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              accept=".md,.markdown,.txt,.tex,.html,.json,.png,.jpg,.jpeg,.svg,.webp,.gif,.glb,.gltf"
              onChange={handleFileUpload}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
              title="Upload file or image (.md, .txt, .png, .svg, .glb)"
            >
              <Upload className="w-3.5 h-3.5 text-blue-500" />
              <span>Upload</span>
            </button>

            <button
              onClick={loadSample}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
              title="Load rich sample"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-500" />
              <span>Sample</span>
            </button>

            <button
              onClick={clearDocument}
              className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
              title="Clear text"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Editor Main Content: Line Numbers Gutter + Textarea */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="relative flex-1 min-h-0 flex overflow-hidden font-mono text-xs sm:text-sm bg-transparent"
        >
          {/* Gutter with Line Numbers (VS Code style) */}
          <div
            ref={gutterRef}
            aria-hidden="true"
            className="w-12 shrink-0 py-3.5 bg-slate-100/50 dark:bg-black/30 border-r border-slate-200/60 dark:border-white/[0.04] select-none overflow-hidden text-right pr-2 text-slate-400/80 font-mono text-xs"
          >
            {lineNumbers.map((num) => {
              const isCurrent = activeLine === num
              return (
                <div
                  key={num}
                  className={`h-5 leading-5 transition-colors ${
                    isCurrent
                      ? 'text-blue-600 dark:text-blue-400 font-bold bg-blue-500/10 -mr-2 pr-2 border-r-2 border-blue-500'
                      : ''
                  }`}
                >
                  {num}
                </div>
              )
            })}
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={inputContent}
            onChange={(e) => setInputContent(e.target.value)}
            onKeyUp={handleCursorMove}
            onClick={handleCursorMove}
            onScroll={handleEditorScroll}
            placeholder="Type or paste markdown here, or drop an image..."
            className="flex-1 min-h-0 h-full p-3.5 resize-none bg-transparent leading-5 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-hidden overflow-y-auto"
            spellCheck={false}
          />

          {isDragging && (
            <div className="absolute inset-2 rounded-xl border-2 border-dashed border-blue-500 bg-blue-500/10 backdrop-blur-xs flex flex-col items-center justify-center text-blue-600 dark:text-blue-400 pointer-events-none">
              <Upload className="w-8 h-8 mb-2 animate-bounce" />
              <p className="font-semibold text-xs">Drop file or image to load</p>
            </div>
          )}
        </div>

        {/* Editor Bottom Status Strip */}
        <div className="h-7 shrink-0 px-3.5 border-t border-slate-200/60 dark:border-white/[0.04] bg-slate-50/50 dark:bg-white/[0.01] flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span>Ln {activeLine ?? 1}, Col 1</span>
          <span>{lineCount} lines · {inputContent.length.toLocaleString()} chars</span>
        </div>
      </div>

      {/* ================= RIGHT COLUMN: Visual Output ================= */}
      <div className="flex flex-col h-full min-h-0 rounded-2xl border border-slate-200/90 dark:border-white/[0.08] bg-white/95 dark:bg-[#0c0e15]/95 shadow-md overflow-hidden">
        {/* Output Top Bar */}
        <div className="h-11 shrink-0 px-3.5 border-b border-slate-200/80 dark:border-white/[0.06] bg-slate-50/90 dark:bg-white/[0.02] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/50" />
            <span className="font-semibold text-xs tracking-wider uppercase text-slate-800 dark:text-slate-200">
              {selectedFormat === 'preview'
                ? 'Rich Text Preview'
                : selectedFormat === 'glass'
                ? '3D Canvas Glass'
                : `${selectedFormat.toUpperCase()} Code`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Sync Scroll Toggle */}
            {selectedFormat === 'preview' && (
              <button
                onClick={() => setSyncScrollEnabled(!syncScrollEnabled)}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  syncScrollEnabled
                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                }`}
                title={syncScrollEnabled ? 'Synchronized Scroll Enabled' : 'Synchronized Scroll Disabled'}
              >
                {syncScrollEnabled ? <Link2 className="w-3.5 h-3.5" /> : <Link2Off className="w-3.5 h-3.5" />}
                <span className="text-[11px] hidden sm:inline">Sync Scroll</span>
              </button>
            )}

            {selectedFormat === 'preview' && (
              <>
                {/* Copy Rich Text */}
                <button
                  onClick={handleCopyRichText}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-all shadow-xs active:scale-95 cursor-pointer"
                  title="Copy rich formatted text to clipboard"
                >
                  {copiedRichText ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedRichText ? 'Copied!' : 'Copy Rich Text'}</span>
                </button>

                {/* Export HTML */}
                <button
                  onClick={handleDownloadPreviewHtml}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 dark:border-white/10 bg-slate-100/70 dark:bg-white/[0.04] hover:bg-slate-200/70 dark:hover:bg-white/[0.08] text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors cursor-pointer"
                  title="Export Standalone HTML"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Export</span>
                </button>
              </>
            )}

            {selectedFormat === 'glass' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setGlassAssetUrl(heroImg)}
                  className="flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.06] hover:bg-slate-100 dark:hover:bg-white/[0.1] text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                  title="Reset to Hero Logo"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span className="text-[11px]">Reset Logo</span>
                </button>
              </div>
            )}

            {selectedFormat !== 'preview' && selectedFormat !== 'glass' && (
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <Code2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Synchronized AST</span>
              </div>
            )}
          </div>
        </div>

        {/* Output Scrollable Canvas */}
        <div
          ref={previewContainerRef}
          onScroll={handlePreviewScroll}
          className="flex-1 min-h-0 p-5 overflow-y-auto relative"
        >
          {selectedFormat === 'preview' && (
            <CanvasBendCard className="min-h-full">
              <RichPreview document={parsedDocument} />
            </CanvasBendCard>
          )}

          {selectedFormat === 'glass' && (
            <div className="w-full h-full min-h-[440px] flex flex-col items-center justify-center rounded-2xl overflow-hidden bg-radial from-slate-900/90 via-[#0a0c12] to-black border border-white/10 relative shadow-2xl">
              <GlassObject
                src={glassAssetUrl || heroImg}
                ior={1.85}
                thickness={4.5}
                roughness={0.15}
                dispersion={1.6}
                clearcoat={0.6}
                highlight="#066aff"
                orbit={true}
                floatIntensity={motionMode === 'off' ? 0 : 1}
                rotationIntensity={motionMode === 'off' ? 0 : 1}
                className="w-full h-full min-h-[420px]"
              />

              {/* Bottom Interactive HUD */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between px-3.5 py-2 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  <span className="font-mono text-[11px] text-slate-200">
                    Drag to Orbit · Drop Image to Extrude Glass
                  </span>
                </div>

                <label className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-[11px] cursor-pointer transition-colors shadow-xs">
                  <Upload className="w-3 h-3" />
                  <span>Swap 3D Asset</span>
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.svg,.webp,.gif,.glb,.gltf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}

          {selectedFormat === 'markdown' && (
            <CodeOutputPreview
              content={renderedMarkdown}
              format="markdown"
              filename="document"
            />
          )}

          {selectedFormat === 'html' && (
            <CodeOutputPreview
              content={renderedHtml}
              format="html"
              filename="document"
            />
          )}

          {selectedFormat === 'latex' && (
            <CodeOutputPreview
              content={renderedLatex}
              format="latex"
              filename="document"
            />
          )}

          {selectedFormat === 'text' && (
            <CodeOutputPreview
              content={renderedPlainText}
              format="text"
              filename="document"
            />
          )}
        </div>

        {/* Output Bottom Status Strip */}
        <div className="h-7 shrink-0 px-3.5 border-t border-slate-200/60 dark:border-white/[0.04] bg-slate-50/50 dark:bg-white/[0.01] flex items-center justify-between text-[11px] text-slate-500">
          <span>
            {selectedFormat === 'glass'
              ? 'Refractive Three.js & WebGL Shader Pipeline'
              : `${parsedDocument.stats.headings} headings · ${parsedDocument.stats.mathExpressions} equations · ${parsedDocument.stats.tables} tables`}
          </span>
          <span className="text-emerald-500 font-medium">100% In-Browser</span>
        </div>
      </div>
    </div>
  )
}
