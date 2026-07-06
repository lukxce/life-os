'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { Pencil, Trash2, X, Star, Share2, Check, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PlaceFormSheet } from '@/components/food/PlaceFormSheet'
import { CATEGORY_CONFIG, Place } from '@/components/food/constants'

type SortKey = 'rating' | 'createdAt' | 'city' | 'name'

const PRICE_LABEL: Record<string, string> = { budget: '€', mid: '€€', upscale: '€€€' }

export default function FoodListPage() {
  const [places, setPlaces] = useState<Place[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Place | null>(null)
  const [editing, setEditing] = useState<Place | null>(null)
  const [copied, setCopied] = useState(false)

  function shareCityGuide(city: string) {
    const url = `${window.location.origin}/guide/${encodeURIComponent(city)}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {
      window.prompt('Copy this link:', url)
    })
  }
  const [cats, setCats] = useState<string[]>(['been', 'want_to_go', 'regular'])
  const [filterCity, setFilterCity] = useState('')
  const [filterCuisine, setFilterCuisine] = useState('')
  const [filterText, setFilterText] = useState('')
  const [sort, setSort] = useState<SortKey>('createdAt')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/food/places')
    if (res.ok) setPlaces(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const cities = useMemo(() => Array.from(new Set(places.map(p => p.city).filter(Boolean))).sort(), [places])
  const cuisines = useMemo(() => Array.from(new Set(places.map(p => p.cuisine).filter(Boolean))).sort(), [places])

  const filtered = useMemo(() => {
    const q = filterText.toLowerCase()
    const f = places.filter(p =>
      cats.includes(p.category) &&
      (!filterCity || p.city === filterCity) &&
      (!filterCuisine || p.cuisine === filterCuisine) &&
      (!q || p.name.toLowerCase().includes(q) || p.cuisine?.toLowerCase().includes(q) || p.city.toLowerCase().includes(q) || p.notes?.toLowerCase().includes(q) || p.mustOrder?.toLowerCase().includes(q))
    )
    return [...f].sort((a, b) => {
      if (sort === 'rating') return (b.myRating ?? 0) - (a.myRating ?? 0)
      if (sort === 'city') return a.city.localeCompare(b.city)
      if (sort === 'name') return a.name.localeCompare(b.name)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  }, [places, cats, filterCity, filterCuisine, sort])

  async function handleDelete(place: Place) {
    await fetch(`/api/food/places/${place.id}`, { method: 'DELETE' })
    setSelected(null)
    load()
  }

  if (loading) return (
    <div className="p-4 space-y-3 overflow-auto h-full">
      {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />)}
    </div>
  )

  return (
    <div className="h-full overflow-auto pb-24 md:pb-6">
      {/* Filters + sort */}
      <div className="sticky top-0 z-10 bg-surface/95 dark:bg-surface/90 backdrop-blur border-b border-black/5 dark:border-white/5 px-4 py-3 space-y-2">
        {/* Text search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search places, cuisine, notes…"
            value={filterText}
            onChange={e => setFilterText(e.target.value)}
            className="w-full bg-gray-50 dark:bg-gray-800 border border-black/10 dark:border-white/10 rounded-xl pl-8 pr-3 py-2 text-sm outline-none focus:border-orange-400"
          />
          {filterText && (
            <button onClick={() => setFilterText('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Category toggles */}
        <div className="flex gap-1.5 flex-wrap">
          {(Object.entries(CATEGORY_CONFIG) as [string, { label: string; color: string }][]).map(([key, cfg]) => (
            <button key={key}
              onClick={() => setCats(c => c.includes(key) ? c.filter(x => x !== key) : [...c, key])}
              className={cn('px-3 py-1 text-xs font-semibold rounded-full border-2 transition-all',
                cats.includes(key) ? 'text-white border-transparent' : 'border-black/10 dark:border-white/10 text-gray-400')}
              style={cats.includes(key) ? { background: cfg.color } : undefined}>
              {cfg.label}
            </button>
          ))}
          <span className="ml-auto text-xs text-gray-400 self-center">{filtered.length} place{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="flex gap-2 flex-wrap">
          {cities.length > 1 && (
            <select value={filterCity} onChange={e => setFilterCity(e.target.value)}
              className="border border-black/10 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs bg-white dark:bg-gray-800 outline-none">
              <option value="">All cities</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          {filterCity && (
            <button
              onClick={() => shareCityGuide(filterCity)}
              className={cn('flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl font-medium transition-colors border',
                copied
                  ? 'bg-green-50 text-green-600 border-green-200 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400'
                  : 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-400 hover:bg-orange-100')}>
              {copied ? <Check size={11} /> : <Share2 size={11} />}
              {copied ? 'Copied!' : `Share ${filterCity} guide`}
            </button>
          )}
          {cuisines.length > 1 && (
            <select value={filterCuisine} onChange={e => setFilterCuisine(e.target.value)}
              className="border border-black/10 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs bg-white dark:bg-gray-800 outline-none">
              <option value="">All cuisines</option>
              {cuisines.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <select value={sort} onChange={e => setSort(e.target.value as SortKey)}
            className="border border-black/10 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs bg-white dark:bg-gray-800 outline-none ml-auto">
            <option value="createdAt">Newest</option>
            <option value="rating">Top rated</option>
            <option value="name">A–Z</option>
            <option value="city">By city</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <p className="text-4xl mb-3">🍽️</p>
          <p className="font-medium text-gray-600 dark:text-gray-300">No places match your filters</p>
        </div>
      ) : (
        <div className="divide-y divide-black/5 dark:divide-white/5">
          {filtered.map(place => {
            const cfg = CATEGORY_CONFIG[place.category as keyof typeof CATEGORY_CONFIG]
            return (
              <div key={place.id} onClick={() => setSelected(p => p?.id === place.id ? null : place)}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors">
                {/* Color bar */}
                <div className="w-1 self-stretch rounded-full shrink-0" style={{ background: cfg?.color }} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-sm truncate">{place.name}</span>
                    {place.myRating != null && (
                      <span className="flex items-center gap-0.5 text-xs font-bold ml-auto shrink-0" style={{ color: cfg?.color }}>
                        <Star size={11} strokeWidth={2.5} fill="currentColor" />
                        {place.myRating}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>{place.city}</span>
                    {place.cuisine && <><span>·</span><span>{place.cuisine}</span></>}
                    {place.priceRange && <><span>·</span><span>{PRICE_LABEL[place.priceRange]}</span></>}
                  </div>
                  {place.mustOrder && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">⭐ {place.mustOrder}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Detail sheet */}
      {selected && !editing && (
        <div className="fixed inset-x-0 bottom-0 z-30 md:inset-auto md:fixed md:bottom-6 md:right-6 md:w-80">
          <div className="bg-surface/90 dark:bg-surface/70 rounded-t-3xl md:rounded-2xl shadow-2xl overflow-hidden">
            <div className="h-1 w-full" style={{ background: CATEGORY_CONFIG[selected.category as keyof typeof CATEGORY_CONFIG]?.color }} />
            {selected.photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selected.photoUrl} alt={selected.name} className="w-full h-40 object-cover" />
            )}
            <div className="p-5 pb-28 md:pb-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                      style={{ background: CATEGORY_CONFIG[selected.category as keyof typeof CATEGORY_CONFIG]?.color }}>
                      {CATEGORY_CONFIG[selected.category as keyof typeof CATEGORY_CONFIG]?.label}
                    </span>
                    {selected.priceRange && <span className="text-xs text-gray-400">{PRICE_LABEL[selected.priceRange]}</span>}
                  </div>
                  <h2 className="text-lg font-bold leading-tight">{selected.name}</h2>
                  <p className="text-sm text-gray-400">{[selected.city, selected.country].filter(Boolean).join(', ')}</p>
                </div>
                <div className="flex items-start gap-1.5 shrink-0">
                  {selected.myRating != null && (
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold"
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
                {selected.cuisine && <p className="text-gray-500">🍽 {selected.cuisine}</p>}
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
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-xl border border-black/10 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <Pencil size={13} /> Edit
                </button>
                <button onClick={() => handleDelete(selected)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-xl bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400">
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <PlaceFormSheet
          place={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load() }}
        />
      )}
    </div>
  )
}
