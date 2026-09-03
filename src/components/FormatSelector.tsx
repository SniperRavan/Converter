import React from 'react'
import { Eye, FileCode, Code2, Sigma, FileText, SlidersHorizontal, Check } from 'lucide-react'
import { useConverterStore } from '../store/useConverterStore'
import type { SupportedOutputFormat } from '../core/types'

const FORMATS: {
  id: SupportedOutputFormat
  label: string
  ext: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { id: 'preview', label: 'Rich Preview', ext: 'LIVE', icon: Eye },
  { id: 'markdown', label: 'Markdown', ext: '.MD', icon: FileCode },
  { id: 'html', label: 'HTML', ext: '.HTML', icon: Code2 },
  { id: 'latex', label: 'LaTeX', ext: '.TEX', icon: Sigma },
  { id: 'text', label: 'Plain Text', ext: '.TXT', icon: FileText },
]

export const FormatSelector: React.FC = () => {
  const { selectedFormat, setSelectedFormat, formatOptions, updateFormatOptions } = useConverterStore()

  return (
    <div className="flex flex-col gap-3">
      {/* Segmented Hardware Control Bar */}
      <div className="p-1.5 rounded-2xl bg-slate-200/60 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-xl shadow-inner">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
          {FORMATS.map((fmt) => {
            const Icon = fmt.icon
            const isActive = selectedFormat === fmt.id
            return (
              <button
                key={fmt.id}
                onClick={() => setSelectedFormat(fmt.id)}
                className={`group relative flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 active:scale-[0.98] ${
                  isActive
                    ? 'bg-white dark:bg-white/[0.12] text-slate-900 dark:text-white shadow-md shadow-black/10 dark:shadow-black/30 border border-slate-200/60 dark:border-white/20 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'
                    }`}
                  />
                  <span>{fmt.label}</span>
                </div>

                <span
                  className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded ${
                    isActive
                      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                      : 'bg-black/5 dark:bg-white/5 text-slate-400'
                  }`}
                >
                  {fmt.ext}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Dynamic Drawer for Active Format Options */}
      {selectedFormat !== 'preview' && (
        <div className="flex items-center justify-between flex-wrap gap-3 px-4 py-2.5 rounded-xl bg-slate-100/70 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/[0.06] text-xs text-slate-700 dark:text-slate-300">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium">
            <SlidersHorizontal className="w-3.5 h-3.5 text-blue-500" />
            <span className="uppercase tracking-wider text-[10px] font-bold">Options</span>
          </div>

          {selectedFormat === 'markdown' && (
            <div className="flex items-center gap-4">
              <span className="text-slate-500 text-xs">Syntax Flavor:</span>
              <button
                onClick={() => updateFormatOptions('markdown', { flavor: 'gfm' })}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors ${
                  formatOptions.markdown.flavor === 'gfm'
                    ? 'bg-blue-600 text-white font-medium'
                    : 'bg-white dark:bg-white/[0.05] text-slate-600 dark:text-slate-400'
                }`}
              >
                {formatOptions.markdown.flavor === 'gfm' && <Check className="w-3 h-3" />}
                <span>GitHub Flavored (GFM)</span>
              </button>

              <button
                onClick={() => updateFormatOptions('markdown', { flavor: 'commonmark' })}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors ${
                  formatOptions.markdown.flavor === 'commonmark'
                    ? 'bg-blue-600 text-white font-medium'
                    : 'bg-white dark:bg-white/[0.05] text-slate-600 dark:text-slate-400'
                }`}
              >
                {formatOptions.markdown.flavor === 'commonmark' && <Check className="w-3 h-3" />}
                <span>CommonMark</span>
              </button>
            </div>
          )}

          {selectedFormat === 'html' && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formatOptions.html.includeWrapper}
                onChange={(e) => updateFormatOptions('html', { includeWrapper: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
              />
              <span className="text-xs">Include Standalone HTML Boilerplate & KaTeX Stylesheet</span>
            </label>
          )}

          {selectedFormat === 'latex' && (
            <div className="flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formatOptions.latex.includePreamble}
                  onChange={(e) => updateFormatOptions('latex', { includePreamble: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                />
                <span className="text-xs">Include Document Class & Preamble</span>
              </label>

              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-500">Document Class:</span>
                <select
                  value={formatOptions.latex.documentClass}
                  onChange={(e) =>
                    updateFormatOptions('latex', {
                      documentClass: e.target.value as 'article' | 'report' | 'book',
                    })
                  }
                  className="px-2 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 text-xs"
                >
                  <option value="article">article</option>
                  <option value="report">report</option>
                  <option value="book">book</option>
                </select>
              </div>
            </div>
          )}

          {selectedFormat === 'text' && (
            <span className="text-xs text-slate-500">
              Plain text formatted with ASCII table frames and structure.
            </span>
          )}
        </div>
      )}
    </div>
  )
}
