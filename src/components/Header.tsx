import React from 'react'
import { Globe, Sun, Moon, Zap } from 'lucide-react'
import { useConverterStore } from '../store/useConverterStore'
import heroImg from '../assets/hero.png'

export const Header: React.FC = () => {
  const { themeMode, toggleThemeMode, motionMode, setMotionMode } = useConverterStore()

  const cycleMotion = () => {
    if (motionMode === 'full') setMotionMode('reduced')
    else if (motionMode === 'reduced') setMotionMode('off')
    else setMotionMode('full')
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-[#08090e]/95 backdrop-blur-md transition-colors">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand & Logo matching markdowntorichtext.com */}
        <a href="/" className="flex items-center space-x-2.5 group">
          <div className="relative flex items-center justify-center">
            <img
              src={heroImg}
              alt="Logo"
              className="w-7 h-7 object-contain rounded-md shadow-xs group-hover:scale-105 transition-transform"
            />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">
            Markdown<span className="text-blue-600 dark:text-blue-400">Converter</span>
          </span>
        </a>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center space-x-6">
          <a
            href="/"
            className="text-sm font-medium text-blue-600 dark:text-blue-400 transition-colors"
          >
            Converter
          </a>
          <a
            href="#guide"
            className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            User Guide
          </a>
          <a
            href="#about"
            className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            About
          </a>
          <a
            href="#faq"
            className="text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            FAQ
          </a>
        </nav>

        {/* Right Controls */}
        <div className="flex items-center space-x-2">
          {/* Language Selector Button */}
          <button
            type="button"
            className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 h-9 rounded-md px-3 transition-colors cursor-pointer"
            title="Language: English"
          >
            <Globe className="h-4 w-4 mr-2 text-slate-500" />
            <span>English</span>
          </button>

          {/* Accessible Motion Toggle */}
          <button
            onClick={cycleMotion}
            className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 h-9 rounded-md px-2.5 transition-colors cursor-pointer"
            title={`Motion: ${motionMode}`}
          >
            <Zap
              className={`h-4 w-4 ${
                motionMode === 'full'
                  ? 'text-amber-500'
                  : motionMode === 'reduced'
                  ? 'text-sky-400'
                  : 'text-slate-400 opacity-40'
              }`}
            />
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleThemeMode}
            className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 h-9 w-9 rounded-md transition-colors cursor-pointer"
            title={themeMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {themeMode === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-slate-600" />
            )}
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header
