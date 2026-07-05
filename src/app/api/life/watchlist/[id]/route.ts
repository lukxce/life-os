export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PATCH /api/life/watchlist/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const body = await req.json()
  const {
    status, myRating, notes, finishedAt,
    streamingOn, genres, overview, posterUrl, year, tmdbRating,
  } = body

  const data: Record<string, unknown> = {}
  if (status      !== undefined) data.status      = status
  if (myRating    !== undefined) data.myRating    = myRating
  if (notes       !== undefined) data.notes       = notes
  if (finishedAt  !== undefined) data.finishedAt  = finishedAt ? new Date(finishedAt) : null
  if (streamingOn !== undefined) data.streamingOn = streamingOn
  if (genres      !== undefined) data.genres      = genres
  if (overview    !== undefined) data.overview    = overview
  if (posterUrl   !== undefined) data.posterUrl   = posterUrl
  if (year        !== undefined) data.year        = year
  if (tmdbRating  !== undefined) data.tmdbRating  = tmdbRating

  const item = await prisma.watchlistItem.update({
    where: { id: params.id },
    data,
  })

  return NextResponse.json(item)
}

// DELETE /api/life/watchlist/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  await prisma.watchlistItem.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
