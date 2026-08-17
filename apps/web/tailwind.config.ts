import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // El tema lo decide la clase .dark en <html>, que pone el script inline de
  // index.html: asi el usuario puede fijar uno distinto al del sistema.
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        // La UI entera. Los @font-face viven en index.css, self-hosted: la PWA
        // tiene que verse igual offline y no le pasamos la IP de cada visitante
        // a Google.
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        // Wordmark y titulares. El fallback es una serif de verdad y no la sans
        // del sistema: si la fuente tarda, la marca se degrada dentro de la
        // misma familia visual en vez de saltar de serif a palo seco.
        brand: ['Lora', 'Georgia', 'Times New Roman', 'serif'],
        // Solo navegacion, en los dos breakpoints.
        nav: ['Space Grotesk', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Violeta de marca. El 600 es exactamente el #7c3aed del fill de los SVG
        // del logo; el resto de la rampa se derivo en oklch al mismo matiz (293)
        // usando las luminosidades que pide el handoff para cada rol:
        //
        //   200 -> chip claro (--accent-lt)      300 -> violeta de texto en dark
        //   600 -> relleno, botones (--accent)   700 -> violeta de texto en claro
        //   900 -> chip oscuro (--accent-lt dark)
        //
        // OJO: la tabla oklch del handoff dice oklch(55% 0.18 280) para el acento,
        // pero eso da #615ed6, no el #7c3aed de su propia columna de hex ni el del
        // arte. Manda el arte: derivar de esos oklch daba una familia que no
        // coincidia con el logo.
        primary: {
          50: '#f7f5ff',
          100: '#efebff',
          200: '#e5dfff',
          300: '#af97ff',
          400: '#946cf8',
          500: '#8853f6',
          600: '#7c3aed',
          700: '#5c19ba',
          800: '#451a8b',
          900: '#31205a',
        },
      },
    },
  },
  plugins: [],
} satisfies Config
