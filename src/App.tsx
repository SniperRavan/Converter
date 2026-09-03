import { useEffect } from 'react'
import { Header } from './components/Header'
import { FormatSelector } from './components/FormatSelector'
import { StatusBar } from './components/StatusBar'
import { Workspace } from './components/Workspace'
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
    <div className="relative h-screen max-h-screen w-screen overflow-hidden flex flex-col bg-slate-50 dark:bg-[#06070a] text-slate-900 dark:text-slate-100 selection:bg-blue-500/20 selection:text-blue-500 font-sans transition-colors duration-200">
      {/* Canvas UI Ambient Constellation Shader */}
      <FluidCanvas />

      {/* Compact Studio Header with hero.png logo */}
      <Header />

      {/* Main Studio Viewport (Zero outer scrolling, full internal scroll) */}
      <main className="relative z-10 flex-1 min-h-0 w-full flex flex-col px-3 sm:px-5 pt-2 pb-3 gap-2.5 overflow-hidden">
        {/* Top Control Strip: Format Selector + Live Status */}
        <div className="shrink-0 flex items-center justify-between flex-wrap gap-2">
          <FormatSelector />
          <StatusBar />
        </div>

        {/* Main Side-by-Side Synchronized Workspace */}
        <div className="flex-1 min-h-0 w-full">
          <Workspace />
        </div>
      </main>
    </div>
  )
}

export default App
