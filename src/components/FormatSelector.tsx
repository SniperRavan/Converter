import React from 'react'
import { Eye, FileCode, Code2, Sigma, FileText } from 'lucide-react'
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
    <div className="flex items-center gap-2 flex-wrap">
      {/* Compact Segmented Control */}
      <div className="p-1 rounded-xl bg-slate-200/60 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08] backdrop-blur-xl flex items-center gap-1">
        {FORMATS.map((fmt) => {
          const Icon = fmt.icon
          const isActive = selectedFormat === fmt.id
          return (
            <button
              key={fmt.id}
              onClick={() => setSelectedFormat(fmt.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 active:scale-95 ${
                isActive
                  ? 'bg-white dark:bg-white/[0.12] text-slate-900 dark:text-white shadow-xs border border-slate-200/60 dark:border-white/20 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-white/[0.04]'
              }`}
            >
              <Icon
                className={`w-3.5 h-3.5 ${
                  isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'
                }`}
              />
              <span>{fmt.label}</span>
              <span
                className={`text-[9px] font-mono px-1 py-0.2 rounded ${
                  isActive
                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                    : 'text-slate-400'
                }`}
              >
                {fmt.ext}
              </span>
            </button>
          )
        })}
      </div>

      {/* Inline Contextual Format Options */}
      {selectedFormat === 'markdown' && (
        <div className="flex items-center gap-1 text-xs bg-slate-100 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.06] rounded-xl px-2.5 py-1">
          <span className="text-slate-400 text-[11px] mr-1">Flavor:</span>
          <button
            onClick={() => updateFormatOptions('markdown', { flavor: 'gfm' })}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              formatOptions.markdown.flavor === 'gfm' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            GFM
          </button>
          <button
            onClick={() => updateFormatOptions('markdown', { flavor: 'commonmark' })}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              formatOptions.markdown.flavor === 'commonmark' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            CommonMark
          </button>
        </div>
      )}

      {selectedFormat === 'html' && (
        <label className="flex items-center gap-1.5 text-xs bg-slate-100 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.06] rounded-xl px-2.5 py-1 cursor-pointer">
          <input
            type="checkbox"
            checked={formatOptions.html.includeWrapper}
            onChange={(e) => updateFormatOptions('html', { includeWrapper: e.target.checked })}
            className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500"
          />
          <span className="text-[11px] text-slate-700 dark:text-slate-300">Standalone HTML Boilerplate</span>
        </label>
      )}

      {selectedFormat === 'latex' && (
        <div className="flex items-center gap-2 text-xs bg-slate-100 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.06] rounded-xl px-2.5 py-1">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={formatOptions.latex.includePreamble}
              onChange={(e) => updateFormatOptions('latex', { includePreamble: e.target.checked })}
              className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="text-[11px] text-slate-700 dark:text-slate-300">Preamble</span>
          </label>
          <select
            value={formatOptions.latex.documentClass}
            onChange={(e) =>
              updateFormatOptions('latex', {
                documentClass: e.target.value as 'article' | 'report' | 'book',
              })
            }
            className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 text-[11px]"
          >
            <option value="article">article</option>
            <option value="report">report</option>
            <option value="book">book</option>
          </select>
        </div>
      )}
    </div>
  )
}
