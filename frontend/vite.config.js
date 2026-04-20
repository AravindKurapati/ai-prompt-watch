import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/ai-prompt-watch/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: { recharts: ['recharts'] }
      }
    }
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: './src/test-setup.js',
  },
})
