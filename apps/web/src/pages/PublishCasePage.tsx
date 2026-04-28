import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { uploadToCloudinary, type UploadedImage } from '../services/images.service'
import { createCase } from '../services/cases.service'
import { lazyWithRetry } from '../lib/lazyWithRetry'
import type { AnimalType } from '../types/case'

const LocationPickerMap = lazyWithRetry(() => import('../components/map/LocationPickerMap'))

type Step = 1 | 2 | 3 | 4

interface WizardState {
  images: UploadedImage[]
  lat: number | null
  lng: number | null
  locationText: string
  animalType: AnimalType | ''
  description: string
  condition: string
  urgencyLevel: number
  phoneContact: string
}

const ANIMAL_LABELS: Record<AnimalType, string> = {
  perro: 'Perro',
  gato: 'Gato',
  otro: 'Otro',
}

const URGENCY_LABELS: Record<number, string> = {
  1: 'Muy baja',
  2: 'Baja',
  3: 'Moderada',
  4: 'Alta',
  5: 'Urgente',
}

const STEPS = ['Fotos', 'Ubicacion', 'Descripcion', 'Contacto']

export default function PublishCasePage() {
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>(1)
  const [state, setState] = useState<WizardState>({
    images: [],
    lat: null,
    lng: null,
    locationText: '',
    animalType: '',
    description: '',
    condition: '',
    urgencyLevel: 3,
    phoneContact: '',
  })
  const [uploadingImages, setUploadingImages] = useState(false)
  const [geolocating, setGeolocating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof WizardState | 'submit', string>>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const next = () => {
    if (!validateStep()) return
    setStep((s) => Math.min(s + 1, 4) as Step)
  }

  const back = () => setStep((s) => Math.max(s - 1, 1) as Step)

  const submit = async () => {
    if (!validateStep()) return
    if (state.lat === null || state.lng === null || !state.animalType) return
    setSubmitting(true)
    try {
      const newCase = await createCase({
        animalType: state.animalType,
        description: state.description.trim(),
        location: { lat: state.lat, lng: state.lng },
        locationText: state.locationText.trim() || undefined,
        condition: state.condition.trim() || undefined,
        urgencyLevel: state.urgencyLevel,
        phoneContact: state.phoneContact.trim() || undefined,
        imageIds: state.images.map((i) => i.publicId),
      })
      navigate(`/cases`, {
        state: { published: newCase.id, lat: state.lat, lng: state.lng },
      })
    } catch {
      setErrors((prev) => ({ ...prev, submit: 'Error al publicar el caso. Intentá de nuevo.' }))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="flex-1 px-4 py-8">
      <div className="max-w-xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Reportar animal</h1>
          <p className="text-sm text-gray-500 mt-1">Paso {step} de 4 — {STEPS[step - 1]}</p>
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
            geolocating={geolocating}
            error={errors.lat}
            onGeolocate={geolocate}
            onLatChange={(v) => update('lat', v)}
            onLngChange={(v) => update('lng', v)}
            onLocationTextChange={(v) => update('locationText', v)}
          />
        )}

        {step === 3 && (
          <StepDescripcion
            animalType={state.animalType}
            description={state.description}
            condition={state.condition}
            urgencyLevel={state.urgencyLevel}
            errors={{ animalType: errors.animalType, description: errors.description }}
            onAnimalTypeChange={(v) => update('animalType', v)}
            onDescriptionChange={(v) => update('description', v)}
            onConditionChange={(v) => update('condition', v)}
            onUrgencyChange={(v) => update('urgencyLevel', v)}
          />
        )}

        {step === 4 && (
          <StepContacto
            phoneContact={state.phoneContact}
            onPhoneChange={(v) => update('phoneContact', v)}
            summary={state}
          />
        )}

        {errors.submit && (
          <p className="text-sm text-red-600 text-center">{errors.submit}</p>
        )}

        <div className="flex gap-3">
          {step > 1 && (
            <Button variant="secondary" onClick={back} disabled={submitting}>
              Atras
            </Button>
          )}
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
      </div>
    </main>
  )
}

