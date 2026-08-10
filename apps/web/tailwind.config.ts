import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // El tema lo decide la clase .dark en <html>, que pone el script inline de
  // index.html: asi el usuario puede fijar uno distinto al del sistema.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // 200-400 y 800-900 se agregaron para dark mode. El 300 ademas ya
        // estaba referenciado por disabled:bg-primary-300 en Button, sin
        // existir: Tailwind no generaba esa clase y el boton deshabilitado se
        // quedaba del color normal.
        primary: {
          50: '#fdf4ff',
          100: '#fae8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87',
        },
      },
    },
  },
  plugins: [],
} satisfies Config
