import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  Download,
  Copy,
  Check,
  Printer,
  FileText,
  FileCode,
  Globe,
  Code2,
  Braces,
  FileSpreadsheet,
} from 'lucide-react'
import type { NormalizedDocument } from '../core/types'
import { renderToMarkdown } from '../renderers/markdown'
import { renderToHtml } from '../renderers/html'
import { renderToLatex } from '../renderers/latex'
import { renderToPlainText } from '../renderers/text'
import { exportToWord, exportToPdf, exportToFile } from '../utils/exporters'

export type ExportType = 'word' | 'pdf' | 'html' | 'markdown' | 'latex' | 'text' | 'json'

interface ExportPreviewModalProps {
  isOpen: boolean
  initialType?: ExportType
  onClose: () => void
  parsedDocument: NormalizedDocument
}

interface FormatMeta {
  id: ExportType
  label: string
  ext: string
  mime: string
  badgeColor: string
  icon: React.ReactNode
}

const EXPORT_FORMATS: FormatMeta[] = [
  { id: 'word', label: 'Word (.doc)', ext: '.doc', mime: 'application/msword', badgeColor: 'text-blue-500 bg-blue-500/10 border-blue-500/20', icon: <FileSpreadsheet className="w-3.5 h-3.5" /> },
  { id: 'pdf', label: 'PDF Document', ext: '.pdf', mime: 'application/pdf', badgeColor: 'text-red-500 bg-red-500/10 border-red-500/20', icon: <FileText className="w-3.5 h-3.5" /> },
  { id: 'html', label: 'HTML Page', ext: '.html', mime: 'text/html;charset=utf-8', badgeColor: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20', icon: <Globe className="w-3.5 h-3.5" /> },
  { id: 'markdown', label: 'Markdown', ext: '.md', mime: 'text/markdown;charset=utf-8', badgeColor: 'text-purple-500 bg-purple-500/10 border-purple-500/20', icon: <FileCode className="w-3.5 h-3.5" /> },
  { id: 'latex', label: 'LaTeX (.tex)', ext: '.tex', mime: 'application/x-tex;charset=utf-8', badgeColor: 'text-amber-500 bg-amber-500/10 border-amber-500/20', icon: <Code2 className="w-3.5 h-3.5" /> },
  { id: 'text', label: 'Plain Text', ext: '.txt', mime: 'text/plain;charset=utf-8', badgeColor: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20', icon: <FileText className="w-3.5 h-3.5" /> },
  { id: 'json', label: 'JSON AST', ext: '.json', mime: 'application/json;charset=utf-8', badgeColor: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20', icon: <Braces className="w-3.5 h-3.5" /> },
]

export const ExportPreviewModal: React.FC<ExportPreviewModalProps> = ({
  isOpen,
  initialType = 'word',
  onClose,
  parsedDocument,
}) => {
  const [activeType, setActiveType] = useState<ExportType>(initialType)
  const [filename, setFilename] = useState<string>(() => {
    const docTitle = parsedDocument.metadata.title
    return docTitle ? docTitle.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').slice(0, 30) : 'document'
  })
  const [copied, setCopied] = useState<boolean>(false)
  const [htmlViewMode, setHtmlViewMode] = useState<'visual' | 'code'>('visual')
  const [paperView, setPaperView] = useState<'theme' | 'paper'>('theme')

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  const activeMeta = useMemo(
    () => EXPORT_FORMATS.find((f) => f.id === activeType) || EXPORT_FORMATS[0],
    [activeType]
  )

  // Pre-render content for each format
  const contentMarkdown = useMemo(() => renderToMarkdown(parsedDocument), [parsedDocument])
  const contentHtmlClean = useMemo(
    () => renderToHtml(parsedDocument, { includeWrapper: false, mathMode: 'images' }),
    [parsedDocument]
  )
  const contentHtmlFull = useMemo(
    () => renderToHtml(parsedDocument, { includeWrapper: true, title: filename, mathMode: 'images' }),
    [parsedDocument, filename]
  )
  const contentLatex = useMemo(
    () => renderToLatex(parsedDocument, { includePreamble: true, documentClass: 'article' }),
    [parsedDocument]
  )
  const contentPlainText = useMemo(() => renderToPlainText(parsedDocument), [parsedDocument])
  const contentJson = useMemo(() => JSON.stringify(parsedDocument, null, 2), [parsedDocument])

  // Compute estimated payload size
  const estimatedSize = useMemo(() => {
    let raw = ''
    switch (activeType) {
      case 'word':
      case 'html':
        raw = contentHtmlFull
        break
      case 'pdf':
        raw = contentHtmlClean
        break
      case 'latex':
        raw = contentLatex
        break
      case 'text':
        raw = contentPlainText
        break
      case 'json':
        raw = contentJson
        break
      case 'markdown':
      default:
        raw = contentMarkdown
        break
    }
    const bytes = new Blob([raw]).size
    if (bytes < 1024) return `${bytes} B`
    return `${(bytes / 1024).toFixed(1)} KB`
  }, [activeType, contentHtmlFull, contentHtmlClean, contentLatex, contentPlainText, contentJson, contentMarkdown])

  const handleDownload = () => {
    const baseName = filename.trim() || 'document'
    switch (activeType) {
      case 'word':
        exportToWord(contentHtmlClean, baseName)
        break
      case 'pdf':
        exportToPdf(contentHtmlClean, baseName)
        break
      case 'html':
        exportToFile(contentHtmlFull, `${baseName}.html`, 'text/html;charset=utf-8')
        break
      case 'markdown':
        exportToFile(contentMarkdown, `${baseName}.md`, 'text/markdown;charset=utf-8')
        break
      case 'latex':
        exportToFile(contentLatex, `${baseName}.tex`, 'application/x-tex;charset=utf-8')
        break
      case 'text':
        exportToFile(contentPlainText, `${baseName}.txt`, 'text/plain;charset=utf-8')
        break
      case 'json':
        exportToFile(contentJson, `${baseName}.json`, 'application/json;charset=utf-8')
        break
    }
  }

  const handleCopyContent = async () => {
    try {
      if (activeType === 'word' || (activeType === 'html' && htmlViewMode === 'visual')) {
        const blobHtml = new Blob([contentHtmlClean], { type: 'text/html' })
        const blobText = new Blob([contentPlainText], { type: 'text/plain' })
        await navigator.clipboard.write([
          new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobText }),
        ])
      } else if (activeType === 'html') {
        await navigator.clipboard.writeText(contentHtmlFull)
      } else if (activeType === 'latex') {
        await navigator.clipboard.writeText(contentLatex)
      } else if (activeType === 'text') {
        await navigator.clipboard.writeText(contentPlainText)
      } else if (activeType === 'json') {
        await navigator.clipboard.writeText(contentJson)
      } else {
        await navigator.clipboard.writeText(contentMarkdown)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      navigator.clipboard.writeText(contentMarkdown)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!isOpen || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in-50 duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="relative w-full sm:max-w-5xl h-[100dvh] sm:h-[88vh] sm:max-h-[850px] flex flex-col sm:rounded-2xl border-0 sm:border border-[#E2DAD0] dark:border-white/15 bg-[#FFFAF0] dark:bg-[#0c0c0c] text-neutral-900 dark:text-neutral-100 shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-3.5 sm:px-6 py-2.5 sm:py-3 border-b border-[#E8E1D3] dark:border-white/10 bg-white/80 dark:bg-[#121212]/80 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm sm:text-lg tracking-tight">Export Preview</span>
            <span
              className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full border font-mono font-medium ${activeMeta.badgeColor}`}
            >
              {activeMeta.ext.toUpperCase()}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 hidden sm:inline-block">
              Size: {estimatedSize} · {parsedDocument.stats.words.toLocaleString()} words
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title="Close preview (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar: Format Selector & Filename Config */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 px-3 sm:px-6 py-2 bg-[#FAF5ED]/80 dark:bg-[#101010] border-b border-[#E8E1D3] dark:border-white/10 shrink-0 text-xs">
          {/* Format Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto py-1 max-w-full shrink-0 no-scrollbar touch-pan-x">
            {EXPORT_FORMATS.map((fmt) => (
              <button
                key={fmt.id}
                onClick={() => setActiveType(fmt.id)}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-md text-[11px] sm:text-xs font-medium whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  activeType === fmt.id
                    ? 'bg-neutral-900 dark:bg-white text-white dark:text-black shadow-xs font-semibold'
                    : 'bg-[#FFFAF0] dark:bg-[#171717] text-neutral-600 dark:text-neutral-400 border border-[#E5DDD0] dark:border-white/10 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {fmt.icon}
                <span>{fmt.label}</span>
              </button>
            ))}
          </div>

          {/* Filename Input + HTML/Paper Mode Toggle */}
          <div className="flex items-center justify-between sm:justify-end gap-2 pt-0.5 sm:pt-0">
            {(activeType === 'word' || activeType === 'pdf') && (
              <div className="flex items-center rounded-md border border-[#E5DDD0] dark:border-white/10 bg-[#FFFAF0] dark:bg-[#171717] p-0.5 mr-1">
                <button
                  onClick={() => setPaperView('theme')}
                  className={`px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-medium transition-colors cursor-pointer ${
                    paperView === 'theme'
                      ? 'bg-neutral-900 dark:bg-white text-white dark:text-black'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                  title="Dark / Match App Theme"
                >
                  Dark
                </button>
                <button
                  onClick={() => setPaperView('paper')}
                  className={`px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-medium transition-colors cursor-pointer ${
                    paperView === 'paper'
                      ? 'bg-neutral-900 dark:bg-white text-white dark:text-black'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                  title="White Printed Paper Mockup"
                >
                  Paper
                </button>
              </div>
            )}

            {activeType === 'html' && (
              <div className="flex items-center rounded-md border border-[#E5DDD0] dark:border-white/10 bg-[#FFFAF0] dark:bg-[#171717] p-0.5 mr-1">
                <button
                  onClick={() => setHtmlViewMode('visual')}
                  className={`px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-medium transition-colors cursor-pointer ${
                    htmlViewMode === 'visual'
                      ? 'bg-neutral-900 dark:bg-white text-white dark:text-black'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  Visual
                </button>
                <button
                  onClick={() => setHtmlViewMode('code')}
                  className={`px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-medium transition-colors cursor-pointer ${
                    htmlViewMode === 'code'
                      ? 'bg-neutral-900 dark:bg-white text-white dark:text-black'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  Source
                </button>
              </div>
            )}

            <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
              <span className="text-[11px] text-neutral-500 font-medium hidden xs:inline">File:</span>
              <div className="flex items-center rounded-lg border border-[#E2DAD0] dark:border-white/15 bg-white dark:bg-[#181818] overflow-hidden focus-within:ring-2 focus-within:ring-neutral-400">
                <input
                  type="text"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  className="px-2 py-1 text-xs bg-transparent text-neutral-900 dark:text-white font-medium focus:outline-hidden w-28 sm:w-40"
                  placeholder="document"
                />
                <span className="px-1.5 sm:px-2 py-1 bg-neutral-100 dark:bg-white/10 text-neutral-600 dark:text-neutral-300 font-mono text-[10px] sm:text-[11px] font-semibold border-l border-[#E2DAD0] dark:border-white/10">
                  {activeMeta.ext}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Center Preview Stage */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-[#F4EDE2]/50 dark:bg-black/50">
          {/* Word & PDF Realistic Sheet Preview */}
          {(activeType === 'word' || activeType === 'pdf') && (
            <div className={`max-w-3xl mx-auto rounded-xl border shadow-md p-4 sm:p-10 min-h-[480px] transition-colors ${
              paperView === 'paper'
                ? 'border-neutral-300 bg-white text-neutral-900'
                : 'border-[#E0D7C9] dark:border-white/15 bg-white dark:bg-[#0e0e0e] text-neutral-800 dark:text-neutral-200'
            }`}>
              <div
                className={`prose prose-sm sm:prose-base max-w-none font-serif leading-relaxed select-text ${
                  paperView === 'paper'
                    ? 'prose-neutral text-neutral-900 [&_img]:filter-none'
                    : 'dark:prose-invert text-neutral-800 dark:text-neutral-200'
                }`}
                dangerouslySetInnerHTML={{ __html: contentHtmlClean }}
              />
            </div>
          )}

          {/* HTML Preview: Visual or Source */}
          {activeType === 'html' && (
            <div className="max-w-3xl mx-auto">
              {htmlViewMode === 'visual' ? (
                <div className="rounded-xl border border-[#E0D7C9] dark:border-white/15 bg-white dark:bg-[#0e0e0e] shadow-md p-4 sm:p-10 min-h-[480px]">
                  <div
                    className="prose prose-sm sm:prose-base dark:prose-invert max-w-none leading-relaxed text-neutral-800 dark:text-neutral-200 select-text"
                    dangerouslySetInnerHTML={{ __html: contentHtmlClean }}
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-[#E5DDD0] dark:border-white/10 bg-white dark:bg-[#0c0c0c] p-4 sm:p-6 shadow-xs font-mono text-xs text-neutral-800 dark:text-neutral-200 overflow-x-auto whitespace-pre leading-relaxed">
                  <code>{contentHtmlFull}</code>
                </div>
              )}
            </div>
          )}

          {/* Markdown Code View */}
          {activeType === 'markdown' && (
            <div className="max-w-3xl mx-auto rounded-xl border border-[#E5DDD0] dark:border-white/10 bg-white dark:bg-[#0c0c0c] p-4 sm:p-6 shadow-xs font-mono text-xs sm:text-sm text-neutral-800 dark:text-neutral-200 overflow-x-auto whitespace-pre leading-relaxed">
              <code>{contentMarkdown}</code>
            </div>
          )}

          {/* LaTeX Code View */}
          {activeType === 'latex' && (
            <div className="max-w-3xl mx-auto rounded-xl border border-[#E5DDD0] dark:border-white/10 bg-white dark:bg-[#0c0c0c] p-4 sm:p-6 shadow-xs font-mono text-xs sm:text-sm text-neutral-800 dark:text-neutral-200 overflow-x-auto whitespace-pre leading-relaxed">
              <code>{contentLatex}</code>
            </div>
          )}

          {/* Plain Text View */}
          {activeType === 'text' && (
            <div className="max-w-3xl mx-auto rounded-xl border border-[#E5DDD0] dark:border-white/10 bg-white dark:bg-[#0c0c0c] p-4 sm:p-6 shadow-xs font-mono text-xs sm:text-sm text-neutral-800 dark:text-neutral-200 overflow-x-auto whitespace-pre leading-relaxed">
              <code>{contentPlainText}</code>
            </div>
          )}

          {/* JSON AST View */}
          {activeType === 'json' && (
            <div className="max-w-3xl mx-auto rounded-xl border border-[#E5DDD0] dark:border-white/10 bg-white dark:bg-[#0c0c0c] p-4 sm:p-6 shadow-xs font-mono text-xs text-neutral-800 dark:text-neutral-200 overflow-x-auto whitespace-pre leading-relaxed">
              <code>{contentJson}</code>
            </div>
          )}
        </div>

        {/* Bottom Footer Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 px-3.5 sm:px-6 py-2.5 sm:py-3.5 border-t border-[#E8E1D3] dark:border-white/10 bg-white/95 dark:bg-[#121212]/95 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2 justify-between sm:justify-start">
            <button
              onClick={handleCopyContent}
              className="flex-1 sm:flex-none inline-flex items-center justify-center text-xs font-medium border border-[#E2DAD0] dark:border-white/15 bg-[#FFFAF0]/60 dark:bg-[#1a1a1a] hover:bg-[#FAF5ED] dark:hover:bg-[#222222] text-neutral-800 dark:text-neutral-200 h-8 sm:h-9 rounded-lg px-2.5 sm:px-3 transition-colors cursor-pointer shadow-2xs"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 mr-1.5 text-neutral-500 dark:text-neutral-400" />
                  <span>Copy Content</span>
                </>
              )}
            </button>

            {activeType === 'pdf' && (
              <button
                onClick={() => exportToPdf(contentHtmlClean, filename)}
                className="flex-1 sm:flex-none inline-flex items-center justify-center text-xs font-medium border border-[#E2DAD0] dark:border-white/15 bg-[#FFFAF0]/60 dark:bg-[#1a1a1a] hover:bg-[#FAF5ED] dark:hover:bg-[#222222] text-neutral-800 dark:text-neutral-200 h-8 sm:h-9 rounded-lg px-2.5 sm:px-3 transition-colors cursor-pointer shadow-2xs"
              >
                <Printer className="w-3.5 h-3.5 mr-1.5 text-neutral-500 dark:text-neutral-400" />
                <span>Print / PDF</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors cursor-pointer text-center"
            >
              Cancel
            </button>

            <button
              onClick={handleDownload}
              className="flex-2 sm:flex-none inline-flex items-center justify-center text-xs sm:text-sm font-semibold bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black h-8 sm:h-9 rounded-lg px-4 shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 mr-1.5 shrink-0" />
              <span className="hidden sm:inline">Download {filename}{activeMeta.ext}</span>
              <span className="sm:inline hidden font-semibold">Download ({activeMeta.ext})</span>
              <span className="sm:hidden font-semibold">Download {activeMeta.ext}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
