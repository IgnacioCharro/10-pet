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
        // La rampa gris NO es gris: son los tokens de la maqueta metidos detras
        // de los nombres de clase que el codigo ya usa. Hay 1081 clases gray-*
        // en 40 archivos; refactorizarlas a tokens semanticos serian ~1300
        // ediciones y un diff irrevisable. Redefiniendo los valores, esos 40
        // archivos adoptan la paleta sin ser tocados.
        //
        // El mapeo sale de los pares que usa el codigo:
        //   bg-white / dark:bg-gray-800        -> card
        //   bg-gray-50 / dark:bg-gray-900      -> bg   (ver canvas)
        //   border-gray-200 / dark:border-gray-700 -> line
        //   text-gray-500 / dark:text-gray-400 -> fg2
        //   text-gray-900 / dark:text-gray-100 -> fg
        //
        // Dos tonos sirven a dos roles que la maqueta separa, y se unifican a
        // proposito:
        //   gray-700 es superficie oscura (75 usos) Y linea oscura (60 usos)
        //   gray-600 es texto secundario claro (71) Y borde oscuro (36)
        // Si alguno molesta en el recorrido visual, se editan a mano esos usos.
        // No se rehace el mapeo.
        gray: {
          50: '#f7f3fa',
          100: '#f4eef8',
          200: '#e4dbec',
          300: '#cec0dc',
          400: '#c3b6d0',
          500: '#5b4b6b',
          600: '#8d7f9c',
          700: '#372a48',
          800: '#241a31',
          900: '#241a31',
        },
        // gray-900 no puede ser el fondo de pagina en oscuro: se usa tambien
        // como text-gray-900 en claro, donde tiene que ser #241a31. Si fuera
        // #140e1c el fondo de pagina quedaria igual al de tarjeta y las
        // tarjetas desaparecerian. Por eso el fondo tiene nombre propio.
        canvas: '#140e1c',
        surface: 'var(--card)',
        'surface-alt': 'var(--card2)',
        line: 'var(--line)',
        'line-strong': 'var(--line2)',
        fg: 'var(--fg)',
        muted: 'var(--fg2)',
        faint: 'var(--fg3)',
        'nav-active': '#a855ff',
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
