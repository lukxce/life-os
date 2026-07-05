export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  if (body._type === 'day') {
    const day = await prisma.scheduleDay.upsert({
      where: { day: params.id },
      update: { label: body.label, summary: body.summary },
      create: { day: params.id, label: body.label, summary: body.summary },
    })
    return NextResponse.json(day)
  }
  const block = await prisma.scheduleBlock.update({
    where: { id: params.id },
    data: {
      ...(body.day        !== undefined && { day: body.day }),
      startTime:    body.startTime,
      endTime:      body.endTime || null,
      name:         body.name,
      note:         body.note || null,
      category:     body.category,
      sacred:       body.sacred ?? false,
      frequency:    body.frequency || 'weekly',
      biweeklyRef:  body.biweeklyRef ?? null,
    },
  })
  return NextResponse.json(block)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await prisma.scheduleBlock.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
