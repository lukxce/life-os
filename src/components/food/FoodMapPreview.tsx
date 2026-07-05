'use client'
import { useEffect, useState } from 'react'
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps'
import Link from 'next/link'
import { CATEGORY_CONFIG, Place } from './constants'

function PreviewInner() {
  const [places, setPlaces] = useState<Place[]>([])

  useEffect(() => {
    fetch('/api/food/places').then(r => r.json()).then(setPlaces).catch(() => {})
  }, [])

  const cityCount = Array.from(new Set(places.map(p => p.city).filter(Boolean))).length

  const center = places.length > 0
    ? { lat: places.reduce((s, p) => s + p.latitude, 0) / places.length, lng: places.reduce((s, p) => s + p.longitude, 0) / places.length }
    : { lat: 43.32, lng: 21.9 }

  return (
    <div className="bg-white/85 dark:bg-gray-900/70 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
      <div className="relative h-44 md:h-52">
        <Map
          center={places.length > 0 ? center : undefined}
          defaultCenter={center}
          defaultZoom={places.length > 0 ? 5 : 6}
          gestureHandling="none"
          disableDefaultUI
          mapId="DEMO_MAP_ID"
          style={{ width: '100%', height: '100%' }}
        >
          {places.map(p => {
            const cfg = CATEGORY_CONFIG[p.category as keyof typeof CATEGORY_CONFIG]
            return (
              <AdvancedMarker key={p.id} position={{ lat: p.latitude, lng: p.longitude }}>
                <div className="w-3 h-3 rounded-full border-2 border-white shadow-md"
                  style={{ background: cfg?.color ?? '#f97316' }} />
              </AdvancedMarker>
            )
          })}
        </Map>

        {places.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur rounded-xl px-4 py-2 text-center">
              <p className="text-2xl mb-0.5">🍽️</p>
              <p className="text-xs text-gray-500">No places saved yet</p>
            </div>
          </div>
        )}

        {/* Legend */}
        {places.length > 0 && (
          <div className="absolute bottom-2 left-2 flex gap-1.5 pointer-events-none">
            {(Object.entries(CATEGORY_CONFIG) as [string, { label: string; color: string }][]).map(([, cfg]) => (
              <span key={cfg.label} className="flex items-center gap-1 bg-white/90 dark:bg-gray-900/90 backdrop-blur rounded-full px-2 py-0.5 text-xs font-medium">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: cfg.color }} />
                {cfg.label}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 flex items-center justify-between">
        <div>
          <p className="font-semibold text-sm text-gray-900 dark:text-white">Food Map</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {places.length} place{places.length !== 1 ? 's' : ''}
            {cityCount > 0 && ` · ${cityCount} cit${cityCount === 1 ? 'y' : 'ies'}`}
          </p>
        </div>
        <Link href="/food"
          className="text-xs font-semibold px-3 py-1.5 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors">
          Open map
        </Link>
      </div>
    </div>
  )
}

export function FoodMapPreview() {
  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''}>
      <PreviewInner />
    </APIProvider>
  )
}
