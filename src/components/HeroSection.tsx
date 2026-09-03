import React from 'react'
import {
  CheckCircle2,
  Zap,
  Download,
  Copy,
  Globe,
  ShieldCheck,
} from 'lucide-react'

export const HeroSection: React.FC = () => {
  return (
    <div className="text-center pt-8 pb-6 px-4 max-w-4xl mx-auto">
      <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4">
        Markdown to Rich Text
        <span className="text-blue-600 dark:text-blue-400"> Converter</span>
      </h1>

      <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 mb-7 max-w-3xl mx-auto leading-relaxed">
        Transform your Markdown into beautifully formatted rich text instantly.{' '}
        <strong className="text-slate-900 dark:text-white font-semibold">
          No installation required, works entirely in your browser.
        </strong>
      </p>

      {/* 6 Feature Badges from markdowntorichtext.com */}
      <div className="flex flex-wrap justify-center gap-2 sm:gap-2.5 max-w-3xl mx-auto">
        <div className="inline-flex items-center rounded-full border border-slate-200/80 dark:border-white/10 px-3 py-1 text-xs sm:text-sm font-medium bg-slate-100/80 dark:bg-white/[0.05] text-slate-700 dark:text-slate-200 shadow-xs">
          <CheckCircle2 className="w-4 h-4 mr-1.5 text-blue-600 dark:text-blue-400 shrink-0" />
          <span>Real-time Preview</span>
        </div>

        <div className="inline-flex items-center rounded-full border border-slate-200/80 dark:border-white/10 px-3 py-1 text-xs sm:text-sm font-medium bg-slate-100/80 dark:bg-white/[0.05] text-slate-700 dark:text-slate-200 shadow-xs">
          <Zap className="w-4 h-4 mr-1.5 text-amber-500 shrink-0" />
          <span>Instant Conversion</span>
        </div>

        <div className="inline-flex items-center rounded-full border border-slate-200/80 dark:border-white/10 px-3 py-1 text-xs sm:text-sm font-medium bg-slate-100/80 dark:bg-white/[0.05] text-slate-700 dark:text-slate-200 shadow-xs">
          <Download className="w-4 h-4 mr-1.5 text-indigo-500 shrink-0" />
          <span>Multiple Export Formats</span>
        </div>

        <div className="inline-flex items-center rounded-full border border-slate-200/80 dark:border-white/10 px-3 py-1 text-xs sm:text-sm font-medium bg-slate-100/80 dark:bg-white/[0.05] text-slate-700 dark:text-slate-200 shadow-xs">
          <Copy className="w-4 h-4 mr-1.5 text-emerald-500 shrink-0" />
          <span>One-click Copy</span>
        </div>

        <div className="inline-flex items-center rounded-full border border-slate-200/80 dark:border-white/10 px-3 py-1 text-xs sm:text-sm font-medium bg-slate-100/80 dark:bg-white/[0.05] text-slate-700 dark:text-slate-200 shadow-xs">
          <Globe className="w-4 h-4 mr-1.5 text-cyan-500 shrink-0" />
          <span>Works Everywhere</span>
        </div>

        <div className="inline-flex items-center rounded-full border border-slate-200/80 dark:border-white/10 px-3 py-1 text-xs sm:text-sm font-medium bg-slate-100/80 dark:bg-white/[0.05] text-slate-700 dark:text-slate-200 shadow-xs">
          <ShieldCheck className="w-4 h-4 mr-1.5 text-green-500 shrink-0" />
          <span>Privacy First</span>
        </div>
      </div>
    </div>
  )
}

export default HeroSection
