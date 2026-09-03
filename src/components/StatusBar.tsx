import React from 'react'
import { CheckCircle2, Shield, Hash, Table, Code2, Calculator, AlignLeft } from 'lucide-react'
import { useConverterStore } from '../store/useConverterStore'

export const StatusBar: React.FC = () => {
  const { parsedDocument, detectionResult } = useConverterStore()
  const { stats } = parsedDocument

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xs text-xs text-slate-600 dark:text-slate-400 shadow-xs">
      {/* Detected Elements Badge */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span className="capitalize">{detectionResult.primaryFormat}</span>
        </div>

        <span className="text-slate-300 dark:text-slate-700">|</span>

        {/* Dynamic element counters */}
        <div className="flex items-center gap-3 flex-wrap">
          {stats.headings > 0 && (
            <span className="inline-flex items-center gap-1">
              <Hash className="w-3 h-3 text-blue-500" />
              <span>{stats.headings} {stats.headings === 1 ? 'heading' : 'headings'}</span>
            </span>
          )}

          {stats.mathExpressions > 0 && (
            <span className="inline-flex items-center gap-1">
              <Calculator className="w-3 h-3 text-purple-500" />
              <span>{stats.mathExpressions} {stats.mathExpressions === 1 ? 'equation' : 'equations'}</span>
            </span>
          )}

          {stats.codeBlocks > 0 && (
            <span className="inline-flex items-center gap-1">
              <Code2 className="w-3 h-3 text-amber-500" />
              <span>{stats.codeBlocks} {stats.codeBlocks === 1 ? 'code block' : 'code blocks'}</span>
            </span>
          )}

          {stats.tables > 0 && (
            <span className="inline-flex items-center gap-1">
              <Table className="w-3 h-3 text-indigo-500" />
              <span>{stats.tables} {stats.tables === 1 ? 'table' : 'tables'}</span>
            </span>
          )}

          <span className="inline-flex items-center gap-1">
            <AlignLeft className="w-3 h-3 text-slate-400" />
            <span>{stats.words} words · {stats.characters} chars</span>
          </span>
        </div>
      </div>

      {/* Privacy Guarantee Pill */}
      <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
        <Shield className="w-3.5 h-3.5 text-blue-500" />
        <span>100% In-Browser · 0 Data Sent</span>
      </div>
    </div>
  )
}
