import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const pinIcon = L.divIcon({
  html: `<div style="width:28px;height:28px;background:#9333ea;border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>`,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
})

function DraggableMarker({ lat, lng, onChange }: { lat: number; lng: number; onChange: (lat: number, lng: number) => void }) {
  const markerRef = useRef<L.Marker | null>(null)

  return (
    <Marker
      position={[lat, lng]}
      icon={pinIcon}
      draggable
      ref={markerRef}
      eventHandlers={{
        dragend: () => {
          if (markerRef.current) {
            const pos = markerRef.current.getLatLng()
            onChange(pos.lat, pos.lng)
          }
        },
      }}
    />
  )
}

function ClickToPlace({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => onChange(e.latlng.lat, e.latlng.lng),
  })
  return null
}

function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  const prevRef = useRef<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    const prev = prevRef.current
    if (!prev || Math.abs(prev.lat - lat) > 0.0001 || Math.abs(prev.lng - lng) > 0.0001) {
      map.setView([lat, lng], map.getZoom(), { animate: true })
      prevRef.current = { lat, lng }
    }
  }, [lat, lng, map])

  return null
}

interface Props {
  lat: number
  lng: number
  onChange: (lat: number, lng: number) => void
  height?: number
}

export default function LocationPickerMap({ lat, lng, onChange, height = 220 }: Props) {
  return (
    <div style={{ height, borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
      <MapContainer
        center={[lat, lng]}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <RecenterMap lat={lat} lng={lng} />
        <ClickToPlace onChange={onChange} />
        <DraggableMarker lat={lat} lng={lng} onChange={onChange} />
      </MapContainer>
    </div>
  )
}
