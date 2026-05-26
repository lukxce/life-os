export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

const TMDB_BASE = 'https://api.themoviedb.org/3'
const TMDB_IMG  = 'https://image.tmdb.org/t/p/w342'
const TMDB_KEY  = process.env.TMDB_API_KEY ?? ''

interface Provider {
  provider_name: string
  logo_path: string
}
interface RSProviders {
  flatrate?: Provider[]
  rent?: Provider[]
  buy?: Provider[]
}

// GET /api/life/tmdb/details?id=12345&type=movie|tv
// Returns details + watch providers for Serbia (RS)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id   = searchParams.get('id')
  const type = searchParams.get('type') // "movie" | "tv"

  if (!id || !type) return NextResponse.json({ error: 'id and type required' }, { status: 400 })
  if (!TMDB_KEY)    return NextResponse.json({ error: 'TMDB_API_KEY not set' }, { status: 503 })

  const endpoint = type === 'tv' ? 'tv' : 'movie'
  const url = `${TMDB_BASE}/${endpoint}/${id}?api_key=${TMDB_KEY}&language=en-US&append_to_response=watch%2Fproviders`

  const res = await fetch(url, { next: { revalidate: 3600 } })
  if (!res.ok) return NextResponse.json({ error: 'TMDB error' }, { status: 502 })

  const data = await res.json()

  // Extract streaming providers for Serbia
  const rsData: RSProviders | undefined = data['watch/providers']?.results?.RS
  const streamingOn: string[] = []

  if (rsData) {
    // Prioritise flatrate (subscription), then rent
    const sources = [...(rsData.flatrate ?? []), ...(rsData.rent ?? [])]
    for (const p of sources) {
      if (!streamingOn.includes(p.provider_name)) {
        streamingOn.push(p.provider_name)
      }
    }
  }

  const title = data.title ?? data.name ?? 'Unknown'
  const date  = data.release_date ?? data.first_air_date ?? ''

  return NextResponse.json({
    id:         data.id,
    type,
    title,
    year:       date ? new Date(date).getFullYear() : null,
    posterUrl:  data.poster_path ? `${TMDB_IMG}${data.poster_path}` : null,
    tmdbRating: data.vote_average ? Math.round(data.vote_average * 10) / 10 : null,
    overview:   data.overview ?? null,
    genres:     (data.genres ?? []).map((g: { name: string }) => g.name),
    streamingOn,
    runtime:    data.runtime ?? null,          // minutes (movie)
    seasons:    data.number_of_seasons ?? null, // TV only
  })
}
