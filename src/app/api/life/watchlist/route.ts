export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/life/watchlist
// ?type=media|movie|tv|book   → filter by type  (media = movie+tv combined)
// ?status=want_to|currently|finished|loved_it  → filter by status
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type   = searchParams.get('type')
  const status = searchParams.get('status')

  const where: Record<string, unknown> = { userId: 'default' }

  if (type === 'media') {
    where.type = { in: ['movie', 'tv'] }
  } else if (type) {
    where.type = type
  }
  if (status) where.status = status

  const items = await prisma.watchlistItem.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json(items)
}

// POST /api/life/watchlist
export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    type, status, title,
    externalId, posterUrl, year, genres, overview,
    author, tmdbRating, streamingOn, myRating, notes,
  } = body

  if (!type || !status || !title) {
    return NextResponse.json({ error: 'type, status, title required' }, { status: 400 })
  }

  const item = await prisma.watchlistItem.create({
    data: {
      userId: 'default',
      type, status, title,
      externalId: externalId ?? null,
      posterUrl:  posterUrl  ?? null,
      year:       year       ?? null,
      genres:     genres     ?? [],
      overview:   overview   ?? null,
      author:     author     ?? null,
      tmdbRating: tmdbRating ?? null,
      streamingOn: streamingOn ?? [],
      myRating:   myRating   ?? null,
      notes:      notes      ?? null,
    },
  })

  return NextResponse.json(item)
}
