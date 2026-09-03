import { useEffect } from 'react'
import { Header } from './components/Header'
import { HeroSection } from './components/HeroSection'
import { Workspace } from './components/Workspace'
import { EditorialSections } from './components/EditorialSections'
import { FluidCanvas } from './components/canvasui/FluidCanvas'
import { useConverterStore } from './store/useConverterStore'

function App() {
  const { themeMode } = useConverterStore()

  // Sync dark mode class
  useEffect(() => {
    if (themeMode === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [themeMode])

  return (
    <div className="relative min-h-screen w-full flex flex-col bg-slate-50 dark:bg-[#06070a] text-slate-900 dark:text-slate-100 selection:bg-blue-500/20 selection:text-blue-500 font-sans transition-colors duration-200">
      {/* Subtle Ambient Particle Filament Canvas */}
      <FluidCanvas />

      {/* Sticky Header matching markdowntorichtext.com */}
      <Header />

      {/* Main Page Container */}
      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <HeroSection />

        {/* 2-Column Side-by-Side Converter Studio */}
        <div className="mt-2 mb-10">
          <Workspace />
        </div>

        {/* Editorial Sections: About, User Guide, Supported Syntax, FAQ & Footer */}
        <EditorialSections />
      </main>
    </div>
  )
}

export default App
