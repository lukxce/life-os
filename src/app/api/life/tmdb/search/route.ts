export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

const TMDB_BASE  = 'https://api.themoviedb.org/3'
const TMDB_IMG   = 'https://image.tmdb.org/t/p/w342'
const TMDB_KEY   = process.env.TMDB_API_KEY ?? ''

// Genre ID → name map (TMDB standard)
const GENRE_MAP: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
  80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
  14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
  9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 53: 'Thriller',
  10752: 'War', 37: 'Western', 10759: 'Action & Adventure',
  10762: 'Kids', 10763: 'News', 10764: 'Reality', 10765: 'Sci-Fi & Fantasy',
  10766: 'Soap', 10767: 'Talk', 10768: 'War & Politics',
}

interface TMDBResult {
  id: number
  media_type: string
  title?: string
  name?: string
  release_date?: string
  first_air_date?: string
  poster_path?: string | null
  vote_average?: number
  overview?: string
  genre_ids?: number[]
}

// GET /api/life/tmdb/search?q=...
export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get('q')?.trim()
  if (!q) return NextResponse.json([])
  if (!TMDB_KEY) return NextResponse.json({ error: 'TMDB_API_KEY not set' }, { status: 503 })

  const url = `${TMDB_BASE}/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}&language=en-US&page=1&include_adult=false`
  const res  = await fetch(url, { next: { revalidate: 60 } })
  if (!res.ok) return NextResponse.json({ error: 'TMDB error' }, { status: 502 })

  const data = await res.json()
  const results = (data.results as TMDBResult[])
    .filter(r => r.media_type === 'movie' || r.media_type === 'tv')
    .slice(0, 12)
    .map(r => ({
      id:         r.id,
      type:       r.media_type as 'movie' | 'tv',
      title:      (r.title ?? r.name) || 'Unknown',
      year:       new Date((r.release_date ?? r.first_air_date) || '').getFullYear() || null,
      posterUrl:  r.poster_path ? `${TMDB_IMG}${r.poster_path}` : null,
      tmdbRating: r.vote_average ? Math.round(r.vote_average * 10) / 10 : null,
      overview:   r.overview || null,
      genres:     (r.genre_ids ?? []).map(id => GENRE_MAP[id]).filter(Boolean),
    }))

  return NextResponse.json(results)
}
