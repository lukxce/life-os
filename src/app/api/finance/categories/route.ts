export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const categories = await prisma.category.findMany({
    where: type ? { type } : {},
    orderBy: { name: 'asc' }
  })
  return NextResponse.json(categories)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const category = await prisma.category.create({
    data: {
      name: body.name,
      type: body.type,
      subcategories: body.subcategories ?? ['Other'],
    }
  })
  return NextResponse.json(category)
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, ...data } = body
  const category = await prisma.category.update({ where: { id }, data })
  return NextResponse.json(category)
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  await prisma.category.delete({ where: { id } })
  return NextResponse.json({ success: true })
}