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
    <header className="sticky top-0 z-50 w-full border-b border-[#E8E1D3] dark:border-white/10 bg-[#FFFAF0]/95 dark:bg-[#000000]/95 backdrop-blur-md transition-colors">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand & Logo */}
        <a href="/" className="flex items-center space-x-2.5 group">
          <div className="relative flex items-center justify-center">
            <img
              src={heroImg}
              alt="Logo"
              className="w-7 h-7 object-contain rounded-md shadow-xs group-hover:scale-105 transition-transform"
            />
          </div>
          <span className="font-bold text-xl tracking-tight text-neutral-900 dark:text-white">
            Converter
          </span>
        </a>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center space-x-6">
          <a
            href="/"
            className="text-sm font-semibold text-neutral-900 dark:text-white transition-colors"
          >
            Converter
          </a>
          <a
            href="#guide"
            className="text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            User Guide
          </a>
          <a
            href="#about"
            className="text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            About
          </a>
          <a
            href="#faq"
            className="text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            FAQ
          </a>
        </nav>

        {/* Right Controls */}
        <div className="flex items-center space-x-2">
          {/* Language Selector Button */}
          <button
            type="button"
            className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium border border-[#E2DAD0] dark:border-white/15 bg-white dark:bg-[#111111] hover:bg-[#F5EFE4] dark:hover:bg-[#1c1c1c] text-neutral-800 dark:text-white h-9 rounded-md px-3 transition-colors cursor-pointer shadow-2xs"
            title="Language: English"
          >
            <Globe className="h-4 w-4 mr-2 text-neutral-500 dark:text-neutral-400" />
            <span>English</span>
          </button>

          {/* Accessible Motion Toggle */}
          <button
            onClick={cycleMotion}
            className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium border border-[#E2DAD0] dark:border-white/15 bg-white dark:bg-[#111111] hover:bg-[#F5EFE4] dark:hover:bg-[#1c1c1c] text-neutral-800 dark:text-white h-9 rounded-md px-2.5 transition-colors cursor-pointer shadow-2xs"
            title={`Motion: ${motionMode}`}
          >
            <Zap
              className={`h-4 w-4 ${
                motionMode === 'full'
                  ? 'text-amber-500'
                  : motionMode === 'reduced'
                  ? 'text-neutral-400'
                  : 'text-neutral-400 opacity-40'
              }`}
            />
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleThemeMode}
            className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium border border-[#E2DAD0] dark:border-white/15 bg-white dark:bg-[#111111] hover:bg-[#F5EFE4] dark:hover:bg-[#1c1c1c] text-neutral-800 dark:text-white h-9 w-9 rounded-md transition-colors cursor-pointer shadow-2xs"
            title={themeMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {themeMode === 'dark' ? (
              <Sun className="h-4 w-4 text-white" />
            ) : (
              <Moon className="h-4 w-4 text-neutral-800" />
            )}
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header
