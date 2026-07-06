'use client'
import { useState, useRef } from 'react'
import { X, Camera, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CATEGORY_CONFIG, CUISINES, Place, SearchResult } from './constants'

interface Props {
  place?: Place | null
  onClose: () => void
  onSaved: () => void
}

const defaultForm = {
  name: '', address: '', city: '', country: '',
  latitude: '', longitude: '', category: 'been',
  cuisine: '', myRating: '', priceRange: '',
  mustOrder: '', notes: '', visitedAt: '', googlePlaceId: '',
}

export function PlaceFormSheet({ place, onClose, onSaved }: Props) {
  const [search, setSearch] = useState(place?.name ?? '')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [form, setForm] = useState(place ? {
    name: place.name,
    address: place.address ?? '',
    city: place.city,
    country: place.country,
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    category: place.category,
    cuisine: place.cuisine,
    myRating: place.myRating != null ? String(place.myRating) : '',
    priceRange: place.priceRange ?? '',
    mustOrder: place.mustOrder ?? '',
    notes: place.notes ?? '',
    visitedAt: place.visitedAt ? place.visitedAt.split('T')[0] : '',
    googlePlaceId: place.googlePlaceId ?? '',
  } : { ...defaultForm })
  const [saving, setSaving] = useState(false)
  const [photoUrl, setPhotoUrl] = useState<string | null>(place?.photoUrl ?? null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function handlePhotoUpload(file: File) {
    setUploadingPhoto(true)
    try {
      const res = await fetch('/api/food/upload', {
        method: 'POST',
        headers: { 'x-filename': file.name, 'Content-Type': file.type },
        body: file,
      })
      const data = await res.json()
      setPhotoUrl(data.url)
    } finally {
      setUploadingPhoto(false)
    }
  }

  function handleSearch(val: string) {
    setSearch(val)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (val.length < 2) { setResults([]); return }
    timerRef.current = setTimeout(async () => {
      setSearching(true)
      const res = await fetch(`/api/food/search?q=${encodeURIComponent(val)}`)
      setResults(await res.json())
      setSearching(false)
    }, 350)
  }

  function pickResult(r: SearchResult) {
    setForm(f => ({
      ...f,
      name: r.name,
      address: r.address,
      city: r.city,
      country: r.country,
      latitude: String(r.latitude),
      longitude: String(r.longitude),
      googlePlaceId: r.placeId,
    }))
    setSearch(r.name)
    setResults([])
  }

  async function save() {
    if (!form.name.trim() || !form.latitude) return
    setSaving(true)
    const body = {
      ...form,
      myRating: form.myRating ? Number(form.myRating) : null,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      visitedAt: form.visitedAt || null,
      photoUrl: photoUrl ?? null,
    }
    if (place) {
      await fetch(`/api/food/places/${place.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
    } else {
      await fetch('/api/food/places', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
    }
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-surface/90 dark:bg-surface/70 rounded-t-3xl md:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 shrink-0">
          <h2 className="text-lg font-bold">{place ? 'Edit place' : 'Add place'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-6 space-y-4">
          {/* Search (add mode only) */}
          {!place && (
            <div className="relative">
              <input
                autoFocus
                type="text"
                placeholder="Search for a restaurant or café…"
                className="w-full border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm bg-gray-50 dark:bg-gray-800 outline-none focus:border-orange-400"
                value={search}
                onChange={e => handleSearch(e.target.value)}
              />
              {searching && <p className="text-xs text-gray-400 mt-1 px-1">Searching…</p>}
              {results.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-surface/90 dark:bg-surface/70 border border-black/10 dark:border-white/10 rounded-xl shadow-xl overflow-hidden">
                  {results.map((r, i) => (
                    <button key={i} onClick={() => pickResult(r)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 border-b last:border-0 border-black/5 dark:border-white/5 transition-colors">
                      <p className="text-sm font-medium">{r.name}</p>
                      <p className="text-xs text-gray-400 truncate">{r.address}</p>
                    </button>
                  ))}
                </div>
              )}
              {/* Manual name fallback if search yields no results */}
              {form.name && form.name !== search && (
                <p className="text-xs text-gray-400 mt-1 px-1">Selected: <span className="font-medium text-gray-600 dark:text-gray-300">{form.name}</span></p>
              )}
            </div>
          )}

          {/* Category */}
          <div>
            <label className="block text-xs text-gray-500 mb-2">Category</label>
            <div className="flex gap-2">
              {(Object.entries(CATEGORY_CONFIG) as [string, { label: string; color: string }][]).map(([key, cfg]) => (
                <button key={key} onClick={() => setForm(f => ({ ...f, category: key }))}
                  className={cn('flex-1 py-2 text-xs font-semibold rounded-xl border-2 transition-all',
                    form.category === key ? 'text-white border-transparent' : 'border-black/10 dark:border-white/10 text-gray-500')}
                  style={form.category === key ? { background: cfg.color } : undefined}>
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cuisine + Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Cuisine</label>
              <select value={form.cuisine} onChange={e => setForm(f => ({ ...f, cuisine: e.target.value }))}
                className="w-full border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 outline-none">
                <option value="">Select</option>
                {CUISINES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Price range</label>
              <select value={form.priceRange} onChange={e => setForm(f => ({ ...f, priceRange: e.target.value }))}
                className="w-full border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 outline-none">
                <option value="">Select</option>
                <option value="budget">€ Budget</option>
                <option value="mid">€€ Mid</option>
                <option value="upscale">€€€ Upscale</option>
              </select>
            </div>
          </div>

          {/* Rating */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">My rating (1–10)</label>
            <input type="number" min="1" max="10" step="0.5"
              value={form.myRating} onChange={e => setForm(f => ({ ...f, myRating: e.target.value }))}
              placeholder="8.5"
              className="w-full border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 outline-none" />
          </div>

          {/* Must order */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Must order</label>
            <input type="text"
              value={form.mustOrder} onChange={e => setForm(f => ({ ...f, mustOrder: e.target.value }))}
              placeholder="e.g. Beef tartare"
              className="w-full border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 outline-none" />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Notes</label>
            <textarea rows={3}
              value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="What was great, what to remember…"
              className="w-full border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 outline-none resize-none" />
          </div>

          {/* Date visited */}
          {(form.category === 'been' || form.category === 'regular') && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Date visited</label>
              <input type="date"
                value={form.visitedAt} onChange={e => setForm(f => ({ ...f, visitedAt: e.target.value }))}
                className="w-full border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 outline-none" />
            </div>
          )}

          {/* City (editable, auto-filled from search) */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">City</label>
            <input type="text"
              value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
              placeholder="e.g. Niš"
              className="w-full border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 outline-none" />
          </div>

          {/* Photo */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Photo</label>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])}
            />
            {photoUrl ? (
              <div className="relative rounded-xl overflow-hidden aspect-video bg-gray-100 dark:bg-gray-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoUrl} alt="Place photo" className="w-full h-full object-cover" />
                <button
                  onClick={() => setPhotoUrl(null)}
                  className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-black/10 dark:border-white/10 rounded-xl py-4 text-sm text-gray-400 hover:border-orange-400 hover:text-orange-400 transition-colors disabled:opacity-50">
                {uploadingPhoto ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                {uploadingPhoto ? 'Uploading…' : 'Add a photo'}
              </button>
            )}
          </div>

          <button onClick={save} disabled={saving || !form.name.trim() || !form.latitude}
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-2xl disabled:opacity-50 transition-colors">
            {saving ? 'Saving…' : place ? 'Save changes' : 'Add place'}
          </button>
        </div>
      </div>
    </div>
  )
}
