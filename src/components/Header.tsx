import React, { useState, useEffect } from 'react'
import { Sun, Moon, Zap } from 'lucide-react'
import { useConverterStore } from '../store/useConverterStore'
import heroImg from '../assets/hero.png'

export const Header: React.FC = () => {
  const { themeMode, toggleThemeMode, motionMode, setMotionMode } = useConverterStore()
  const [activeSection, setActiveSection] = useState<string>('converter')

  const cycleMotion = () => {
    if (motionMode === 'full') setMotionMode('reduced')
    else if (motionMode === 'reduced') setMotionMode('off')
    else setMotionMode('full')
  }

  // Active scrollspy to track current in-view section
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 180

      // Near bottom edge of page -> activate issues
      if (
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 100
      ) {
        setActiveSection('issues')
        return
      }

      const sections = [
        { id: 'issues', el: document.getElementById('issues') },
        { id: 'faq', el: document.getElementById('faq') },
        { id: 'about', el: document.getElementById('about') },
        { id: 'guide', el: document.getElementById('guide') },
        { id: 'converter', el: document.getElementById('converter') },
      ]

      for (const section of sections) {
        if (section.el) {
          const top = section.el.offsetTop
          if (scrollPosition >= top) {
            setActiveSection(section.id)
            return
          }
        }
      }

      setActiveSection('converter')
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navItems = [
    { id: 'converter', label: 'Converter', href: '#converter' },
    { id: 'guide', label: 'User Guide', href: '#guide' },
    { id: 'about', label: 'About', href: '#about' },
    { id: 'faq', label: 'FAQ', href: '#faq' },
    { id: 'issues', label: 'Issues', href: '#issues' },
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#E8E1D3]/80 dark:border-white/10 bg-[#FFFAF0]/70 dark:bg-black/65 backdrop-blur-xl backdrop-saturate-180 transition-all duration-200">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand & Logo */}
        <a href="#converter" className="flex items-center space-x-2.5 group">
          <div className="relative flex items-center justify-center">
            <img
              src={heroImg}
              alt="Converter Logo"
              className="w-8 h-8 object-contain drop-shadow-[0_2px_8px_rgba(168,85,247,0.35)] group-hover:scale-105 transition-transform"
            />
          </div>
          <span className="font-bold text-xl tracking-tight text-neutral-900 dark:text-white">
            Converter
          </span>
        </a>

        {/* Center Nav Links in Requested Order with Scrollspy */}
        <nav className="hidden md:flex items-center space-x-1.5 text-xs font-medium">
          {navItems.map((item) => {
            const isActive = activeSection === item.id
            return (
              <a
                key={item.id}
                href={item.href}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  isActive
                    ? 'bg-neutral-900/10 dark:bg-white/15 text-neutral-950 dark:text-white font-semibold shadow-2xs'
                    : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                {item.label}
              </a>
            )
          })}
        </nav>

        {/* Right Controls */}
        <div className="flex items-center space-x-2">
          {/* GitHub Profile */}
          <a
            href="https://github.com/sniperravan"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center whitespace-nowrap text-xs font-medium border border-[#E2DAD0] dark:border-white/15 bg-white dark:bg-[#111111] hover:bg-[#F5EFE4] dark:hover:bg-[#1c1c1c] text-neutral-800 dark:text-white h-9 rounded-md px-2.5 transition-colors cursor-pointer shadow-2xs"
            title="GitHub: sniperravan"
            aria-label="GitHub Profile sniperravan"
          >
            <svg
              className="h-4 w-4 fill-current"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            <span className="ml-1.5 font-semibold hidden lg:inline">sniperravan</span>
          </a>

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
