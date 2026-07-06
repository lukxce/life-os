'use client'
import { useState, useMemo } from 'react'
import { Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps'
import { Plus, X, Pencil, Trash2, Crosshair } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PlaceFormSheet } from './PlaceFormSheet'
import { CATEGORY_CONFIG, Place } from './constants'

const PRICE_LABEL: Record<string, string> = { budget: '€', mid: '€€', upscale: '€€€' }

function LocateMeButton() {
  const map = useMap()
  function locate() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      pos => {
        map?.panTo({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        map?.setZoom(14)
      },
      () => {}
    )
  }
  return (
    <button onClick={locate} title="Go to my location"
      className="absolute bottom-24 md:bottom-6 left-4 md:left-6 z-10 w-10 h-10 bg-surface/90 dark:bg-surface/70 rounded-full shadow-lg border border-black/10 dark:border-white/10 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
      <Crosshair size={17} className="text-gray-600 dark:text-gray-300" />
    </button>
  )
}

interface Props {
  places: Place[]
  onReload: () => void
}

export function FoodMapView({ places, onReload }: Props) {
  const [selected, setSelected] = useState<Place | null>(null)
  const [editing, setEditing] = useState<Place | null | undefined>(undefined)
  const [cats, setCats] = useState<string[]>(['been', 'want_to_go', 'regular'])
  const [filterCity, setFilterCity] = useState('')
  const [filterCuisine, setFilterCuisine] = useState('')

  const cities = useMemo(() => Array.from(new Set(places.map(p => p.city).filter(Boolean))).sort(), [places])
  const cuisines = useMemo(() => Array.from(new Set(places.map(p => p.cuisine).filter(Boolean))).sort(), [places])

  const filtered = places.filter(p =>
    cats.includes(p.category) &&
    (!filterCity || p.city === filterCity) &&
    (!filterCuisine || p.cuisine === filterCuisine)
  )

  async function handleDelete(place: Place) {
    await fetch(`/api/food/places/${place.id}`, { method: 'DELETE' })
    setSelected(null)
    onReload()
  }

  return (
    <div className="relative w-full h-full">
      <Map
        defaultCenter={{ lat: 43.32, lng: 21.9 }}
        defaultZoom={places.length === 0 ? 6 : 5}
        gestureHandling="greedy"
        disableDefaultUI
        mapId="DEMO_MAP_ID"
        style={{ width: '100%', height: '100%' }}
        onClick={() => setSelected(null)}
      >
        {filtered.map(place => {
          const cfg = CATEGORY_CONFIG[place.category as keyof typeof CATEGORY_CONFIG]
          return (
            <AdvancedMarker
              key={place.id}
              position={{ lat: place.latitude, lng: place.longitude }}
              onClick={() => setSelected(place)}
            >
              <div
                title={place.name}
                className={cn(
                  'rounded-full border-2 border-white shadow-md cursor-pointer transition-transform hover:scale-125',
                  selected?.id === place.id ? 'w-6 h-6 scale-125' : 'w-4 h-4'
                )}
                style={{ background: cfg?.color ?? '#6366f1' }}
              />
            </AdvancedMarker>
          )
        })}
      </Map>

      {/* Filter bar */}
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap gap-2 pointer-events-none">
        <div className="flex gap-1 bg-surface/95 dark:bg-surface/90 backdrop-blur rounded-xl shadow-md p-1 pointer-events-auto">
          {(Object.entries(CATEGORY_CONFIG) as [string, { label: string; color: string }][]).map(([key, cfg]) => (
            <button key={key}
              onClick={() => setCats(c => c.includes(key) ? c.filter(x => x !== key) : [...c, key])}
              className={cn('px-2.5 py-1 text-xs font-semibold rounded-lg transition-all',
                cats.includes(key) ? 'text-white' : 'text-gray-400')}
              style={cats.includes(key) ? { background: cfg.color } : undefined}>
              {cfg.label}
            </button>
          ))}
        </div>

        {cities.length > 1 && (
          <select value={filterCity} onChange={e => setFilterCity(e.target.value)}
            className="bg-surface/95 dark:bg-surface/90 backdrop-blur shadow-md rounded-xl px-3 py-1.5 text-xs font-medium outline-none pointer-events-auto">
            <option value="">All cities</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}

        {cuisines.length > 1 && (
          <select value={filterCuisine} onChange={e => setFilterCuisine(e.target.value)}
            className="bg-surface/95 dark:bg-surface/90 backdrop-blur shadow-md rounded-xl px-3 py-1.5 text-xs font-medium outline-none pointer-events-auto">
            <option value="">All cuisines</option>
            {cuisines.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}

        <div className="ml-auto bg-surface/95 dark:bg-surface/90 backdrop-blur shadow-md rounded-xl px-3 py-1.5 text-xs font-medium text-gray-500 pointer-events-auto">
          {filtered.length} place{filtered.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Empty state */}
      {places.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-surface/90 dark:bg-surface/85 backdrop-blur rounded-2xl p-6 text-center shadow-xl">
            <p className="text-3xl mb-2">🍽️</p>
            <p className="font-semibold text-gray-700 dark:text-gray-200">No places yet</p>
            <p className="text-sm text-gray-400 mt-1">Tap + to add your first spot</p>
          </div>
        </div>
      )}

      {/* Detail sheet */}
      {selected && editing === undefined && (
        <div className="absolute bottom-0 left-0 right-0 z-20 md:bottom-6 md:left-6 md:right-auto md:w-80">
          <div className="bg-surface/90 dark:bg-surface/70 rounded-t-3xl md:rounded-2xl shadow-2xl overflow-hidden">
            <div className="h-1 w-full" style={{ background: CATEGORY_CONFIG[selected.category as keyof typeof CATEGORY_CONFIG]?.color ?? '#6366f1' }} />
            <div className="p-5 pb-28 md:pb-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white shrink-0"
                      style={{ background: CATEGORY_CONFIG[selected.category as keyof typeof CATEGORY_CONFIG]?.color }}>
                      {CATEGORY_CONFIG[selected.category as keyof typeof CATEGORY_CONFIG]?.label}
                    </span>
                    {selected.priceRange && <span className="text-xs text-gray-400 font-medium">{PRICE_LABEL[selected.priceRange]}</span>}
                  </div>
                  <h2 className="text-lg font-bold leading-tight truncate">{selected.name}</h2>
                  <p className="text-sm text-gray-400">{[selected.city, selected.country].filter(Boolean).join(', ')}</p>
                </div>
                <div className="flex items-start gap-1.5 shrink-0">
                  {selected.myRating != null && (
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-base"
                      style={{ background: CATEGORY_CONFIG[selected.category as keyof typeof CATEGORY_CONFIG]?.color }}>
                      {selected.myRating}
                    </div>
                  )}
                  <button onClick={() => setSelected(null)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800">
                    <X size={16} />
                  </button>
                </div>
              </div>
              <div className="space-y-1.5 text-sm mb-4">
                {selected.cuisine && <p className="text-gray-500 dark:text-gray-400">🍽 {selected.cuisine}</p>}
                {selected.mustOrder && <p className="text-gray-600 dark:text-gray-300">⭐ <span className="font-medium">{selected.mustOrder}</span></p>}
                {selected.notes && <p className="text-gray-400 text-xs leading-relaxed">{selected.notes}</p>}
                {selected.visitedAt && (
                  <p className="text-xs text-gray-400">
                    Visited {new Date(selected.visitedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditing(selected)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-xl border border-black/10 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <Pencil size={13} /> Edit
                </button>
                <button onClick={() => handleDelete(selected)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-xl bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 transition-colors">
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Locate me */}
      <LocateMeButton />

      {/* FAB — always visible */}
      <button onClick={() => { setSelected(null); setEditing(null) }}
        className="absolute bottom-24 md:bottom-6 right-4 md:right-6 z-10 w-14 h-14 bg-orange-500 text-white rounded-full shadow-xl shadow-orange-500/30 flex items-center justify-center hover:bg-orange-600 active:scale-95 transition-all">
        <Plus size={24} />
      </button>

      {/* Add/Edit form */}
      {editing !== undefined && (
        <PlaceFormSheet
          place={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => { setEditing(undefined); onReload() }}
        />
      )}
    </div>
  )
}
