export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const items = await prisma.purchaseItem.findMany({
    orderBy: [{ bought: 'asc' }, { priority: 'asc' }, { createdAt: 'desc' }]
  })
  return NextResponse.json(items)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const item = await prisma.purchaseItem.create({
    data: {
      name:     body.name,
      price:    body.price ? +body.price : null,
      currency: body.currency || 'EUR',
      priority: body.priority || 'medium',
      category: body.category || null,
      notes:    body.notes || null,
      url:      body.url || null,
    }
  })
  return NextResponse.json(item)
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, ...data } = body
  if (data.bought && !data.boughtAt) data.boughtAt = new Date()
  if (data.bought === false) data.boughtAt = null
  const item = await prisma.purchaseItem.update({ where: { id }, data })
  return NextResponse.json(item)
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  await prisma.purchaseItem.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
