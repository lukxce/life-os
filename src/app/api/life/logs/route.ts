export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { utcMidnight } from '@/lib/utils'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const habitId = searchParams.get('habitId')
  const date = searchParams.get('date')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const where: Record<string, unknown> = {}
  if (habitId) where.habitId = habitId
  if (date) {
    const d = utcMidnight(date)
    const next = new Date(d)
    next.setUTCDate(next.getUTCDate() + 1)
    where.date = { gte: d, lt: next }
  } else if (from || to) {
    where.date = {}
    if (from) (where.date as Record<string, unknown>).gte = utcMidnight(from)
    if (to) {
      const toEnd = utcMidnight(to)
      toEnd.setUTCDate(toEnd.getUTCDate() + 1)
      ;(where.date as Record<string, unknown>).lt = toEnd
    }
  }

  const logs = await prisma.habitLog.findMany({ where, orderBy: { date: 'asc' } })
  return NextResponse.json(logs)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const date = utcMidnight(body.date)

  const log = await prisma.habitLog.upsert({
    where: { habitId_date: { habitId: body.habitId, date } },
    update: {
      completed: body.completed,
      value: body.value ?? null,
      notes: body.notes ?? null,
      completedSubTaskIds: body.completedSubTaskIds ?? undefined,
    },
    create: {
      habitId: body.habitId,
      date,
      completed: body.completed,
      value: body.value ?? null,
      notes: body.notes ?? null,
      completedSubTaskIds: body.completedSubTaskIds ?? [],
    },
  })
  return NextResponse.json(log)
}

export async function PATCH(req: NextRequest) {
  const { id, ...data } = await req.json()
  const log = await prisma.habitLog.update({ where: { id }, data })
  return NextResponse.json(log)
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  await prisma.habitLog.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
