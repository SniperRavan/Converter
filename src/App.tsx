import { useEffect } from 'react'
import { Header } from './components/Header'
import { FormatSelector } from './components/FormatSelector'
import { StatusBar } from './components/StatusBar'
import { Workspace } from './components/Workspace'
import { Footer } from './components/Footer'
import { useConverterStore } from './store/useConverterStore'

function App() {
  const { themeMode } = useConverterStore()

  // Sync document class for dark mode on initialization & toggles
  useEffect(() => {
    if (themeMode === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [themeMode])

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-50 dark:bg-[#06070a] text-slate-900 dark:text-slate-100 selection:bg-blue-500/20 selection:text-blue-500 transition-colors duration-300 font-sans overflow-x-hidden">
      {/* Ambient Atmospheric Radial Glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-gradient-to-b from-blue-600/10 via-indigo-600/5 to-transparent blur-3xl opacity-70 dark:opacity-40"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-grid-pattern opacity-40"
      />

      {/* Floating Island Navigation */}
      <Header />

      {/* Main Workspace Stage */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-6 sm:pt-10 pb-12 flex flex-col gap-6">
        {/* Editorial Hero Header */}
        <section className="text-center max-w-2xl mx-auto space-y-2.5 pt-2 pb-1">
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-950 dark:text-white font-sans">
            Universal Document Engine
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
            Paste messy LLM responses, Markdown, LaTeX math, or tables. Converted deterministically into any format inside your browser.
          </p>
        </section>

        {/* Format Selector Bar */}
        <section aria-label="Format Selector">
          <FormatSelector />
        </section>

        {/* Live Diagnostics & Privacy Bar */}
        <section aria-label="Document Diagnostics">
          <StatusBar />
        </section>

        {/* Core Conversion & Preview Workspace (Double-Bezel Architecture) */}
        <section aria-label="Main Workspace" className="flex-1">
          <Workspace />
        </section>

        {/* Manifesto & Architecture Highlights */}
        <Footer />
      </main>
    </div>
  )
}

export default App
