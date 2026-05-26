import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const category = searchParams.get('category')
  const city = searchParams.get('city')
  const cuisine = searchParams.get('cuisine')

  const places = await prisma.place.findMany({
    where: {
      ...(category ? { category } : {}),
      ...(city ? { city } : {}),
      ...(cuisine ? { cuisine } : {}),
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(places)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const place = await prisma.place.create({
    data: {
      name: body.name,
      city: body.city ?? '',
      country: body.country ?? '',
      cuisine: body.cuisine ?? '',
      category: body.category ?? 'been',
      myRating: body.myRating ? Number(body.myRating) : null,
      notes: body.notes ?? null,
      mustOrder: body.mustOrder ?? null,
      priceRange: body.priceRange ?? null,
      latitude: Number(body.latitude),
      longitude: Number(body.longitude),
      address: body.address ?? null,
      visitedAt: body.visitedAt ? new Date(body.visitedAt) : null,
      googlePlaceId: body.googlePlaceId ?? null,
      photoUrl: body.photoUrl ?? null,
    },
  })
  return NextResponse.json(place)
}
