import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/katex/')) return 'vendor-katex'
          if (id.includes('node_modules/lucide-react/')) return 'vendor-lucide'
          if (
            id.includes('node_modules/remark') ||
            id.includes('node_modules/unified') ||
            id.includes('node_modules/micromark') ||
            id.includes('node_modules/mdast')
          ) {
            return 'vendor-parser'
          }
        },
      },
    },
  },
})
