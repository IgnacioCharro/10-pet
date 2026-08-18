import { describe, it, expect, beforeAll } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import type NavBarType from './NavBar'

// React Router tira warnings de "future flag" por consola apenas se monta un
// MemoryRouter sin optar por ellas. No cambian nada del comportamiento que
// se testea aca; se opta por las dos para que la salida de test quede limpia.
const routerFuture = { v7_startTransition: true, v7_relativeSplatPath: true } as const

// jsdom no implementa matchMedia. themeStore lo llama en su top-level (para
// leer el tema del sistema) apenas se importa, y NavBar arrastra ese import
// via ThemeToggle. Sin este stub, ni siquiera arranca el archivo. Es un
// polyfill de una API de plataforma, no un mock de logica de negocio: por
// eso NavBar se importa dynamic, despues de instalar el stub, en vez de
// arrastrar el problema a src/test/setup.ts (que es compartido por toda la
// suite y no lo necesita hoy).
let NavBar: typeof NavBarType

beforeAll(async () => {
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia
  }
  NavBar = (await import('./NavBar')).default
})

// Dos tests baratos que solo prueban que el refactor de NavItem no rompio el
// cableado (activo marcado, href correcto). No repiten el recorrido visual
// de fuentes/paleta/toque, que ya cubren otros archivos.
describe('NavBar', () => {
  it('marca "Inicio" como activo y "Mapa" no, en la ruta /', () => {
    render(
      <MemoryRouter initialEntries={['/']} future={routerFuture}>
        <NavBar />
      </MemoryRouter>,
    )
    // Hay nav de escritorio y drawer mobile en el DOM a la vez: se toma el
    // primer link de cada label, que es el de la nav de escritorio.
    const inicio = screen.getAllByRole('link', { name: 'Inicio' })[0]
    const mapa = screen.getAllByRole('link', { name: 'Mapa' })[0]
    expect(inicio).toHaveAttribute('aria-current', 'page')
    expect(mapa).not.toHaveAttribute('aria-current')
  })

  it('el link "Como funciona" del drawer apunta al ancla de la landing', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']} future={routerFuture}>
        <NavBar />
      </MemoryRouter>,
    )
    // El drawer solo existe en el DOM con open=true: hay que abrirlo primero.
    await userEvent.click(screen.getByRole('button', { name: 'Abrir menú' }))
    const link = within(container).getByRole('link', { name: 'Como funciona' })
    expect(link).toHaveAttribute('href', '/#como-funciona')
  })
})
