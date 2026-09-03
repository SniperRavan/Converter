import { useEffect } from 'react'
import { Header } from './components/Header'
import { HeroSection } from './components/HeroSection'
import { Workspace } from './components/Workspace'
import { EditorialSections } from './components/EditorialSections'
import { FluidCanvas } from './components/canvasui/FluidCanvas'
import { MobilePageBend } from './components/MobilePageBend'
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
    <div className="relative min-h-screen w-full flex flex-col bg-[#FFFAF0] dark:bg-[#000000] text-neutral-900 dark:text-white selection:bg-blue-500/20 selection:text-blue-500 font-sans transition-colors duration-200">
      {/* Subtle Ambient Particle Filament Canvas */}
      <FluidCanvas />

      {/* Sticky Header */}
      <Header />

      {/* Mobile Whole-Page Bend Wrapper (Active ONLY on mobile view < 768px, zero bend slop on desktop) */}
      <MobilePageBend>
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
      </MobilePageBend>
    </div>
  )
}

export default App
