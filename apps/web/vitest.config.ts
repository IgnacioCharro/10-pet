import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Config propia y no la de vite.config.ts: ese archivo carga vite-plugin-pwa,
// que en modo test intenta generar el service worker y no hace falta.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
