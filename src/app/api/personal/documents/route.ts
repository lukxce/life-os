export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const docs = await prisma.adminDocument.findMany({ orderBy: { expiryDate: 'asc' } })
  return NextResponse.json(docs)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const doc = await prisma.adminDocument.create({
    data: {
      name: body.name,
      category: body.category,
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
      reminderDays: body.reminderDays ?? 30,
      notes: body.notes || null,
    },
  })
  return NextResponse.json(doc)
}

export async function PATCH(req: NextRequest) {
  const { id, ...data } = await req.json()
  if (data.expiryDate) data.expiryDate = new Date(data.expiryDate)
  else if (data.expiryDate === '') data.expiryDate = null
  const doc = await prisma.adminDocument.update({ where: { id }, data })
  return NextResponse.json(doc)
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  await prisma.adminDocument.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
