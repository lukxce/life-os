export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const contact = await prisma.contact.update({
    where: { id: params.id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.emoji !== undefined && { emoji: body.emoji }),
      ...(body.color !== undefined && { color: body.color }),
      ...(body.birthday !== undefined && { birthday: body.birthday }),
      ...(body.reachOutFrequency !== undefined && { reachOutFrequency: body.reachOutFrequency }),
      ...(body.lastContactDate !== undefined && { lastContactDate: body.lastContactDate ? new Date(body.lastContactDate) : null }),
      ...(body.note !== undefined && { note: body.note }),
    },
  })
  return NextResponse.json(contact)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.contact.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
