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
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=12&langRestrict=en${keyParam}`

  const res = await fetch(url, { next: { revalidate: 60 } })
  if (!res.ok) return NextResponse.json({ error: 'Google Books error' }, { status: 502 })

  const data = await res.json()
  if (!data.items) return NextResponse.json([])

  const results = data.items.map((item: { id: string; volumeInfo: VolumeInfo }) => {
    const v = item.volumeInfo
    // Google Books returns http thumbnails — upgrade to https
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
