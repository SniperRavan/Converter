import { useEffect } from 'react'
import { Header } from './components/Header'
import { FormatSelector } from './components/FormatSelector'
import { StatusBar } from './components/StatusBar'
import { Workspace } from './components/Workspace'
import { Footer } from './components/Footer'
import { useConverterStore } from './store/useConverterStore'

function App() {
  const { themeMode } = useConverterStore()

  // Sync document class for dark mode on initialization
  useEffect(() => {
    if (themeMode === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [themeMode])

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200 font-sans">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6">
        {/* Format Selector Bar */}
        <section aria-label="Format Selector">
          <FormatSelector />
        </section>

        {/* Live Diagnostics & Privacy Bar */}
        <section aria-label="Document Diagnostics">
          <StatusBar />
        </section>

        {/* Core Conversion & Preview Workspace */}
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
