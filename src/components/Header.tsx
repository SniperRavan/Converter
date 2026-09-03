import React from 'react'
import { Sun, Moon, Zap, ShieldCheck } from 'lucide-react'
import { useConverterStore } from '../store/useConverterStore'
import heroImg from '../assets/hero.png'

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
    <header className="h-14 shrink-0 px-4 sm:px-6 border-b border-slate-200/80 dark:border-white/[0.08] bg-white/80 dark:bg-[#08090e]/90 backdrop-blur-xl flex items-center justify-between z-30 transition-colors">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <img
            src={heroImg}
            alt="Convertion Logo"
            className="w-8 h-8 rounded-lg object-contain border border-slate-200 dark:border-white/10 shadow-xs"
          />
          <span className="font-bold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white font-sans">
            Convertion
          </span>
        </div>

        <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono text-[10px] font-semibold border border-blue-500/20">
          AST v1.0
        </span>
      </div>

      {/* Center Manifesto Capsule */}
      <div className="hidden lg:flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-100 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/[0.06] text-xs text-slate-600 dark:text-slate-400 font-medium">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
        <span>No logins · No paywalls · Long live the handmade web</span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        {/* Motion Mode Toggle */}
        <button
          onClick={cycleMotion}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100/70 dark:bg-white/[0.04] hover:bg-slate-200/70 dark:hover:bg-white/[0.08] text-xs text-slate-700 dark:text-slate-200 transition-all active:scale-95"
          title="Toggle motion effects for low-power hardware"
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

        {/* Theme Toggle */}
        <button
          onClick={toggleThemeMode}
          className="w-8 h-8 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100/70 dark:bg-white/[0.04] hover:bg-slate-200/70 dark:hover:bg-white/[0.08] flex items-center justify-center text-slate-700 dark:text-slate-200 transition-all active:scale-95"
          title={`Switch to ${themeMode === 'dark' ? 'light' : 'dark'} mode`}
        >
          {themeMode === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700" />
          )}
        </button>

        {/* GitHub Link */}
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="w-8 h-8 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100/70 dark:bg-white/[0.04] hover:bg-slate-200/70 dark:hover:bg-white/[0.08] flex items-center justify-center text-slate-700 dark:text-slate-200 transition-all active:scale-95"
          title="GitHub Repository"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
          </svg>
        </a>
      </div>
    </header>
  )
}
