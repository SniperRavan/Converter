import React from 'react'
import { Sun, Moon, Zap, ShieldCheck, Sparkles } from 'lucide-react'
import { useConverterStore } from '../store/useConverterStore'

export const Header: React.FC = () => {
  const { themeMode, toggleThemeMode, motionMode, setMotionMode } = useConverterStore()

  const cycleMotion = () => {
    if (motionMode === 'full') setMotionMode('reduced')
    else if (motionMode === 'reduced') setMotionMode('off')
    else setMotionMode('full')
  }

  const motionLabel =
    motionMode === 'full' ? 'Motion: Full' : motionMode === 'reduced' ? 'Motion: Low' : 'Motion: Off'

  return (
    <header className="sticky top-4 z-50 px-4">
      <div className="max-w-6xl mx-auto rounded-full px-5 py-2.5 sm:py-3 border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-[#0b0d14]/85 backdrop-blur-2xl shadow-lg shadow-black/5 dark:shadow-black/40 flex items-center justify-between gap-4 transition-all">
        
        {/* Brand Mark */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <span className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-400 flex items-center justify-center text-white shadow-md shadow-blue-500/25">
              <Sparkles className="w-3.5 h-3.5" />
            </span>
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white dark:border-[#0b0d14]" />
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white font-sans">
              Convertion
            </span>
            <span className="hidden sm:inline text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400 font-semibold border border-blue-500/20">
              Universal AST
            </span>
          </div>
        </div>

        {/* Center Manifesto Capsule */}
        <div className="hidden lg:flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.06] text-[11px] text-slate-600 dark:text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span className="font-medium">No logins · No paywalls · Long live the handmade web</span>
        </div>

        {/* Interactive Controls */}
        <div className="flex items-center gap-2">
          {/* Motion Mode Toggle */}
          <button
            onClick={cycleMotion}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 dark:border-white/10 bg-slate-100/80 dark:bg-white/[0.05] hover:bg-slate-200/70 dark:hover:bg-white/[0.1] text-xs text-slate-700 dark:text-slate-200 transition-all active:scale-95"
            title="Toggle visual motion effects for low-power or older hardware"
          >
            <Zap
              className={`w-3.5 h-3.5 ${
                motionMode === 'full'
                  ? 'text-amber-500'
                  : motionMode === 'reduced'
                  ? 'text-sky-400'
                  : 'text-slate-400 opacity-40'
              }`}
            />
            <span className="text-[11px] font-medium hidden sm:inline">{motionLabel}</span>
          </button>

          {/* Theme Mode Toggle */}
          <button
            onClick={toggleThemeMode}
            className="w-8 h-8 rounded-full border border-slate-200 dark:border-white/10 bg-slate-100/80 dark:bg-white/[0.05] hover:bg-slate-200/70 dark:hover:bg-white/[0.1] flex items-center justify-center text-slate-700 dark:text-slate-200 transition-all active:scale-95"
            title={`Switch to ${themeMode === 'dark' ? 'light' : 'dark'} mode`}
          >
            {themeMode === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>

          {/* GitHub Icon */}
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-8 h-8 rounded-full border border-slate-200 dark:border-white/10 bg-slate-100/80 dark:bg-white/[0.05] hover:bg-slate-200/70 dark:hover:bg-white/[0.1] flex items-center justify-center text-slate-700 dark:text-slate-200 transition-all active:scale-95"
            title="Open Source on GitHub"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
          </a>
        </div>
      </div>
    </header>
  )
}
