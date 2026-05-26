'use client'
import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import {
  Plus, Search, X, Star, Trash2, Loader2,
  Tv, BookOpen, Film, ChevronDown, Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────

interface WatchlistItem {
  id: string
  type: 'movie' | 'tv' | 'book'
  status: 'want_to' | 'currently' | 'finished' | 'loved_it'
  title: string
  externalId: string | null
  posterUrl: string | null
  year: number | null
  genres: string[]
  overview: string | null
  author: string | null
  tmdbRating: number | null
  streamingOn: string[]
  myRating: number | null
  notes: string | null
  finishedAt: string | null
  updatedAt: string
}

interface SearchResult {
  id: number | string
  type: 'movie' | 'tv' | 'book'
  title: string
  year: number | null
  posterUrl: string | null
  tmdbRating: number | null
  overview: string | null
  genres: string[]
  author?: string | null
  // fetched on select
  streamingOn?: string[]
  runtime?: number | null
  seasons?: number | null
}

// ── Config ────────────────────────────────────────────────────────────────────

const STATUS_CFG = {
  want_to:   { label: 'Want to',  bgItem: 'bg-indigo-500',  ring: 'ring-indigo-400',  badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' },
  currently: { label: 'Watching', bgItem: 'bg-amber-500',   ring: 'ring-amber-400',   badge: 'bg-amber-100  text-amber-700  dark:bg-amber-900/40  dark:text-amber-300'  },
  finished:  { label: 'Finished', bgItem: 'bg-emerald-500', ring: 'ring-emerald-400', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  loved_it:  { label: 'Loved it', bgItem: 'bg-rose-500',    ring: 'ring-rose-400',    badge: 'bg-rose-100   text-rose-700   dark:bg-rose-900/40   dark:text-rose-300'   },
}

const STATUS_LABEL_BY_TYPE: Record<string, Record<string, string>> = {
  movie: { want_to: 'Want to Watch', currently: 'Watching',  finished: 'Finished', loved_it: 'Loved It ❤️' },
  tv:    { want_to: 'Want to Watch', currently: 'Watching',  finished: 'Finished', loved_it: 'Loved It ❤️' },
  book:  { want_to: 'Want to Read',  currently: 'Reading',   finished: 'Finished', loved_it: 'Loved It ❤️' },
}

const STREAMING_COLORS: Record<string, string> = {
  Netflix:          'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  'HBO Max':        'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  Max:              'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  'Disney+':        'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'Apple TV+':      'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  'Amazon Prime':   'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  'Prime Video':    'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  'Paramount+':     'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
}
function streamingColor(name: string) {
  return STREAMING_COLORS[name] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PosterPlaceholder({ title, color }: { title: string; color: string }) {
  return (
    <div className="w-full h-full flex items-center justify-center" style={{ background: color }}>
      <span className="text-3xl font-bold text-white/80">{title[0]?.toUpperCase()}</span>
    </div>
  )
}

function RatingPicker({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {[1,2,3,4,5,6,7,8,9,10].map(n => (
        <button
          key={n}
          onClick={() => onChange(value === n ? null : n)}
          className={cn(
            'w-8 h-8 rounded-lg text-sm font-semibold transition-all',
            value === n
              ? 'bg-amber-400 text-white shadow-sm'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-amber-100 dark:hover:bg-amber-900/30',
          )}>
          {n}
        </button>
      ))}
    </div>
  )
}

function StatusPicker({
  value, itemType, onChange,
}: {
  value: string
  itemType: string
  onChange: (s: string) => void
}) {
  const labels = STATUS_LABEL_BY_TYPE[itemType] ?? STATUS_LABEL_BY_TYPE.movie
  return (
    <div className="grid grid-cols-2 gap-2">
      {(Object.keys(STATUS_CFG) as Array<keyof typeof STATUS_CFG>).map(s => (
        <button
          key={s}
          onClick={() => onChange(s)}
          className={cn(
            'flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border-2 transition-all',
            value === s
              ? `border-transparent ${STATUS_CFG[s].bgItem} text-white`
              : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600',
          )}>
          {value === s && <Check size={13} />}
          <span className="truncate">{labels[s]}</span>
        </button>
      ))}
    </div>
  )
}

function ItemCard({ item, onClick }: { item: WatchlistItem; onClick: () => void }) {
  const PLACEHOLDER_COLORS = ['#6366f1','#8b5cf6','#3b82f6','#10b981','#f59e0b','#ef4444','#ec4899']
  const color = PLACEHOLDER_COLORS[item.title.charCodeAt(0) % PLACEHOLDER_COLORS.length]
  const cfg = STATUS_CFG[item.status]

  return (
    <button onClick={onClick} className="text-left group">
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
        {item.posterUrl
          ? <img src={item.posterUrl} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
          : <PosterPlaceholder title={item.title} color={color} />
        }

        {/* Status chip — top right */}
        <div className={cn('absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide text-white', cfg.bgItem)}>
          {item.status === 'loved_it' ? '❤️' : cfg.label}
        </div>

        {/* My rating — bottom left */}
        {item.myRating != null && (
          <div className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 bg-black/70 rounded-md px-1.5 py-0.5">
            <Star size={8} fill="#fbbf24" color="#fbbf24" />
            <span className="text-[10px] text-white font-bold">{item.myRating}/10</span>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      <div className="mt-1.5 px-0.5">
        <p className="text-xs font-semibold leading-tight line-clamp-2 text-gray-900 dark:text-gray-100">
          {item.title}
        </p>
        <p className="text-[10px] text-gray-400 mt-0.5">
          {item.type === 'book' ? item.author ?? '—' : (item.year ?? '—')}
        </p>
        {item.tmdbRating != null && (
          <p className="text-[10px] text-gray-400 flex items-center gap-0.5">
            <Star size={8} fill="#fbbf24" color="#fbbf24" />
            {item.tmdbRating}
          </p>
        )}
      </div>
    </button>
  )
}

// ── Add Sheet ─────────────────────────────────────────────────────────────────

function AddSheet({
  defaultTab,
  onClose,
  onAdded,
}: {
  defaultTab: 'media' | 'book'
  onClose: () => void
  onAdded: (item: WatchlistItem) => void
}) {
  const [tab, setTab]           = useState<'media' | 'book'>(defaultTab)
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<SearchResult | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

  // Add form state
  const [status, setStatus]     = useState<string>('want_to')
  const [myRating, setMyRating] = useState<number | null>(null)
  const [notes, setNotes]       = useState('')
  const [saving, setSaving]     = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80) }, [])

  // Debounced search
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (query.trim().length < 2) { setResults([]); return }

    timerRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const endpoint = tab === 'book'
          ? `/api/life/books/search?q=${encodeURIComponent(query)}`
          : `/api/life/tmdb/search?q=${encodeURIComponent(query)}`
        const res = await fetch(endpoint)
        if (res.ok) setResults(await res.json())
      } finally {
        setSearching(false)
      }
    }, 400)

    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query, tab])

  // Reset results when tab changes
  useEffect(() => { setResults([]); setQuery(''); setSelected(null) }, [tab])

  async function selectResult(r: SearchResult) {
    if (r.type === 'book') {
      setSelected(r)
      return
    }
    // Fetch full details + streaming providers for movies/TV
    setLoadingDetails(true)
    try {
      const res = await fetch(`/api/life/tmdb/details?id=${r.id}&type=${r.type}`)
      if (res.ok) {
        const details = await res.json()
        setSelected({ ...r, ...details })
      } else {
        setSelected(r)
      }
    } finally {
      setLoadingDetails(false)
    }
  }

  async function save() {
    if (!selected || saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/life/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type:        selected.type,
          status,
          title:       selected.title,
          externalId:  String(selected.id),
          posterUrl:   selected.posterUrl,
          year:        selected.year,
          genres:      selected.genres,
          overview:    selected.overview,
          author:      selected.author ?? null,
          tmdbRating:  selected.tmdbRating,
          streamingOn: selected.streamingOn ?? [],
          myRating:    myRating,
          notes:       notes.trim() || null,
        }),
      })
      if (res.ok) {
        onAdded(await res.json())
        onClose()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-t-2xl max-h-[88vh] flex flex-col shadow-2xl">
        {/* Handle */}
        <div className="flex-none pt-3 pb-1 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-gray-700" />
        </div>

        {/* Header */}
        <div className="flex-none flex items-center justify-between px-5 py-3">
          <h2 className="font-bold text-lg text-gray-900 dark:text-white">Add to Watchlist</h2>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Tab pills */}
        <div className="flex-none flex gap-2 px-5 pb-3">
          {(['media', 'book'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
                tab === t
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
              )}>
              {t === 'media' ? <Tv size={14} /> : <BookOpen size={14} />}
              {t === 'media' ? 'Movies & TV' : 'Books'}
            </button>
          ))}
        </div>

        {/* Selected result → add form */}
        {selected ? (
          <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-5">
            {/* Selected item summary */}
            <div className="flex gap-3 items-start p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <button onClick={() => setSelected(null)} className="mt-0.5 shrink-0 p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400">
                <ChevronDown size={14} />
              </button>
              {selected.posterUrl && (
                <img src={selected.posterUrl} alt={selected.title} className="w-10 h-14 object-cover rounded-lg shrink-0" />
              )}
              <div className="min-w-0">
                <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{selected.title}</p>
                <p className="text-xs text-gray-400">
                  {selected.type === 'book' ? selected.author : selected.year}
                  {selected.tmdbRating != null && ` · ⭐ ${selected.tmdbRating}`}
                </p>
                {(selected.streamingOn ?? []).length > 0 && (
                  <div className="flex gap-1 flex-wrap mt-1">
                    {(selected.streamingOn ?? []).map(s => (
                      <span key={s} className={cn('text-[10px] px-1.5 py-0.5 rounded-md font-medium', streamingColor(s))}>{s}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Status */}
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Status</p>
              <StatusPicker value={status} itemType={selected.type} onChange={setStatus} />
            </div>

            {/* Rating */}
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                My Rating <span className="text-gray-400 normal-case">(optional)</span>
              </p>
              <RatingPicker value={myRating} onChange={setMyRating} />
            </div>

            {/* Notes */}
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Notes</p>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Your thoughts, recommendations, quotes…"
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              onClick={save}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors disabled:opacity-60">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Add to List
            </button>
          </div>
        ) : (
          <>
            {/* Search input */}
            <div className="flex-none px-5 pb-3">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder={tab === 'book' ? 'Search books, authors…' : 'Search movies and TV shows…'}
                  className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {query && (
                  <button onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                    <X size={14} className="text-gray-400" />
                  </button>
                )}
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto px-5 pb-6">
              {loadingDetails ? (
                <div className="flex items-center justify-center py-8 gap-2 text-gray-400">
                  <Loader2 size={20} className="animate-spin" />
                  <span className="text-sm">Fetching details…</span>
                </div>
              ) : searching ? (
                <div className="flex items-center justify-center py-8 gap-2 text-gray-400">
                  <Loader2 size={20} className="animate-spin" />
                  <span className="text-sm">Searching…</span>
                </div>
              ) : results.length > 0 ? (
                <div className="space-y-1">
                  {results.map(r => (
                    <button
                      key={r.id}
                      onClick={() => selectResult(r)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left">
                      <div className="w-9 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0">
                        {r.posterUrl
                          ? <img src={r.posterUrl} alt={r.title} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-gray-400">
                              {r.type === 'book' ? <BookOpen size={14} /> : <Film size={14} />}
                            </div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{r.title}</p>
                        <p className="text-xs text-gray-400">
                          {r.type === 'book'
                            ? `${r.author ?? 'Unknown author'}${r.year ? ` · ${r.year}` : ''}`
                            : `${r.type === 'tv' ? 'TV' : 'Movie'} · ${r.year ?? '—'}`
                          }
                          {r.tmdbRating != null && ` · ⭐ ${r.tmdbRating}`}
                        </p>
                        {r.genres.length > 0 && (
                          <p className="text-[10px] text-gray-400 truncate mt-0.5">{r.genres.slice(0, 3).join(' · ')}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : query.trim().length >= 2 ? (
                <p className="text-center text-sm text-gray-400 py-8">No results found</p>
              ) : (
                <p className="text-center text-sm text-gray-400 py-8">
                  {tab === 'book' ? 'Search any book title or author' : 'Search any movie or TV show'}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Detail Sheet ──────────────────────────────────────────────────────────────

function DetailSheet({
  item,
  onClose,
  onUpdated,
  onDeleted,
}: {
  item: WatchlistItem
  onClose: () => void
  onUpdated: (item: WatchlistItem) => void
  onDeleted: (id: string) => void
}) {
  const [status,   setStatus]   = useState<string>(item.status)
  const [myRating, setMyRating] = useState<number | null>(item.myRating)
  const [notes,    setNotes]    = useState(item.notes ?? '')
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const dirty = status !== item.status || myRating !== item.myRating || notes !== (item.notes ?? '')

  async function save() {
    if (!dirty || saving) return
    setSaving(true)
    try {
      const res = await fetch(`/api/life/watchlist/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, myRating, notes: notes.trim() || null }),
      })
      if (res.ok) { onUpdated(await res.json()); onClose() }
    } finally { setSaving(false) }
  }

  async function remove() {
    if (deleting) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/life/watchlist/${item.id}`, { method: 'DELETE' })
      if (res.ok) { onDeleted(item.id); onClose() }
    } finally { setDeleting(false) }
  }

  const PLACEHOLDER_COLORS = ['#6366f1','#8b5cf6','#3b82f6','#10b981','#f59e0b','#ef4444','#ec4899']
  const color = PLACEHOLDER_COLORS[item.title.charCodeAt(0) % PLACEHOLDER_COLORS.length]
  const labels = STATUS_LABEL_BY_TYPE[item.type] ?? STATUS_LABEL_BY_TYPE.movie

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 rounded-t-2xl max-h-[92vh] flex flex-col shadow-2xl">
        {/* Handle */}
        <div className="flex-none pt-3 pb-1 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-gray-700" />
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Poster + info header */}
          <div className="flex gap-4 px-5 py-3">
            <div className="w-20 h-28 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0">
              {item.posterUrl
                ? <img src={item.posterUrl} alt={item.title} className="w-full h-full object-cover" />
                : <PosterPlaceholder title={item.title} color={color} />
              }
            </div>
            <div className="flex-1 min-w-0 pt-1">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-bold text-base text-gray-900 dark:text-white leading-tight">{item.title}</h2>
                <button onClick={onClose} className="shrink-0 p-1 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800">
                  <X size={16} className="text-gray-400" />
                </button>
              </div>

              {/* Meta */}
              <p className="text-xs text-gray-400 mt-1">
                {item.type === 'book'
                  ? item.author ?? ''
                  : `${item.type === 'tv' ? 'TV Show' : 'Movie'} · ${item.year ?? '—'}`
                }
              </p>

              {/* TMDB rating */}
              {item.tmdbRating != null && (
                <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-0.5">
                  <Star size={10} fill="#fbbf24" color="#fbbf24" />
                  {item.tmdbRating} / 10 TMDB
                </p>
              )}

              {/* Genres */}
              {item.genres.length > 0 && (
                <p className="text-[10px] text-gray-400 mt-1">{item.genres.slice(0, 4).join(' · ')}</p>
              )}

              {/* Streaming */}
              {item.streamingOn.length > 0 && (
                <div className="flex gap-1 flex-wrap mt-1.5">
                  {item.streamingOn.map(s => (
                    <span key={s} className={cn('text-[10px] px-1.5 py-0.5 rounded-md font-medium', streamingColor(s))}>{s}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Overview */}
          {item.overview && (
            <div className="px-5 pb-3">
              <p className={cn('text-xs text-gray-500 dark:text-gray-400 leading-relaxed', !expanded && 'line-clamp-3')}>
                {item.overview}
              </p>
              {item.overview.length > 180 && (
                <button onClick={() => setExpanded(!expanded)} className="text-xs text-indigo-500 mt-0.5">
                  {expanded ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>
          )}

          <div className="px-5 pb-6 space-y-5">
            {/* Status */}
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Status</p>
              <StatusPicker value={status} itemType={item.type} onChange={setStatus} />
            </div>

            {/* My Rating */}
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                My Rating
                {myRating != null && <span className="ml-2 text-amber-500 font-bold">{myRating}/10</span>}
              </p>
              <RatingPicker value={myRating} onChange={setMyRating} />
            </div>

            {/* Notes */}
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Notes</p>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Your thoughts, quotes, recommendations…"
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Save */}
            {dirty && (
              <button
                onClick={save}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors disabled:opacity-60">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Save Changes
              </button>
            )}

            {/* Delete */}
            {confirmDelete ? (
              <div className="flex gap-2">
                <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 font-medium">
                  Cancel
                </button>
                <button onClick={remove} disabled={deleting} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5">
                  {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  Delete
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                <Trash2 size={14} />
                Remove from list
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function WatchlistPage() {
  const [items,    setItems]    = useState<WatchlistItem[]>([])
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState<'media' | 'book'>('media')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [search,   setSearch]   = useState('')
  const [showAdd,  setShowAdd]  = useState(false)
  const [selected, setSelected] = useState<WatchlistItem | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/life/watchlist')
    if (res.ok) setItems(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    let list = items.filter(i =>
      tab === 'media' ? i.type === 'movie' || i.type === 'tv' : i.type === 'book'
    )
    if (statusFilter) list = list.filter(i => i.status === statusFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(i =>
        i.title.toLowerCase().includes(q) ||
        (i.author ?? '').toLowerCase().includes(q) ||
        (i.notes  ?? '').toLowerCase().includes(q)
      )
    }
    return list
  }, [items, tab, statusFilter, search])

  // Counts per status (for badges) — filtered by current tab only
  const tabItems = useMemo(() =>
    items.filter(i => tab === 'media' ? i.type === 'movie' || i.type === 'tv' : i.type === 'book'),
    [items, tab],
  )
  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const s of Object.keys(STATUS_CFG)) {
      c[s] = tabItems.filter(i => i.status === s).length
    }
    c.all = tabItems.length
    return c
  }, [tabItems])

  function handleAdded(item: WatchlistItem) {
    setItems(prev => [item, ...prev])
  }
  function handleUpdated(item: WatchlistItem) {
    setItems(prev => prev.map(i => i.id === item.id ? item : i))
  }
  function handleDeleted(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const STATUS_FILTERS = [
    { key: null,        label: 'All' },
    { key: 'want_to',   label: tab === 'book' ? 'Want to Read' : 'Want to Watch' },
    { key: 'currently', label: tab === 'book' ? 'Reading' : 'Watching' },
    { key: 'finished',  label: 'Finished' },
    { key: 'loved_it',  label: 'Loved It ❤️' },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Watchlist</h1>
          <p className="text-sm text-gray-400 mt-0.5">Movies, TV, and books</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition-colors">
          <Plus size={16} />
          Add
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2">
        {([['media', Tv, 'Movies & TV'], ['book', BookOpen, 'Books']] as const).map(([t, Icon, label]) => (
          <button
            key={t}
            onClick={() => { setTab(t); setStatusFilter(null) }}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors',
              tab === t
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
            )}>
            <Icon size={15} />
            {label}
            {counts.all > 0 && (
              <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', tab === t ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-700 text-gray-500')}>
                {tab === t ? counts.all : items.filter(i => t === 'media' ? i.type === 'movie' || i.type === 'tv' : i.type === 'book').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Status filter pills */}
      {tabItems.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          {STATUS_FILTERS.map(f => {
            const cnt = f.key === null ? counts.all : counts[f.key] ?? 0
            if (f.key !== null && cnt === 0) return null
            return (
              <button
                key={String(f.key)}
                onClick={() => setStatusFilter(f.key)}
                className={cn(
                  'flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0',
                  statusFilter === f.key
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
                )}>
                {f.label}
                <span className={cn('text-[10px] font-bold', statusFilter === f.key ? 'opacity-70' : 'text-gray-400')}>
                  {cnt}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Search */}
      {tabItems.length > 4 && (
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter your list…"
            className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
              <X size={14} className="text-gray-400" />
            </button>
          )}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-3 gap-3">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="aspect-[2/3] bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-4xl mb-3">{tab === 'book' ? '📚' : '🎬'}</p>
          {tabItems.length === 0 ? (
            <>
              <p className="text-gray-500 font-medium">Nothing here yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Hit <strong>Add</strong> to search {tab === 'book' ? 'books' : 'movies and TV shows'}
              </p>
            </>
          ) : (
            <p className="text-gray-400">No items match your filter</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {filtered.map(item => (
            <ItemCard key={item.id} item={item} onClick={() => setSelected(item)} />
          ))}
        </div>
      )}

      {/* Sheets */}
      {showAdd && (
        <AddSheet
          defaultTab={tab}
          onClose={() => setShowAdd(false)}
          onAdded={handleAdded}
        />
      )}
      {selected && (
        <DetailSheet
          item={selected}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  )
}
