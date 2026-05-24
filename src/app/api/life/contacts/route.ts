import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const contacts = await prisma.contact.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] })
  return NextResponse.json(contacts)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const count = await prisma.contact.count()
  const contact = await prisma.contact.create({
    data: {
      name: body.name,
      emoji: body.emoji ?? null,
      color: body.color ?? '#6366f1',
      birthday: body.birthday ?? null,
      reachOutFrequency: body.reachOutFrequency ?? 'monthly',
      lastContactDate: body.lastContactDate ? new Date(body.lastContactDate) : null,
      note: body.note ?? null,
      order: count,
    },
  })
  return NextResponse.json(contact)
}
