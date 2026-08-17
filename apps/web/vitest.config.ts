import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Config propia y no la de vite.config.ts: ese archivo carga vite-plugin-pwa,
// que en modo test intenta generar el service worker y no hace falta.
export default defineConfig({
  // @vitejs/plugin-react es typed contra vite@6, pero vitest@2 depende de vite@5.
  // Esta divergencia de tipos se resuelve con any; la compatibilidad en runtime
  // es garantizada. Ver: https://github.com/vitest-dev/vitest/issues/6199
  plugins: [react()] as any,
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