function StepIndicator({ current }: { current: Step }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((label, i) => {
        const n = i + 1
        const done = n < current
        const active = n === current
        return (
          <div key={label} className="flex items-center flex-1">
            <div className={[
              'flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold shrink-0',
              done ? 'bg-primary-600 text-white' : active ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-500' : 'bg-gray-100 text-gray-400',
            ].join(' ')}>
              {done ? '✓' : n}
            </div>
            {i < STEPS.length - 1 && (
              <div className={['flex-1 h-0.5 mx-1', done ? 'bg-primary-600' : 'bg-gray-200'].join(' ')} />
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
      <p className="text-sm text-gray-600">
        Agregá fotos del animal (hasta 5). Una buena foto aumenta las chances de que alguien ayude.
      </p>

      {images.length < 5 && (
        <div
          className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-primary-400 transition-colors"
          onClick={() => fileInputRef.current?.click()}
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          {uploading ? (
            <span className="text-sm text-gray-500">Subiendo...</span>
          ) : (
            <>
              <span className="text-3xl">📷</span>
              <span className="text-sm text-gray-500 text-center">
                Hacé clic o arrastrá fotos aquí
              </span>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => onFiles(e.target.files)}
          />
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((img, i) => (
            <div key={img.publicId} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
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
        </div>
      )}
    </div>
  )
}

interface StepUbicacionProps {
  lat: number | null
  lng: number | null
  locationText: string
  geolocating: boolean
  error?: string
  onGeolocate: () => void
  onLatChange: (v: number | null) => void
  onLngChange: (v: number | null) => void
  onLocationTextChange: (v: string) => void
}

type AddressMode = 'numero' | 'interseccion'

function StepUbicacion({
  lat, lng, locationText, geolocating, error,
  onGeolocate, onLatChange, onLngChange, onLocationTextChange,
}: StepUbicacionProps) {
  const [showForm, setShowForm] = useState(false)
  const [localidad, setLocalidad] = useState('')
  const [addressMode, setAddressMode] = useState<AddressMode>('numero')
  const [calle, setCalle] = useState('')
  const [numero, setNumero] = useState('')
  const [calle2, setCalle2] = useState('')
  const [geocoding, setGeocoding] = useState(false)
  const [geocodeError, setGeocodeError] = useState<string | null>(null)

  useEffect(() => {
    if (error) setShowForm(true)
  }, [error])

  const handleGeocode = async () => {
    if (!localidad.trim()) {
      setGeocodeError('Ingresá la localidad.')
      return
    }
    const callesPart = addressMode === 'numero'
      ? `${calle.trim()} ${numero.trim()}`
      : `${calle.trim()} esq. ${calle2.trim()}`
    const query = `${callesPart}, ${localidad.trim()}, Argentina`
    setGeocoding(true)
    setGeocodeError(null)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=ar`,
        { headers: { 'Accept-Language': 'es', 'User-Agent': '10pet-web/1.0' } },
      )
      const data: Array<{ lat: string; lon: string; display_name: string }> = await res.json()
      if (data.length === 0) {
        setGeocodeError('No encontramos esa dirección. Revisá los datos o usá el mapa.')
        return
      }
      const r = data[0]
      onLatChange(parseFloat(r.lat))
      onLngChange(parseFloat(r.lon))
      const label = addressMode === 'numero'
        ? `${calle.trim()} ${numero.trim()}, ${localidad.trim()}`
        : `${calle.trim()} y ${calle2.trim()}, ${localidad.trim()}`
      onLocationTextChange(label)
    } catch {
      setGeocodeError('Error al buscar la dirección. Intentá de nuevo.')
    } finally {
      setGeocoding(false)
    }
  }

  const handleMapChange = (newLat: number, newLng: number) => {
    onLatChange(newLat)
    onLngChange(newLng)
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-600">
        ¿Dónde está el animal? Usá tu ubicación, ingresá la dirección o tocá el mapa.
      </p>

      {/* Opcion 1: GPS */}
      <Button
        variant={lat !== null && !geocoding ? 'secondary' : 'primary'}
        onClick={onGeolocate}
        loading={geolocating}
        fullWidth
      >
        {lat !== null ? 'Ubicacion GPS obtenida ✓' : 'Usar mi ubicacion actual'}
      </Button>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {!showForm && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="text-sm text-primary-600 hover:underline text-center"
        >
          Ingresar dirección manualmente
        </button>
      )}

      {showForm && (
      <div className="flex flex-col gap-3">
        <Input
          label="Localidad *"
          placeholder="Ej: Pergamino, Tandil, Azul"
          value={localidad}
          onChange={(e) => setLocalidad(e.target.value)}
        />

        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setAddressMode('numero')}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${addressMode === 'numero' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            Calle y numero
          </button>
          <button
            type="button"
            onClick={() => setAddressMode('interseccion')}
            className={`flex-1 py-2 text-xs font-medium transition-colors border-l border-gray-200 ${addressMode === 'interseccion' ? 'bg-primary-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            Interseccion
          </button>
        </div>

        {addressMode === 'numero' ? (
          <div className="flex gap-2">
            <div className="flex-1 min-w-0">
              <Input
                label="Calle"
                placeholder="Av. San Martin"
                value={calle}
                onChange={(e) => setCalle(e.target.value)}
              />
            </div>
            <div className="w-24 shrink-0">
              <Input
                label="Numero"
                placeholder="1234"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
              />
            </div>
          </div>
        ) : (
          <div className="flex gap-2 items-end">
            <div className="flex-1 min-w-0">
              <Input
                label="Calle 1"
                placeholder="San Martin"
                value={calle}
                onChange={(e) => setCalle(e.target.value)}
              />
            </div>
            <span className="pb-2.5 text-sm text-gray-400 shrink-0">y</span>
            <div className="flex-1 min-w-0">
              <Input
                label="Calle 2"
                placeholder="Belgrano"
                value={calle2}
                onChange={(e) => setCalle2(e.target.value)}
              />
            </div>
          </div>
        )}

        {geocodeError && <p className="text-xs text-red-600">{geocodeError}</p>}

        <Button
          variant="secondary"
          onClick={handleGeocode}
          loading={geocoding}
          disabled={!localidad.trim()}
          fullWidth
        >
          Buscar direccion
        </Button>
      </div>
      )}

      {/* Mapa picker — aparece cuando hay coordenadas */}
      {lat !== null && lng !== null && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">o ajusta el pin en el mapa</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <Suspense fallback={<div className="h-[220px] rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 text-sm">Cargando mapa...</div>}>
            <LocationPickerMap lat={lat} lng={lng} onChange={handleMapChange} />
          </Suspense>
          <p className="text-xs text-gray-500 text-center">
            Toca o arrastra el pin para ajustar la posicion exacta
          </p>
        </div>
      )}

      <Input
        label="Referencia (opcional)"
        placeholder="Ej: cerca de la plaza, frente al supermercado"
        value={locationText}
        onChange={(e) => onLocationTextChange(e.target.value)}
        hint="Se muestra en la ficha del caso."
      />
    </div>
  )
}

interface StepDescripcionProps {
  animalType: AnimalType | ''
  description: string
  condition: string
  urgencyLevel: number
  errors: { animalType?: string; description?: string }
  onAnimalTypeChange: (v: AnimalType | '') => void
  onDescriptionChange: (v: string) => void
  onConditionChange: (v: string) => void
  onUrgencyChange: (v: number) => void
}

function StepDescripcion({
  animalType, description, condition, urgencyLevel, errors,
  onAnimalTypeChange, onDescriptionChange, onConditionChange, onUrgencyChange,
}: StepDescripcionProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-gray-700">Tipo de animal *</span>
        <div className="flex gap-2">
          {(Object.keys(ANIMAL_LABELS) as AnimalType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onAnimalTypeChange(type)}
              className={[
                'flex-1 py-2 rounded-lg border text-sm font-medium transition-colors',
                animalType === type
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
              ].join(' ')}
            >
              {ANIMAL_LABELS[type]}
            </button>
          ))}
        </div>
        {errors.animalType && <p className="text-xs text-red-600">{errors.animalType}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">Descripción *</label>
        <textarea
          rows={4}
          placeholder="Describí la situación: dónde está, cómo está, si tiene collar, etc."
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          className={[
            'rounded-md border px-3 py-2 text-sm placeholder-gray-400 resize-none',
            'focus:outline-none focus:ring-2 focus:ring-offset-0',
            errors.description
              ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
              : 'border-gray-300 focus:border-primary-500 focus:ring-primary-200',
          ].join(' ')}
        />
        {errors.description && <p className="text-xs text-red-600">{errors.description}</p>}
      </div>

      <Input
        label="Condición (opcional)"
        placeholder="Ej: herida en pata delantera, muy flaco, asustado"
        value={condition}
        onChange={(e) => onConditionChange(e.target.value)}
      />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-700">
          Urgencia: <span className="text-primary-600">{urgencyLevel}/5 — {URGENCY_LABELS[urgencyLevel]}</span>
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
    </div>
  )
}

interface StepContactoProps {
  phoneContact: string
  onPhoneChange: (v: string) => void
  summary: WizardState
}

function StepContacto({ phoneContact, onPhoneChange, summary }: StepContactoProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-gray-50 rounded-xl p-4 text-sm flex flex-col gap-1">
        <p><span className="font-medium">Animal:</span> {summary.animalType ? ANIMAL_LABELS[summary.animalType as AnimalType] : '—'}</p>
        <p><span className="font-medium">Ubicación:</span> {summary.locationText || (summary.lat ? `${summary.lat?.toFixed(4)}, ${summary.lng?.toFixed(4)}` : '—')}</p>
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

      <p className="text-xs text-gray-500">
        Al publicar aceptás nuestros términos de uso. El caso será visible en el mapa para toda la comunidad.
      </p>
    </div>
  )
}
