import React from 'react'
import { ShieldCheck, Hash, Table, Code2, Calculator, AlignLeft } from 'lucide-react'
import { useConverterStore } from '../store/useConverterStore'

export const StatusBar: React.FC = () => {
  const { parsedDocument, detectionResult } = useConverterStore()
  const { stats } = parsedDocument

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 rounded-full border border-slate-200/80 dark:border-white/[0.08] bg-white/70 dark:bg-[#0b0d14]/70 backdrop-blur-xl text-xs text-slate-600 dark:text-slate-400 shadow-sm">
      {/* Live Metrics Row */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="capitalize font-semibold text-slate-900 dark:text-white">{detectionResult.primaryFormat}</span>
        </div>

        <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>

        {/* Dynamic element counters */}
        <div className="flex items-center gap-3.5 flex-wrap">
          {stats.headings > 0 && (
            <span className="inline-flex items-center gap-1">
              <Hash className="w-3.5 h-3.5 text-blue-500" />
              <span>{stats.headings} {stats.headings === 1 ? 'heading' : 'headings'}</span>
            </span>
          )}

          {stats.mathExpressions > 0 && (
            <span className="inline-flex items-center gap-1">
              <Calculator className="w-3.5 h-3.5 text-purple-400" />
              <span>{stats.mathExpressions} {stats.mathExpressions === 1 ? 'equation' : 'equations'}</span>
            </span>
          )}

          {stats.codeBlocks > 0 && (
            <span className="inline-flex items-center gap-1">
              <Code2 className="w-3.5 h-3.5 text-amber-500" />
              <span>{stats.codeBlocks} {stats.codeBlocks === 1 ? 'code' : 'codes'}</span>
            </span>
          )}

          {stats.tables > 0 && (
            <span className="inline-flex items-center gap-1">
              <Table className="w-3.5 h-3.5 text-emerald-500" />
              <span>{stats.tables} {stats.tables === 1 ? 'table' : 'tables'}</span>
            </span>
          )}

          <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
            <AlignLeft className="w-3.5 h-3.5" />
            <span>{stats.words.toLocaleString()} words · {stats.characters.toLocaleString()} chars</span>
          </span>
        </div>
      </div>

      {/* Privacy Guarantee Pill */}
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
        <ShieldCheck className="w-3.5 h-3.5" />
        <span>100% In-Browser · 0 Data Sent</span>
      </div>
    </div>
  )
}
