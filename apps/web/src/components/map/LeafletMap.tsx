import { useEffect, useCallback } from 'react'
import { MapContainer, TileLayer, useMap, Marker, Circle } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import 'leaflet.markercluster'
import type { CaseItem, AnimalType } from '../../types/case'

const URGENCY_COLOR: Record<number, string> = {
  1: '#22c55e',
  2: '#22c55e',
  3: '#f59e0b',
  4: '#f97316',
  5: '#ef4444',
}

const ANIMAL_EMOJI: Record<AnimalType, string> = {
  perro: '🐕',
  gato: '🐈',
  otro: '🐾',
}

function makeCaseIcon(c: CaseItem, isOwn = false) {
  const color = URGENCY_COLOR[c.urgencyLevel] ?? '#6b7280'
  const emoji = ANIMAL_EMOJI[c.animalType] ?? '🐾'
  const border = isOwn ? '3px solid #7c3aed' : '2px solid white'
  const shadow = isOwn
    ? '0 0 0 2px white, 0 2px 8px rgba(124,58,237,.5)'
    : '0 2px 6px rgba(0,0,0,.35)'
  return L.divIcon({
    html: `<div style="background:${color};border:${border};border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:${shadow}">${emoji}</div>`,
    className: '',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -20],
  })
}

const userIcon = L.divIcon({
  html: `<div style="background:#3b82f6;border:3px solid white;border-radius:50%;width:18px;height:18px;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>`,
  className: '',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

interface ClusterLayerProps {
  cases: CaseItem[]
  onCaseClick: (c: CaseItem) => void
  currentUserId?: string
}

function MarkerClusterLayer({ cases, onCaseClick, currentUserId }: ClusterLayerProps) {
  const map = useMap()

  const handleClick = useCallback(
    (c: CaseItem) => () => onCaseClick(c),
    [onCaseClick],
  )

  useEffect(() => {
    const group = L.markerClusterGroup({ maxClusterRadius: 60, showCoverageOnHover: false })

    for (const c of cases) {
      const marker = L.marker([c.lat, c.lng], { icon: makeCaseIcon(c, !!currentUserId && c.userId === currentUserId) })
      marker.on('click', handleClick(c))
      group.addLayer(marker)
    }

    map.addLayer(group)
    return () => {
      map.removeLayer(group)
    }
  }, [map, cases, handleClick])

  return null
}

interface FlyToProps {
  center: [number, number]
  zoom: number
}

function FlyTo({ center, zoom }: FlyToProps) {
  const map = useMap()
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1 })
  }, [map, center, zoom])
  return null
}

export interface LeafletMapProps {
  center: [number, number]
  zoom?: number
  cases: CaseItem[]
  userLocation: [number, number] | null
  onCaseClick: (c: CaseItem) => void
  flyToTrigger?: { center: [number, number]; zoom: number } | null
  currentUserId?: string
}

const DEFAULT_ZOOM = 13

export default function LeafletMap({
  center,
  zoom = DEFAULT_ZOOM,
  cases,
  userLocation,
  onCaseClick,
  flyToTrigger,
  currentUserId,
}: LeafletMapProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className="w-full h-full"
      zoomControl={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        maxZoom={19}
      />

      <MarkerClusterLayer cases={cases} onCaseClick={onCaseClick} currentUserId={currentUserId} />

      {userLocation && (
        <>
          <Marker position={userLocation} icon={userIcon} />
          <Circle
            center={userLocation}
            radius={200}
            pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1, weight: 1 }}
          />
        </>
      )}

      {flyToTrigger && <FlyTo center={flyToTrigger.center} zoom={flyToTrigger.zoom} />}
    </MapContainer>
  )
}
