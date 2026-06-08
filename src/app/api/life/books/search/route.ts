export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

const BOOKS_KEY = process.env.GOOGLE_BOOKS_API_KEY ?? ''

interface VolumeInfo {
  title?: string
  authors?: string[]
  publishedDate?: string
  description?: string
  imageLinks?: { thumbnail?: string; smallThumbnail?: string }
  categories?: string[]
  averageRating?: number
  pageCount?: number
  language?: string
}

// GET /api/life/books/search?q=...
export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get('q')?.trim()
  if (!q) return NextResponse.json([])

  const keyParam = BOOKS_KEY ? `&key=${BOOKS_KEY}` : ''
  // printType=books avoids magazines; orderBy=relevance gives best matches
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=15&printType=books&orderBy=relevance${keyParam}`

  let res: Response
  try {
    res = await fetch(url, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LifeOS/1.0)',
        'Accept': 'application/json',
      },
    })
  } catch (err) {
    console.error('[books] network error:', err)
    return NextResponse.json(
      { error: 'Network error reaching Google Books', details: String(err) },
      { status: 502 }
    )
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error('[books] Google Books API error:', res.status, body)
    return NextResponse.json(
      { error: `Google Books returned ${res.status}`, hint: BOOKS_KEY ? 'Check GOOGLE_BOOKS_API_KEY is valid' : 'No API key set — add GOOGLE_BOOKS_API_KEY env var' },
      { status: 502 }
    )
  }

  let data: any
  try {
    data = await res.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON from Google Books' }, { status: 502 })
  }

  if (!data.items || !Array.isArray(data.items)) {
    // totalItems === 0 means genuinely no results
    return NextResponse.json([])
  }

  const results = data.items
    .filter((item: any) => item?.volumeInfo)
    .map((item: { id: string; volumeInfo: VolumeInfo }) => {
      const v = item.volumeInfo
      const rawThumb = v.imageLinks?.thumbnail ?? v.imageLinks?.smallThumbnail ?? null
      const posterUrl = rawThumb ? rawThumb.replace('http://', 'https://') : null
      const year = v.publishedDate ? parseInt(v.publishedDate.slice(0, 4), 10) || null : null

      return {
        id:         item.id,
        type:       'book' as const,
        title:      v.title ?? 'Unknown',
        author:     (v.authors ?? []).join(', ') || null,
        year,
        posterUrl,
        overview:   v.description ?? null,
        genres:     v.categories ?? [],
        tmdbRating: v.averageRating ?? null,
        pageCount:  v.pageCount ?? null,
      }
    })

  return NextResponse.json(results)
}
