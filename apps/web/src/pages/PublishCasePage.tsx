import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { AxiosError } from 'axios'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import { Chip } from '../components/ui'
import ResendVerification from '../components/ResendVerification'
import LocalidadAutocomplete from '../components/cases/LocalidadAutocomplete'
import CalleAutocomplete from '../components/cases/CalleAutocomplete'
import { type Localidad, buildDireccionIntentos, isInsideBBox } from '../lib/geocoding'
import { uploadToCloudinary, type UploadedImage } from '../services/images.service'
import { createCase } from '../services/cases.service'
import { getMe } from '../services/users.service'
import { useAuthStore } from '../stores/authStore'
import { lazyWithRetry } from '../lib/lazyWithRetry'
import ErrorBoundary from '../components/ErrorBoundary'
import { ANIMAL_LABEL, ANIMAL_EMOJI, CONDITION_LABEL } from '../lib/animalType'
import { LISTING_TYPE } from '../lib/listingType'
import { WHEREABOUTS_LABEL, deriveWhereabouts } from '../lib/whereabouts'
import { useSuggestedTitle } from '../lib/useSuggestedTitle'
import type { AnimalType, AnimalCondition, AnimalSex, AnimalSize, AnimalColor, ListingType, Whereabouts } from '../types/case'

const LocationPickerMap = lazyWithRetry(() => import('../components/map/LocationPickerMap'))

type Step = 0 | 1 | 2 | 3 | 4

interface WizardState {
  listingType: ListingType | null
  images: UploadedImage[]
  lat: number | null
  lng: number | null
  locationText: string
  referenceNote: string
  animalType: AnimalType | ''
  description: string
  animalCondition: AnimalCondition | ''
  seenAt: string | null
  /** Cual chip de "cuando lo viste" esta activo; '' es ninguno */
  cuando: string
  urgencyLevel: number
  phoneContact: string
  animalSex: AnimalSex | ''
  animalSize: AnimalSize | ''
  animalColor: AnimalColor | ''
  whereabouts: Whereabouts
  hostName: string
}

const TITULO_POR_TIPO: Record<ListingType, string> = {
  found: 'Reportar animal encontrado',
  lost: 'Buscar mi mascota',
}

const URGENCY_LABELS: Record<number, string> = {
  1: 'Sin urgencia',
  2: 'Baja — estable',
  3: 'Moderada — necesita atención pronto',
  4: 'Alta — en riesgo, actuar rápido',
  5: 'Crítica — riesgo de vida / atropellado',
}

const STEPS = ['Fotos', 'Ubicación', 'Descripción', 'Contacto']

