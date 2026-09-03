import React from 'react'
import { Sun, Moon, Zap, ShieldCheck, Sparkles } from 'lucide-react'
import { useConverterStore } from '../store/useConverterStore'

export const Header: React.FC = () => {
  const { themeMode, toggleThemeMode, motionMode, setMotionMode } = useConverterStore()

  const cycleMotionMode = () => {
    if (motionMode === 'full') setMotionMode('reduced')
    else if (motionMode === 'reduced') setMotionMode('off')
    else setMotionMode('full')
  }

  const motionLabel =
    motionMode === 'full' ? 'Full Motion' : motionMode === 'reduced' ? 'Reduced Motion' : 'Motion Off'

  return (
    <header className="border-b border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
        {/* Brand & Tagline */}
        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 via-indigo-500 to-sky-400 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
              <Sparkles className="w-4 h-4" />
            </span>
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white font-sans">
              Convertion
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-blue-500/10 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-semibold">
              v1.0 AST
            </span>
          </div>

          <p className="hidden md:block text-xs text-slate-500 dark:text-slate-400 font-medium">
            No logins · No paywalls · No data collection · Client-side
          </p>
        </div>

        {/* Manifesto Banner Tooltip / Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Long live the handmade web</span>
        </div>

        {/* Global Controls: Motion & Dual Theme */}
        <div className="flex items-center gap-2">
          {/* Motion Toggle Button */}
          <button
            onClick={cycleMotionMode}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
            title={`Current: ${motionLabel}. Click to switch between Full, Reduced, or Off for low-power devices.`}
          >
            <Zap
              className={`w-3.5 h-3.5 ${
                motionMode === 'full'
                  ? 'text-amber-500'
                  : motionMode === 'reduced'
                  ? 'text-sky-400'
                  : 'text-slate-400 opacity-50'
              }`}
            />
            <span className="hidden sm:inline font-medium text-[11px]">{motionLabel}</span>
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleThemeMode}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
            title={`Switch to ${themeMode === 'dark' ? 'light' : 'dark'} mode`}
          >
            {themeMode === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {/* GitHub / Open Source Link */}
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
            title="View Source on GitHub"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
          </a>
        </div>
      </div>
    </header>
  )
}
