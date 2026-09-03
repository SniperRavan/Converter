import React, { useState } from 'react'
import { Copy, Check, Download, FileCode } from 'lucide-react'

interface CodeOutputPreviewProps {
  content: string
  format: 'markdown' | 'html' | 'latex' | 'text' | 'json'
  filename?: string
}

export const CodeOutputPreview: React.FC<CodeOutputPreviewProps> = ({
  content,
  format,
  filename = 'converted-document',
}) => {
  const [copied, setCopied] = useState(false)

  const extensionMap = {
    markdown: 'md',
    html: 'html',
    latex: 'tex',
    text: 'txt',
    json: 'json',
  }

  const mimeMap = {
    markdown: 'text/markdown;charset=utf-8',
    html: 'text/html;charset=utf-8',
    latex: 'application/x-tex;charset=utf-8',
    text: 'text/plain;charset=utf-8',
    json: 'application/json;charset=utf-8',
  }

  const ext = extensionMap[format]
  const fullFilename = `${filename}.${ext}`

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    const blob = new Blob([content], { type: mimeMap[format] })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fullFilename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col h-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-950 text-slate-100 overflow-hidden shadow-xs">
      {/* Code Bar Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2 text-slate-400">
          <FileCode className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-mono text-slate-200">{fullFilename}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-medium">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Code</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors shadow-sm shadow-blue-500/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .{ext}</span>
          </button>
        </div>
      </div>

      {/* Code Text Area */}
      <div className="flex-1 p-4 overflow-auto font-mono text-xs sm:text-sm leading-relaxed text-slate-200 select-text whitespace-pre">
        {content}
      </div>
    </div>
  )
}
