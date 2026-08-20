export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { utcMidnight } from '@/lib/utils'

// Manual life-event tags ("alcohol", "shared_bed", "vitamins", ...) plus the
// same tags auto-deduced from meal/habit text by the day-log auto-narrative
// (source: "auto"). Same shape as the WaterLog/MealLog CRUD — append-only,
// a day can have multiple rows of the same type.

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const dateParam = sp.get('date')
  const from = sp.get('from')
  const to = sp.get('to')

  if (dateParam) {
    const events = await prisma.journalEvent.findMany({ where: { date: utcMidnight(dateParam) }, orderBy: { createdAt: 'asc' } })
    return NextResponse.json(events)
  }
  if (from && to) {
    const events = await prisma.journalEvent.findMany({
      where: { date: { gte: utcMidnight(from), lte: utcMidnight(to) } },
      orderBy: { date: 'desc' },
    })
    return NextResponse.json(events)
  }
  return NextResponse.json({ error: 'date or from/to required' }, { status: 400 })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { date: dateStr, type, notes, source } = body
  if (!dateStr || !type) return NextResponse.json({ error: 'date and type required' }, { status: 400 })

  const event = await prisma.journalEvent.create({
    data: { date: utcMidnight(dateStr), type, notes: notes ?? null, source: source === 'auto' ? 'auto' : 'manual' },
  })
  return NextResponse.json(event)
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await prisma.journalEvent.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