export default function PublishCasePage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)

  const [step, setStep] = useState<Step>(0)
  const [state, setState] = useState<WizardState>({
    listingType: null,
    images: [],
    lat: null,
    lng: null,
    locationText: '',
    referenceNote: '',
    animalType: '',
    description: '',
    animalCondition: '',
    seenAt: null,
    cuando: '',
    urgencyLevel: 3,
    phoneContact: '',
    animalSex: '',
    animalSize: '',
    animalColor: '',
    whereabouts: 'en_la_calle',
    hostName: '',
  })
  const { title, setTitle } = useSuggestedTitle(state.animalType, state.animalSize, state.animalCondition)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [geolocating, setGeolocating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof WizardState | 'submit', string>> & { title?: string }>({})
  const [rechecking, setRechecking] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // El store puede estar desactualizado si el usuario verifico en otra pestaña o
  // dispositivo. Preguntarle al server antes de bloquearlo por las dudas.
  const recheckVerified = useCallback(async () => {
    setRechecking(true)
    try {
      setUser(await getMe())
    } catch {
      // Si falla, se queda como estaba: el gate sigue mostrandose
    } finally {
      setRechecking(false)
    }
  }, [setUser])

  // Solo al montar: es un chequeo de entrada, no queremos re-pedirlo en cada render
  useEffect(() => {
    if (user && !user.emailVerified) void recheckVerified()
  }, [])

  const update = useCallback(<K extends keyof WizardState>(key: K, value: WizardState[K]) => {
    setState((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }, [])

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const remaining = 5 - state.images.length
    if (remaining <= 0) return
    const toUpload = Array.from(files).slice(0, remaining)
    setUploadingImages(true)
    try {
      const uploaded = await Promise.all(toUpload.map((f) => uploadToCloudinary(f, 'cases')))
      setState((prev) => ({ ...prev, images: [...prev.images, ...uploaded] }))
      setErrors((prev) => ({ ...prev, images: undefined }))
    } catch {
      setErrors((prev) => ({ ...prev, images: 'Error al subir imagen. Intentá de nuevo.' }))
    } finally {
      setUploadingImages(false)
    }
  }

  const removeImage = (idx: number) => {
    setState((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }))
  }

  const geolocate = () => {
    if (!navigator.geolocation) {
      setErrors((prev) => ({ ...prev, lat: 'Tu navegador no soporta geolocalización.' }))
      return
    }
    setGeolocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState((prev) => ({
          ...prev,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          // Sin esto el salto deja el cartel de la direccion anterior sobre el
          // pin nuevo, y el usuario lee una calle donde el pin ya no esta.
          locationText: '',
        }))
        setErrors((prev) => ({ ...prev, lat: undefined }))
        setGeolocating(false)
      },
      () => {
        setErrors((prev) => ({ ...prev, lat: 'No se pudo obtener tu ubicación. Ingresala manualmente.' }))
        setGeolocating(false)
      },
      { timeout: 10000 },
    )
  }

  const validateStep = (): boolean => {
    const newErrors: typeof errors = {}
    if (step === 1) {
      if (state.images.length === 0) {
        newErrors.images = 'Agregá al menos una foto.'
      }
    }
    if (step === 2) {
      if (state.lat === null || state.lng === null) {
        newErrors.lat = 'Necesitamos la ubicación del animal.'
      }
    }
    if (step === 3) {
      if (!state.animalType) newErrors.animalType = 'Seleccioná el tipo de animal.'
      if (state.description.trim().length < 10)
        newErrors.description = 'La descripción debe tener al menos 10 caracteres.'
      if (title.trim().length < 3) newErrors.title = 'Poné un título de al menos 3 caracteres.'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const next = () => {
    if (!validateStep()) return
    setStep((s) => Math.min(s + 1, 4) as Step)
  }

  const back = () => setStep((s) => Math.max(s - 1, 0) as Step)

  const submit = async () => {
    if (!validateStep()) return
    if (state.lat === null || state.lng === null || !state.animalType || !state.listingType) return
    const finalWhereabouts = deriveWhereabouts(state.listingType, state.whereabouts)
    setSubmitting(true)
    try {
      const newCase = await createCase({
        listingType: state.listingType,
        animalType: state.animalType,
        title: title.trim(),
        description: state.description.trim(),
        location: { lat: state.lat, lng: state.lng },
        locationText: state.locationText.trim() || undefined,
        referenceNote: state.referenceNote.trim() || undefined,
        animalCondition: state.animalCondition || undefined,
        seenAt: state.seenAt ?? undefined,
        urgencyLevel: state.urgencyLevel,
        phoneContact: state.phoneContact.trim() || undefined,
        imageIds: state.images.map((i) => i.publicId),
        animalSex: state.animalSex || undefined,
        animalSize: state.animalSize || undefined,
        animalColor: state.animalColor || undefined,
        whereabouts: finalWhereabouts,
        hostName: finalWhereabouts === 'con_un_tercero' && state.hostName.trim()
          ? state.hostName.trim()
          : undefined,
      })
      navigate(`/cases`, {
        state: { published: newCase.id, lat: state.lat, lng: state.lng },
      })
    } catch (err) {
      const axiosErr = err as AxiosError<{ error: { code?: string; message: string } }>
      const apiError = axiosErr?.response?.data?.error
      // Red de seguridad: si el gate no lo agarro (store desactualizado al entrar),
      // refrescamos el usuario y el gate se muestra en el proximo render.
      if (apiError?.code === 'EMAIL_NOT_VERIFIED') {
        void recheckVerified()
      }
      setErrors((prev) => ({
        ...prev,
        submit: apiError?.message ?? 'Error al publicar el caso. Intentá de nuevo.',
      }))
    } finally {
      setSubmitting(false)
    }
  }

  // Bloquear antes del paso 0: si lo dejamos avanzar, sube fotos a Cloudinary y
  // escribe todo para chocarse el 403 recien al final.
  if (user && !user.emailVerified) {
    return (
      <main className="flex items-center justify-center flex-1 px-4 py-10">
        <Card className="w-full max-w-md">
          <h1 className="text-2xl font-semibold mb-4">Verificá tu email para publicar</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            Te mandamos un enlace a <strong>{user.email}</strong>. Hacé clic ahí para poder
            reportar un caso.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Si no lo ves, revisá la carpeta de spam o promociones.
          </p>

          <ResendVerification defaultEmail={user.email} />

          <Button
            variant="secondary"
            fullWidth
            loading={rechecking}
            onClick={() => void recheckVerified()}
            className="mb-4"
          >
            {rechecking ? 'Comprobando…' : 'Ya verifiqué'}
          </Button>

          <Link to="/" className="text-primary-600 dark:text-primary-300 hover:underline text-sm">
            Volver al inicio
          </Link>
        </Card>
      </main>
    )
  }

  return (
    <main className="flex-1 px-4 py-8">
      <div className="max-w-xl mx-auto flex flex-col gap-6">
        {step === 0 ? (
          <StepTipo onSelect={(type) => {
            // El chip de estado del animal no se muestra para 'lost' (StepDescripcion
            // lo oculta), pero si el usuario ya lo habia elegido y vuelve a este paso
            // para cambiar a 'lost', el valor sobrevivia sin UI para verlo o limpiarlo
            // y seguia viajando en el submit y en el titulo sugerido.
            setState((prev) => ({
              ...prev,
              listingType: type,
              animalCondition: type === 'lost' ? '' : prev.animalCondition,
            }))
            setStep(1)
          }} />
        ) : (
          <>
            <div>
              <h1 className="text-2xl font-semibold">
                {TITULO_POR_TIPO[state.listingType ?? 'found']}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Paso {step} de 4 — {STEPS[step - 1]}</p>
            </div>

            <StepIndicator current={step} />

            {step === 1 && (
              <StepFotos
                images={state.images}
                uploading={uploadingImages}
                error={errors.images}
                fileInputRef={fileInputRef}
                onFiles={handleFiles}
                onRemove={removeImage}
              />
            )}

            {step === 2 && (
              <StepUbicacion
                lat={state.lat}
                lng={state.lng}
                locationText={state.locationText}
                referenceNote={state.referenceNote}
                geolocating={geolocating}
                error={errors.lat}
                cuando={state.cuando}
                onGeolocate={geolocate}
                onLatChange={(v) => update('lat', v)}
                onLngChange={(v) => update('lng', v)}
                onLocationTextChange={(v) => update('locationText', v)}
                onReferenceNoteChange={(v) => update('referenceNote', v)}
                onCuandoChange={(id, seenAt) => {
                  update('cuando', id)
                  update('seenAt', seenAt)
                }}
                onSeenAtChange={(v) => update('seenAt', v)}
              />
            )}

            {step === 3 && (
              <StepDescripcion
                listingType={state.listingType ?? 'found'}
                animalType={state.animalType}
                description={state.description}
                title={title}
                animalCondition={state.animalCondition}
                urgencyLevel={state.urgencyLevel}
                animalSex={state.animalSex}
                animalSize={state.animalSize}
                animalColor={state.animalColor}
                whereabouts={state.whereabouts}
                hostName={state.hostName}
                errors={{ animalType: errors.animalType, description: errors.description, title: errors.title }}
                onAnimalTypeChange={(v) => update('animalType', v)}
                onDescriptionChange={(v) => update('description', v)}
                onTitleChange={setTitle}
                onAnimalConditionChange={(v) => update('animalCondition', v)}
                onUrgencyChange={(v) => update('urgencyLevel', v)}
                onAnimalSexChange={(v) => update('animalSex', v)}
                onAnimalSizeChange={(v) => update('animalSize', v)}
                onAnimalColorChange={(v) => update('animalColor', v)}
                onWhereaboutsChange={(v) => update('whereabouts', v)}
                onHostNameChange={(v) => update('hostName', v)}
              />
            )}

            {step === 4 && (
              <StepContacto
                phoneContact={state.phoneContact}
                onPhoneChange={(v) => update('phoneContact', v)}
                title={title}
                summary={state}
              />
            )}

            {errors.submit && (
              <p className="text-sm text-red-600 dark:text-red-300 text-center">{errors.submit}</p>
            )}

            <div className="flex gap-3">
              <Button variant="secondary" onClick={back} disabled={submitting}>
                Atrás
              </Button>
              <div className="flex-1" />
              {step < 4 ? (
                <Button onClick={next} disabled={uploadingImages}>
                  Siguiente
                </Button>
              ) : (
                <Button onClick={submit} loading={submitting}>
                  Publicar caso
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  )
}

function StepTipo({ onSelect }: { onSelect: (type: ListingType) => void }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Reportar caso</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">¿Qué querés publicar?</p>
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={() => onSelect('found')}
          className="flex items-start gap-4 p-5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-orange-400 hover:bg-orange-50 active:bg-orange-100 transition-colors text-left group"
        >
          <span className="text-3xl mt-0.5">🐾</span>
          <div>
            <p className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-orange-700">
              Me crucé con un animal
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Lo encontraste, lo viste en la calle o está en riesgo. Después nos decís si te lo llevaste.
            </p>
          </div>
        </button>

        <button
          onClick={() => onSelect('lost')}
          className="flex items-start gap-4 p-5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-400 hover:bg-blue-50 active:bg-blue-100 transition-colors text-left group"
        >
          <span className="text-3xl mt-0.5">🔍</span>
          <div>
            <p className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-700">
              Busco mi mascota
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Se te perdió o escapó tu animal y estás buscando que alguien te avise si lo ve.
            </p>
          </div>
        </button>
      </div>
    </div>
  )
}

function StepIndicator({ current }: { current: Step }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((label, i) => {
        const n = (i + 1) as Step
        const done = n < current
        const active = n === current
        return (
          <div key={label} className="flex items-center flex-1">
            <div className={[
              'flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold shrink-0',
              done ? 'bg-primary-600 text-white' : active ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 ring-2 ring-primary-500' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
            ].join(' ')}>
              {done ? '✓' : n}
            </div>
            {i < STEPS.length - 1 && (
              <div className={['flex-1 h-0.5 mx-1', done ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'].join(' ')} />
            )}
          </div>
        )
      })}
    </div>
  )
}

interface StepFotosProps {
  images: UploadedImage[]
  uploading: boolean
  error?: string
  fileInputRef: React.RefObject<HTMLInputElement>
  onFiles: (f: FileList | null) => void
  onRemove: (i: number) => void
}

function StepFotos({ images, uploading, error, fileInputRef, onFiles, onRemove }: StepFotosProps) {
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    onFiles(e.dataTransfer.files)
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Agregá fotos del animal (hasta 5). Una buena foto aumenta las chances de que alguien ayude.
      </p>

      {images.length === 0 ? (
        <div
          className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-primary-400 transition-colors"
          onClick={() => fileInputRef.current?.click()}
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          {uploading ? (
            <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <span className="text-3xl">📷</span>
              <span className="text-sm text-gray-500 dark:text-gray-400 text-center">Hacé clic o arrastrá fotos aquí</span>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {images.map((img, i) => (
            <div key={img.publicId} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
              <img src={img.secureUrl} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
              <button
                onClick={() => onRemove(i)}
                className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-black/70"
                aria-label="Eliminar foto"
              >
                ×
              </button>
            </div>
          ))}
          {images.length < 5 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
              className="aspect-square rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-primary-400 flex flex-col items-center justify-center gap-1 transition-colors"
            >
              {uploading ? (
                <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span className="text-xl leading-none text-gray-500 dark:text-gray-400">+</span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">Agregar</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />

      {error && <p className="text-xs text-red-600 dark:text-red-300">{error}</p>}
    </div>
  )
}

interface StepUbicacionProps {
  lat: number | null
  lng: number | null
  locationText: string
  referenceNote: string
  geolocating: boolean
  error?: string
  cuando: string
  onGeolocate: () => void
  onLatChange: (v: number | null) => void
  onLngChange: (v: number | null) => void
  onLocationTextChange: (v: string) => void
  onReferenceNoteChange: (v: string) => void
  onCuandoChange: (id: string, seenAt: string | null) => void
  onSeenAtChange: (v: string | null) => void
}

const CUANDO_OPCIONES: { id: string; label: string; minutos: number }[] = [
  { id: 'ahora', label: 'Ahora mismo', minutos: 0 },
  { id: 'hora', label: 'Hace menos de 1 hora', minutos: 30 },
  { id: 'hoy', label: 'Hoy más temprano', minutos: 5 * 60 },
  { id: 'ayer', label: 'Ayer', minutos: 24 * 60 },
]

function fechaDeChip(minutos: number): string {
  return new Date(Date.now() - minutos * 60_000).toISOString()
}

// El input date da 'YYYY-MM-DD'. Se ancla al mediodia local: a las 00:00 el
// pasaje a UTC puede correr la fecha al dia anterior segun la zona.
function fechaDeInput(valor: string): string {
  const [a, m, d] = valor.split('-').map(Number)
  return new Date(a, m - 1, d, 12, 0, 0).toISOString()
}

function StepUbicacion({
  lat, lng, locationText, referenceNote, geolocating, error, cuando,
  onGeolocate, onLatChange, onLngChange, onLocationTextChange, onReferenceNoteChange,
  onCuandoChange, onSeenAtChange,
}: StepUbicacionProps) {
  const [showForm, setShowForm] = useState(false)
  // Dos cosas distintas: lo que se ve escrito y el ancla elegida de la lista.
  // El ancla es la que trae el boundingbox, y sin ella no se busca ninguna calle.
  const [localidadText, setLocalidadText] = useState('')
  const [localidad, setLocalidad] = useState<Localidad | null>(null)
  const [calle, setCalle] = useState('')
  const [numero, setNumero] = useState('')
  const [geocoding, setGeocoding] = useState(false)
  // Lo que la busqueda no pudo hacer. Sin esto el fracaso es mudo: el usuario
  // escribe la direccion, no pasa nada, y no hay forma de saber si el wizard
  // esta pensando, si fallo o si la calle se llama distinto en el mapa.
  const [avisoDireccion, setAvisoDireccion] = useState<string | null>(null)
  const [reverseGeocoding, setReverseGeocoding] = useState(false)
  const reverseDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Solo resolvemos la direccion cuando la escribio una persona. Sin esta marca
  // se cierra un lazo: arrastro el pin, el reverse completa la calle, la
  // resolucion ve una calle nueva y devuelve el pin al centro de esa calle,
  // deshaciendo el arrastre delante del usuario.
  const edicionManualRef = useRef(false)

  useEffect(() => {
    if (error) setShowForm(true)
  }, [error])

  // Resuelve sola: el usuario no tiene que apretar nada. El numero es una pista
  // y su ausencia nunca es un error: en el interior OSM casi no tiene numeros
  // de casa, asi que caer a la calle es el caso normal, no el degradado.
  useEffect(() => {
    if (!localidad || !calle.trim() || !edicionManualRef.current) return
    const controller = new AbortController()
    const t = setTimeout(async () => {
      setGeocoding(true)
      setAvisoDireccion(null)
      try {
        // De la busqueda mas precisa a la mas tolerante. Se corta en la primera
        // que aterrice dentro de la caja de la localidad.
        for (const intento of buildDireccionIntentos(calle, numero, localidad)) {
          const res = await fetch(intento.url, {
            headers: { 'Accept-Language': 'es' },
            signal: controller.signal,
          })
          if (!res.ok) continue
          const data: Array<{ lat: string; lon: string }> = await res.json()
          if (!data.length) continue
          const hitLat = parseFloat(data[0].lat)
          const hitLng = parseFloat(data[0].lon)
          // bounded=1 ya lo garantiza del lado del server; el chequeo es el cinturon
          // por si Nominatim cambia de opinion sobre que significa acotado.
          if (!isInsideBBox(hitLat, hitLng, localidad.bbox)) continue
          onLatChange(hitLat)
          onLngChange(hitLng)
          onLocationTextChange(
            intento.conNumero
              ? `${calle.trim()} ${numero.trim()}, ${localidad.name}`
              : `${calle.trim()}, ${localidad.name}`,
          )
          // Acerto la calle pero no la altura: el pin quedo en el medio de la
          // calle, que puede tener veinte cuadras. Decirlo es la diferencia
          // entre un pin aproximado y un pin equivocado.
          if (numero.trim() && !intento.conNumero) {
            setAvisoDireccion('No encontramos esa altura. El pin quedó sobre la calle: arrastralo hasta la cuadra.')
          }
          return
        }
        setAvisoDireccion('No encontramos esa dirección. Elegí la calle de la lista de sugerencias, o arrastrá el pin en el mapa.')
      } catch {
        // Un abort es el usuario escribiendo la letra siguiente, no un fallo.
        if (!controller.signal.aborted) {
          setAvisoDireccion('No pudimos buscar la dirección. Revisá la conexión, o arrastrá el pin en el mapa.')
        }
      } finally {
        setGeocoding(false)
      }
    }, 500)
    return () => { clearTimeout(t); controller.abort() }
  }, [calle, numero, localidad])

  // Si el texto deja de coincidir con la localidad elegida, el ancla se suelta.
  // Sin esto se puede escribir "Junin" sobre un ancla de Pehuajo y publicar un
  // caso que dice Junin con las coordenadas y el bbox del otro pueblo.
  const handleLocalidadText = (v: string) => {
    setLocalidadText(v)
    if (localidad && v !== localidad.name) setLocalidad(null)
  }

  const handleMapChange = (newLat: number, newLng: number) => {
    onLatChange(newLat)
    onLngChange(newLng)
    // El usuario acaba de resolverlo a mano: el aviso ya no aplica.
    setAvisoDireccion(null)
    if (reverseDebounceRef.current) clearTimeout(reverseDebounceRef.current)
    reverseDebounceRef.current = setTimeout(async () => {
      setReverseGeocoding(true)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${newLat}&lon=${newLng}&format=json&accept-language=es`,
          { headers: { 'User-Agent': '10pet-web/1.0' } },
        )
        const data: { address?: Record<string, string>; display_name?: string } = await res.json()
        if (data.address) {
          const a = data.address
          const road = a.road ?? a.pedestrian ?? a.path ?? a.footway ?? ''
          const num = a.house_number ?? ''
          const city = a.town ?? a.city ?? a.village ?? a.municipality ?? a.county ?? ''
          edicionManualRef.current = false
          if (road) setCalle(road)
          if (num) setNumero(num)
          // La localidad NO se pisa: el ancla la eligio el usuario de una lista
          // y su bbox es lo que mantiene acotadas las busquedas de calle.
          if (road || city) setShowForm(true)
          const label = road
            ? `${road}${num ? ' ' + num : ''}${city ? ', ' + city : ''}`
            : (data.display_name?.split(',').slice(0, 2).join(',').trim() ?? '')
          if (label) onLocationTextChange(label)
        } else if (data.display_name) {
          onLocationTextChange(data.display_name.split(',').slice(0, 2).join(',').trim())
        }
      } catch { /* ignorar, usuario puede escribir manualmente */ }
      finally { setReverseGeocoding(false) }
    }, 400)
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-600 dark:text-gray-300">
        ¿Dónde viste al animal? Usá tu ubicación, ingresá la dirección o tocá el mapa.
      </p>

      {lat === null ? (
        <Button variant="primary" onClick={onGeolocate} loading={geolocating} fullWidth>
          Usar mi ubicación actual
        </Button>
      ) : (
        /*
         * Con ubicacion ya marcada esto es un estado, no una accion. Cuando era
         * un boton entero seguia llamando a onGeolocate: un toque descartaba el
         * pin ajustado y lo mandaba a donde diga la IP —en una PC, el centro del
         * pueblo—. Volver a geolocalizar sigue estando, pero hay que buscarlo.
         */
        <div className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2">
          <span className="text-sm text-gray-700 dark:text-gray-200">Ubicación marcada ✓</span>
          <button
            type="button"
            onClick={onGeolocate}
            disabled={geolocating}
            className="shrink-0 text-xs text-primary-600 dark:text-primary-300 hover:underline disabled:opacity-60"
          >
            {geolocating ? 'Buscando...' : 'Usar mi ubicación actual'}
          </button>
        </div>
      )}

      {error && <p className="text-xs text-red-600 dark:text-red-300">{error}</p>}

      {!showForm && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="text-sm text-primary-600 dark:text-primary-300 hover:underline text-center"
        >
          Ingresar dirección manualmente
        </button>
      )}

      {showForm && (
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Localidad *</label>
          <LocalidadAutocomplete
            value={localidadText}
            onChange={handleLocalidadText}
            onSelect={(loc) => {
              edicionManualRef.current = true
              setLocalidad(loc)
              setLocalidadText(loc.name)
              // El pin arranca en el centro de la localidad. Nunca hay un estado
              // sin mapa: peor caso, el usuario lo arrastra hasta la cuadra.
              if (lat === null) { onLatChange(loc.lat); onLngChange(loc.lng) }
            }}
          />
        </div>

        <div className="flex gap-2">
          <div className="flex-1 min-w-0">
            <CalleAutocomplete
              label="Calle"
              placeholder="Av. San Martin"
              value={calle}
              onChange={(v) => { edicionManualRef.current = true; setCalle(v) }}
              localidad={localidad}
            />
          </div>
          <div className="w-24 shrink-0">
            <Input
              label="Número (opcional)"
              placeholder="1234"
              value={numero}
              onChange={(e) => { edicionManualRef.current = true; setNumero(e.target.value) }}
            />
          </div>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          Marcá la cuadra, no hace falta que sea exacto. Después ajustá el pin en el mapa.
        </p>
      </div>
      )}

      {lat !== null && lng !== null && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              o ajustá el pin en el mapa
            </span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          </div>

          <ErrorBoundary fallback={
            <div className="h-[220px] rounded-xl bg-gray-100 dark:bg-gray-700 flex flex-col items-center justify-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
              <span>No se pudo cargar el mapa.</span>
              <button type="button" className="text-primary-600 dark:text-primary-300 underline text-xs" onClick={() => window.location.reload()}>Recargar página</button>
            </div>
          }>
            <Suspense fallback={<div className="h-[220px] rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">Cargando mapa...</div>}>
              <LocationPickerMap lat={lat} lng={lng} onChange={handleMapChange} />
            </Suspense>
          </ErrorBoundary>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Arrastrá el pin hasta donde viste al animal
          </p>
        </div>
      )}

      <div className="relative">
        {(reverseGeocoding || geocoding) && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
            <span className="inline-block w-3 h-3 border border-gray-400 dark:border-gray-500 border-t-transparent rounded-full animate-spin" />
            Buscando dirección...
          </p>
        )}
        {!reverseGeocoding && !geocoding && locationText && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            Dirección detectada: <span className="font-medium">{locationText}</span>
          </p>
        )}
        {!reverseGeocoding && !geocoding && avisoDireccion && (
          <p className="text-xs text-amber-700 dark:text-amber-300 mb-1">{avisoDireccion}</p>
        )}
        <Input
          label="Referencia (opcional)"
          placeholder="Ej: entre Sarmiento y Rivadavia, frente al supermercado"
          value={referenceNote}
          onChange={(e) => onReferenceNoteChange(e.target.value)}
          hint="Una pista para encontrarlo. Se muestra en la ficha, junto a la dirección."
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">¿Cuándo lo viste?</label>
        <div className="flex flex-wrap gap-2">
          {CUANDO_OPCIONES.map((o) => (
            <Chip key={o.id} active={cuando === o.id} onClick={() => onCuandoChange(o.id, fechaDeChip(o.minutos))}>
              {o.label}
            </Chip>
          ))}
          <Chip active={cuando === 'otra'} onClick={() => onCuandoChange('otra', null)}>
            Otra fecha
          </Chip>
        </div>
        {cuando === 'otra' && (
          <input
            type="date"
            max={new Date().toISOString().slice(0, 10)}
            min={new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString().slice(0, 10)}
            className="mt-2 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-base"
            onChange={(e) => onSeenAtChange(e.target.value ? fechaDeInput(e.target.value) : null)}
          />
        )}
      </div>
    </div>
  )
}

const SEX_OPTIONS: { value: AnimalSex; label: string }[] = [
  { value: 'macho', label: 'Macho' },
  { value: 'hembra', label: 'Hembra' },
  { value: 'desconocido', label: 'No se' },
]

const SIZE_OPTIONS: { value: AnimalSize; label: string }[] = [
  { value: 'chico', label: 'Chico' },
  { value: 'mediano', label: 'Mediano' },
  { value: 'grande', label: 'Grande' },
]

const COLOR_OPTIONS: { value: AnimalColor; label: string; hex: string; border?: boolean }[] = [
  { value: 'negro', label: 'Negro', hex: '#1f2937' },
  { value: 'blanco', label: 'Blanco', hex: '#f9fafb', border: true },
  { value: 'marron', label: 'Marron', hex: '#92400e' },
  { value: 'gris', label: 'Gris', hex: '#9ca3af' },
  { value: 'dorado', label: 'Dorado', hex: '#d97706' },
  { value: 'manchado', label: 'Manchado', hex: '#6366f1' },
  { value: 'tricolor', label: 'Tricolor', hex: '#10b981' },
]

interface StepDescripcionProps {
  listingType: ListingType
  animalType: AnimalType | ''
  description: string
  title: string
  animalCondition: AnimalCondition | ''
  urgencyLevel: number
  animalSex: AnimalSex | ''
  animalSize: AnimalSize | ''
  animalColor: AnimalColor | ''
  whereabouts: Whereabouts
  hostName: string
  errors: { animalType?: string; description?: string; title?: string }
  onAnimalTypeChange: (v: AnimalType | '') => void
  onDescriptionChange: (v: string) => void
  onTitleChange: (v: string) => void
  onAnimalConditionChange: (v: AnimalCondition | '') => void
  onUrgencyChange: (v: number) => void
  onAnimalSexChange: (v: AnimalSex | '') => void
  onAnimalSizeChange: (v: AnimalSize | '') => void
  onAnimalColorChange: (v: AnimalColor | '') => void
  onWhereaboutsChange: (v: Whereabouts) => void
  onHostNameChange: (v: string) => void
}

function StepDescripcion({
  listingType, animalType, description, title, animalCondition, urgencyLevel,
  animalSex, animalSize, animalColor, whereabouts, hostName, errors,
  onAnimalTypeChange, onDescriptionChange, onTitleChange, onAnimalConditionChange, onUrgencyChange,
  onAnimalSexChange, onAnimalSizeChange, onAnimalColorChange, onWhereaboutsChange, onHostNameChange,
}: StepDescripcionProps) {
  const [showDetails, setShowDetails] = useState(false)
  const hasDetails = animalSex !== '' || animalSize !== '' || animalColor !== ''

  const descPlaceholder = listingType === 'lost'
    ? 'Contá cómo es: color, tamaño, collar, señas particulares...'
    : 'Describí la situación: dónde está, cómo está, si tiene collar, etc.'

  const detailChip = (active: boolean) => [
    'px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors',
    active
      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600',
  ].join(' ')

  return (
    <div className="flex flex-col gap-4">
      <Input
        label="Título"
        value={title}
        maxLength={120}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="Ej: Perro mediano, herido"
        error={errors.title}
      />
      <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
        Lo completamos con lo que elegís. Podés reescribirlo.
      </p>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Tipo de animal *</span>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(ANIMAL_LABEL) as AnimalType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onAnimalTypeChange(type)}
              className={[
                'py-2 rounded-lg border text-sm font-medium transition-colors',
                animalType === type
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600',
              ].join(' ')}
            >
              {ANIMAL_EMOJI[type]} {ANIMAL_LABEL[type]}
            </button>
          ))}
        </div>
        {errors.animalType && <p className="text-xs text-red-600 dark:text-red-300">{errors.animalType}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Descripción *</label>
        <textarea
          rows={4}
          placeholder={descPlaceholder}
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          className={[
            'rounded-md border px-3 py-2 text-sm placeholder-gray-400 dark:placeholder-gray-500 resize-none',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            errors.description
              ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
              : 'border-gray-300 dark:border-gray-600 focus:border-primary-500 focus:ring-primary-200',
          ].join(' ')}
        />
        {errors.description && <p className="text-xs text-red-600 dark:text-red-300">{errors.description}</p>}
      </div>

      {listingType !== 'lost' && (
        <div>
          <label className="block text-sm font-medium mb-2">Estado del animal (opcional)</label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(CONDITION_LABEL) as AnimalCondition[]).map((c) => (
              <Chip key={c} active={animalCondition === c} onClick={() => onAnimalConditionChange(animalCondition === c ? '' : c)}>
                {CONDITION_LABEL[c]}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {listingType === 'found' && (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
            ¿Dónde está el animal ahora?
          </label>
          <div className="flex flex-col gap-2">
            {(['en_la_calle', 'con_quien_publica', 'con_un_tercero'] as const).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => onWhereaboutsChange(w)}
                className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                  whereabouts === w
                    ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/30 text-primary-800 dark:text-primary-200'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {WHEREABOUTS_LABEL[w]}
              </button>
            ))}
          </div>
          {whereabouts === 'con_un_tercero' && (
            <Input
              label="¿Quién lo tiene?"
              placeholder="Nombre de quien lo aloja"
              value={hostName}
              onChange={(e) => onHostNameChange(e.target.value)}
            />
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400">
            El mapa siempre marca dónde lo viste, nunca dónde vivís.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
          Urgencia: <span className="text-primary-600 dark:text-primary-300">{urgencyLevel}/5 — {URGENCY_LABELS[urgencyLevel]}</span>
        </label>
        <input
          type="range"
          min={1}
          max={5}
          value={urgencyLevel}
          onChange={(e) => onUrgencyChange(parseInt(e.target.value))}
          className="w-full accent-primary-600"
        />
      </div>

      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setShowDetails((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <span className="flex items-center gap-2">
            Mas detalles del animal (opcional)
            {hasDetails && (
              <span className="w-2 h-2 rounded-full bg-primary-500 inline-block" />
            )}
          </span>
          <svg
            className={['w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform', showDetails || hasDetails ? 'rotate-180' : ''].join(' ')}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {(showDetails || hasDetails) && (
          <div className="px-4 py-4 flex flex-col gap-4 border-t border-gray-100 dark:border-gray-700">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Sexo</span>
              <div className="flex gap-2">
                {SEX_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => onAnimalSexChange(animalSex === o.value ? '' : o.value)}
                    className={detailChip(animalSex === o.value)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Tamaño</span>
              <div className="flex gap-2">
                {SIZE_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => onAnimalSizeChange(animalSize === o.value ? '' : o.value)}
                    className={detailChip(animalSize === o.value)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-300">Color predominante</span>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => onAnimalColorChange(animalColor === o.value ? '' : o.value)}
                    className={detailChip(animalColor === o.value)}
                  >
                    <span className="flex items-center gap-1.5">
                      <span
                        className={['w-3 h-3 rounded-full inline-block flex-shrink-0', o.border ? 'border border-gray-300 dark:border-gray-600' : ''].join(' ')}
                        style={{ background: o.hex }}
                      />
                      {o.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface StepContactoProps {
  phoneContact: string
  onPhoneChange: (v: string) => void
  title: string
  summary: WizardState
}

function StepContacto({ phoneContact, onPhoneChange, title, summary }: StepContactoProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-sm flex flex-col gap-1">
        <p className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">{title}</p>
        <p><span className="font-medium">Tipo:</span> {LISTING_TYPE[summary.listingType ?? 'found'].long}</p>
        <p><span className="font-medium">Animal:</span> {summary.animalType ? `${ANIMAL_EMOJI[summary.animalType as AnimalType]} ${ANIMAL_LABEL[summary.animalType as AnimalType]}` : '—'}</p>
        <p><span className="font-medium">Ubicación:</span> {summary.locationText || 'Sin dirección exacta'}</p>
        {summary.referenceNote.trim() && (
          <p><span className="font-medium">Referencia:</span> {summary.referenceNote.trim()}</p>
        )}
        <p><span className="font-medium">Fotos:</span> {summary.images.length}</p>
        <p><span className="font-medium">Urgencia:</span> {summary.urgencyLevel}/5</p>
      </div>

      <Input
        label="Teléfono de contacto (opcional)"
        type="tel"
        placeholder="Ej: +54 9 11 1234-5678"
        value={phoneContact}
        onChange={(e) => onPhoneChange(e.target.value)}
        hint="Solo visible para voluntarios que se ofrezcan a ayudar."
      />

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Al publicar aceptás nuestros términos de uso. El caso será visible en el mapa para toda la comunidad.
      </p>
    </div>
  )
}
