import React from 'react'
import { ShieldCheck, Zap, Lock, Cpu, Sparkles, Heart } from 'lucide-react'

export const Footer: React.FC = () => {
  return (
    <footer className="mt-12 pt-8 pb-12 border-t border-slate-200 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400">
      {/* Manifesto Callout Box */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-500/5 via-indigo-500/5 to-purple-500/5 border border-slate-200/80 dark:border-slate-800/80 mb-8">
        <div className="max-w-2xl mx-auto text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold text-[11px] mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>The Convertion Manifesto</span>
          </div>
          <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            No logins. No paywalls. No data collection. Forever.
          </h4>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
            Fully open source. Long live the handmade web. Every conversion runs locally in your browser's V8 engine with deterministic parsers and zero remote telemetry.
          </p>
        </div>
      </div>

      {/* Feature Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 text-center sm:text-left">
        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 text-blue-500 shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h5 className="font-semibold text-slate-800 dark:text-slate-200 text-xs">Live AST Engine</h5>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Instant debounced preview</p>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 text-emerald-500 shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h5 className="font-semibold text-slate-800 dark:text-slate-200 text-xs">Zero Server Upload</h5>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Documents never leave device</p>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 text-purple-500 shrink-0">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h5 className="font-semibold text-slate-800 dark:text-slate-200 text-xs">Deterministic</h5>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">No flaky AI APIs for conversion</p>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 text-amber-500 shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h5 className="font-semibold text-slate-800 dark:text-slate-200 text-xs">XSS Hardened</h5>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">DOMPurify sanitization</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-slate-200/60 dark:border-slate-800/60 text-[11px]">
        <p className="flex items-center gap-1 text-slate-500">
          <span>Crafted with</span>
          <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
          <span>for independent thinkers & developers</span>
        </p>

        <p className="text-slate-400">
          Convertion · Released under MIT License
        </p>
      </div>
    </footer>
  )
}
