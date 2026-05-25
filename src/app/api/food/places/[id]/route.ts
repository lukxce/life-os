import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const place = await prisma.place.findUnique({ where: { id: params.id } })
  if (!place) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(place)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const place = await prisma.place.update({
    where: { id: params.id },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.city !== undefined ? { city: body.city } : {}),
      ...(body.country !== undefined ? { country: body.country } : {}),
      ...(body.cuisine !== undefined ? { cuisine: body.cuisine } : {}),
      ...(body.category !== undefined ? { category: body.category } : {}),
      ...(body.myRating !== undefined ? { myRating: body.myRating ? Number(body.myRating) : null } : {}),
      ...(body.notes !== undefined ? { notes: body.notes || null } : {}),
      ...(body.mustOrder !== undefined ? { mustOrder: body.mustOrder || null } : {}),
      ...(body.priceRange !== undefined ? { priceRange: body.priceRange || null } : {}),
      ...(body.latitude !== undefined ? { latitude: Number(body.latitude) } : {}),
      ...(body.longitude !== undefined ? { longitude: Number(body.longitude) } : {}),
      ...(body.address !== undefined ? { address: body.address || null } : {}),
      ...(body.visitedAt !== undefined ? { visitedAt: body.visitedAt ? new Date(body.visitedAt) : null } : {}),
    },
  })
  return NextResponse.json(place)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await prisma.place.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
