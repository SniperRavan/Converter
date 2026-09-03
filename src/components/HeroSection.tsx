import React from 'react'
import {
  CheckCircle2,
  Zap,
  Download,
  Copy,
  ShieldCheck,
  Bot,
} from 'lucide-react'

export const HeroSection: React.FC = () => {
  return (
    <div className="text-center pt-10 pb-6 px-4 max-w-4xl mx-auto">
      <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-neutral-900 dark:text-white mb-4">
        Universal Document
        <span className="text-blue-600 dark:text-neutral-200 font-bold"> Converter</span>
      </h1>

      <p className="text-lg sm:text-xl text-neutral-600 dark:text-neutral-300 mb-7 max-w-3xl mx-auto leading-relaxed">
        Transform any document, mixed LLM stream, code, or data into any format instantly.{' '}
        <strong className="text-neutral-900 dark:text-white font-semibold">
          No installation required, runs 100% in your browser.
        </strong>
      </p>

      {/* 6 Feature Badges */}
      <div className="flex flex-wrap justify-center gap-2 sm:gap-2.5 max-w-3xl mx-auto">
        <div className="inline-flex items-center rounded-full border border-[#E5DDD0] dark:border-white/15 px-3.5 py-1 text-xs sm:text-sm font-medium bg-white dark:bg-[#111111] text-neutral-800 dark:text-neutral-200 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 mr-1.5 text-blue-600 dark:text-white shrink-0" />
          <span>Real-time Preview</span>
        </div>

        <div className="inline-flex items-center rounded-full border border-blue-300 dark:border-blue-700/60 px-3.5 py-1 text-xs sm:text-sm font-medium bg-blue-50/80 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 shadow-2xs">
          <Bot className="w-4 h-4 mr-1.5 text-blue-600 dark:text-blue-400 shrink-0" />
          <span>LLM Mixed Stream Slot</span>
        </div>

        <div className="inline-flex items-center rounded-full border border-[#E5DDD0] dark:border-white/15 px-3.5 py-1 text-xs sm:text-sm font-medium bg-white dark:bg-[#111111] text-neutral-800 dark:text-neutral-200 shadow-2xs">
          <Zap className="w-4 h-4 mr-1.5 text-amber-500 dark:text-neutral-300 shrink-0" />
          <span>All Files In $\to$ Out</span>
        </div>

        <div className="inline-flex items-center rounded-full border border-[#E5DDD0] dark:border-white/15 px-3.5 py-1 text-xs sm:text-sm font-medium bg-white dark:bg-[#111111] text-neutral-800 dark:text-neutral-200 shadow-2xs">
          <Download className="w-4 h-4 mr-1.5 text-indigo-500 dark:text-neutral-300 shrink-0" />
          <span>Word, PDF, HTML, LaTeX</span>
        </div>

        <div className="inline-flex items-center rounded-full border border-[#E5DDD0] dark:border-white/15 px-3.5 py-1 text-xs sm:text-sm font-medium bg-white dark:bg-[#111111] text-neutral-800 dark:text-neutral-200 shadow-2xs">
          <Copy className="w-4 h-4 mr-1.5 text-emerald-500 dark:text-white shrink-0" />
          <span>One-click Rich Copy</span>
        </div>

        <div className="inline-flex items-center rounded-full border border-[#E5DDD0] dark:border-white/15 px-3.5 py-1 text-xs sm:text-sm font-medium bg-white dark:bg-[#111111] text-neutral-800 dark:text-neutral-200 shadow-2xs">
          <ShieldCheck className="w-4 h-4 mr-1.5 text-green-600 dark:text-white shrink-0" />
          <span>100% Private &amp; Offline</span>
        </div>
      </div>
    </div>
  )
}

export default HeroSection
