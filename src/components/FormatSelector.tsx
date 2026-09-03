import React from 'react'
import { Eye, FileCode, Code2, Sigma, FileText, SlidersHorizontal } from 'lucide-react'
import { useConverterStore } from '../store/useConverterStore'
import type { SupportedOutputFormat } from '../core/types'

const FORMATS: { id: SupportedOutputFormat; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'preview', label: 'Rich Preview', icon: Eye },
  { id: 'markdown', label: 'Markdown', icon: FileCode },
  { id: 'html', label: 'HTML', icon: Code2 },
  { id: 'latex', label: 'LaTeX', icon: Sigma },
  { id: 'text', label: 'Plain Text', icon: FileText },
]

export const FormatSelector: React.FC = () => {
  const { selectedFormat, setSelectedFormat, formatOptions, updateFormatOptions } = useConverterStore()

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <span>Target Format</span>
        </div>

        {selectedFormat !== 'preview' && (
          <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Format Options Active</span>
          </div>
        )}
      </div>

      {/* Format Selector Pills / Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {FORMATS.map((fmt) => {
          const Icon = fmt.icon
          const isActive = selectedFormat === fmt.id
          return (
            <button
              key={fmt.id}
              onClick={() => setSelectedFormat(fmt.id)}
              className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25 border-blue-500 font-semibold'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-850'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
              <span>{fmt.label}</span>
            </button>
          )
        })}
      </div>

      {/* Dynamic Per-Format Options Bar */}
      {selectedFormat === 'markdown' && (
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-4 text-xs">
          <span className="font-semibold text-slate-600 dark:text-slate-400">Markdown Flavor:</span>
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300">
            <input
              type="radio"
              name="flavor"
              checked={formatOptions.markdown.flavor === 'gfm'}
              onChange={() => updateFormatOptions('markdown', { flavor: 'gfm' })}
              className="text-blue-600 focus:ring-blue-500"
            />
            <span>GitHub Flavored (GFM)</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300">
            <input
              type="radio"
              name="flavor"
              checked={formatOptions.markdown.flavor === 'commonmark'}
              onChange={() => updateFormatOptions('markdown', { flavor: 'commonmark' })}
              className="text-blue-600 focus:ring-blue-500"
            />
            <span>CommonMark</span>
          </label>
        </div>
      )}

      {selectedFormat === 'html' && (
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-4 text-xs">
          <span className="font-semibold text-slate-600 dark:text-slate-400">HTML Options:</span>
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={formatOptions.html.includeWrapper}
              onChange={(e) => updateFormatOptions('html', { includeWrapper: e.target.checked })}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span>Include Complete HTML Document Wrapper</span>
          </label>
        </div>
      )}

      {selectedFormat === 'latex' && (
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-4 text-xs">
          <span className="font-semibold text-slate-600 dark:text-slate-400">LaTeX Options:</span>
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={formatOptions.latex.includePreamble}
              onChange={(e) => updateFormatOptions('latex', { includePreamble: e.target.checked })}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span>Include \\documentclass & Preamble</span>
          </label>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Class:</span>
            <select
              value={formatOptions.latex.documentClass}
              onChange={(e) =>
                updateFormatOptions('latex', {
                  documentClass: e.target.value as 'article' | 'report' | 'book',
                })
              }
              className="px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
            >
              <option value="article">article</option>
              <option value="report">report</option>
              <option value="book">book</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}
