import React from 'react'
import { ShieldCheck, Zap, Lock, Cpu, Sparkles, Heart } from 'lucide-react'

export const Footer: React.FC = () => {
  return (
    <footer className="mt-16 pt-8 pb-16 border-t border-slate-200/80 dark:border-white/[0.06] text-xs text-slate-500 dark:text-slate-400">
      {/* Manifesto Callout Box */}
      <div className="relative overflow-hidden p-8 rounded-[2rem] bg-gradient-to-b from-slate-100/80 via-slate-100/40 to-transparent dark:from-white/[0.04] dark:via-white/[0.02] dark:to-transparent border border-slate-200/80 dark:border-white/[0.08] shadow-lg mb-12">
        <div className="max-w-2xl mx-auto text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold text-[10px] uppercase tracking-wider mb-1">
            <Sparkles className="w-3 h-3" />
            <span>Convertion Manifesto</span>
          </div>

          <h4 className="text-xl sm:text-2xl font-bold text-slate-950 dark:text-white tracking-tight">
            No logins. No paywalls. No data collection. Forever.
          </h4>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
            Fully open source. Long live the handmade web. Every single conversion is performed directly in your browser's local runtime with deterministic AST parsing and zero remote telemetry.
          </p>
        </div>
      </div>

      {/* Feature Architecture Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-12">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h5 className="font-semibold text-slate-900 dark:text-slate-200 text-xs">Deterministic AST</h5>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Real-time debounced conversion</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h5 className="font-semibold text-slate-900 dark:text-slate-200 text-xs">Zero Server Upload</h5>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Documents never leave your device</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h5 className="font-semibold text-slate-900 dark:text-slate-200 text-xs">Private & Offline</h5>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">No flaky AI APIs for conversion</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h5 className="font-semibold text-slate-900 dark:text-slate-200 text-xs">XSS Hardened</h5>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">DOMPurify sanitization boundary</p>
          </div>
        </div>
      </div>

      {/* Bottom Colophon */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-slate-200/60 dark:border-white/[0.04] text-[11px]">
        <p className="flex items-center gap-1.5 text-slate-500">
          <span>Crafted with</span>
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
          <span>for independent thinkers & developers</span>
        </p>

        <p className="text-slate-400 font-mono text-[10px]">
          Convertion · Released under MIT License
        </p>
      </div>
    </footer>
  )
}
