import { defineConfig } from 'vitest/config'

// Config propia y no la de vite.config.ts: ese archivo carga vite-plugin-pwa,
// que en modo test intenta generar el service worker y no hace falta.
// No incluimos @vitejs/plugin-react porque la transformacion JSX viene de
// jsx: react-jsx en tsconfig.app.json; el plugin solo agrega Fast Refresh,
// que no se usa en tests.
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
