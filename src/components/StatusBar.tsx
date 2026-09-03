import React from 'react'
import { ShieldCheck, Calculator, Code2, Table, AlignLeft } from 'lucide-react'
import { useConverterStore } from '../store/useConverterStore'

export const StatusBar: React.FC = () => {
  const { parsedDocument, detectionResult } = useConverterStore()
  const { stats } = parsedDocument

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-white/70 dark:bg-[#0b0d14]/70 backdrop-blur-xl text-xs text-slate-600 dark:text-slate-400">
      {/* Live Format Pulse */}
      <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="capitalize font-semibold text-slate-900 dark:text-white text-xs">
          {detectionResult.primaryFormat}
        </span>
      </div>

      <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>

      {/* Metrics */}
      <div className="flex items-center gap-2.5 text-[11px] text-slate-500 dark:text-slate-400 hidden sm:flex">
        {stats.mathExpressions > 0 && (
          <span className="inline-flex items-center gap-1">
            <Calculator className="w-3 h-3 text-purple-400" />
            <span>{stats.mathExpressions} math</span>
          </span>
        )}
        {stats.codeBlocks > 0 && (
          <span className="inline-flex items-center gap-1">
            <Code2 className="w-3 h-3 text-amber-500" />
            <span>{stats.codeBlocks} code</span>
          </span>
        )}
        {stats.tables > 0 && (
          <span className="inline-flex items-center gap-1">
            <Table className="w-3 h-3 text-emerald-500" />
            <span>{stats.tables} tables</span>
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <AlignLeft className="w-3 h-3 text-slate-400" />
          <span>{stats.words.toLocaleString()} words</span>
        </span>
      </div>

      {/* Privacy Guarantee */}
      <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 ml-auto">
        <ShieldCheck className="w-3.5 h-3.5" />
        <span className="hidden md:inline">0 Bytes Telemetry</span>
      </div>
    </div>
  )
}
