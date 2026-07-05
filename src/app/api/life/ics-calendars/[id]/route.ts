export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const cal = await prisma.iCSCalendar.update({
    where: { id: params.id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.url !== undefined && { url: body.url }),
      ...(body.color !== undefined && { color: body.color }),
    },
  })
  return NextResponse.json(cal)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.iCSCalendar.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
