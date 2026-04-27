import { Link } from 'react-router-dom'
import { Button, Card } from '../components/ui'
import { useAuthStore } from '../stores/authStore'
import HomeFeed from '../components/cases/HomeFeed'

const features = [
  {
    title: 'Publicá un caso',
    body: 'Subí fotos, ubicación y datos del animal en menos de un minuto. La red de voluntarios cercanos se entera al instante.',
    icon: '📍',
  },
  {
    title: 'Voluntarios cerca',
    body: 'Recibí ayuda de personas que viven en tu zona, no de un foro nacional perdido. Búsqueda geográfica precisa.',
    icon: '🤝',
  },
  {
    title: 'Sin perder contacto',
    body: 'Ofertas de ayuda, contactos y novedades del caso, todo en un solo lugar. Sin grupos de WhatsApp infinitos.',
    icon: '💬',
  },
]

const steps = [
  { n: 1, title: 'Encontrás un animal', body: 'Perdido, herido o en situación de calle.' },
  { n: 2, title: 'Publicás el caso', body: 'Foto, ubicación y descripción breve.' },
  { n: 3, title: 'Aparecen voluntarios', body: 'Te avisamos cuando alguien quiere ayudar.' },
  { n: 4, title: 'Coordinás y resolvés', body: 'Contacto directo, sin intermediarios.' },
]

export default function HomePage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  if (isAuthenticated) {
    return <HomeFeed />
  }

  const ctaTo = '/register'
  const ctaText = 'Empezar gratis'

  return (
    <main className="flex-1">
      <section className="bg-gradient-to-b from-primary-50 to-white">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24 text-center">
          <p className="text-sm uppercase tracking-wider text-primary-600 font-semibold mb-3">
            Rescate animal · Argentina
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight max-w-3xl mx-auto">
            Conectá animales en problemas con quienes pueden ayudar
          </h1>
          <p className="mt-5 text-lg text-gray-600 max-w-2xl mx-auto">
            10_Pet es la plataforma que junta a rescatistas, voluntarios y vecinos cerca tuyo.
            Geolocalización, notificaciones y contacto directo, sin perderte mensajes en grupos.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to={ctaTo}>
              <Button size="lg">{ctaText}</Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="secondary">
                Ya tengo cuenta
              </Button>
            </Link>
          </div>
          <p className="mt-6 text-xs text-gray-500">
            Piloto inicial en interior de Buenos Aires
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title}>
              <div className="text-3xl mb-3" aria-hidden="true">
                {f.icon}
              </div>
              <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-gray-600">{f.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="bg-gray-50 border-y border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">Cómo funciona</h2>
          <ol className="grid gap-6 md:grid-cols-4">
            {steps.map((s) => (
              <li key={s.n} className="flex flex-col items-center text-center">
                <div className="h-10 w-10 rounded-full bg-primary-600 text-white flex items-center justify-center font-semibold mb-3">
                  {s.n}
                </div>
                <h3 className="font-semibold mb-1">{s.title}</h3>
                <p className="text-sm text-gray-600">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-3">Sumate al MVP</h2>
        <p className="text-gray-600 mb-6">
          Estamos arrancando con un piloto en una ciudad del interior. Si querés ser de los
          primeros en usarlo, registrate hoy y te escribimos cuando abramos en tu zona.
        </p>
        <Link to={ctaTo}>
          <Button size="lg">{ctaText}</Button>
        </Link>
      </section>

      <footer className="border-t border-gray-200 py-6 text-center text-xs text-gray-500">
        10_Pet · Plataforma de rescate animal · Hecho con cariño en Argentina
      </footer>
    </main>
  )
}
