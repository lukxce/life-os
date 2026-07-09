export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { utcMidnight } from '@/lib/utils'

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date')
  if (!date) return NextResponse.json({ error: 'Missing date' }, { status: 400 })
  const logs = await prisma.waterLog.findMany({
    where: { date: utcMidnight(date) },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(logs, { headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' } })
}

// Life OS already has a "Water" entry in the Habit system (the one that
// shows up in the habits checklist) — this quick-add was a second, entirely
// disconnected water tracker. Logging real water here now also marks that
// habit done for the day, instead of maintaining two separate answers to
// "did I drink water today."
async function syncWaterHabit(date: Date) {
  const habit = await prisma.habit.findFirst({
    where: { name: { contains: 'water', mode: 'insensitive' }, active: true, paused: false },
  })
  if (!habit) return

  const existing = await prisma.habitLog.findUnique({ where: { habitId_date: { habitId: habit.id, date } } })
  if (existing?.completed) return // already done — nothing to change

  // Only write a quantity value when the habit's own unit is unambiguously
  // "ml" — otherwise we'd risk stamping a wrong-unit number (e.g. "L" or
  // "glasses") over whatever the habit actually expects
  if (habit.target != null && habit.unit?.toLowerCase() === 'ml') {
    const totalMl = await prisma.waterLog.aggregate({
      where: { date, drink: { equals: 'Water', mode: 'insensitive' } },
      _sum: { volumeMl: true },
    })
    const value = totalMl._sum.volumeMl ?? 0
    await prisma.habitLog.upsert({
      where: { habitId_date: { habitId: habit.id, date } },
      update: { value, completed: value >= habit.target },
      create: { habitId: habit.id, date, value, completed: value >= habit.target },
    })
  } else {
    await prisma.habitLog.upsert({
      where: { habitId_date: { habitId: habit.id, date } },
      update: { completed: true },
      create: { habitId: habit.id, date, completed: true },
    })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { date, drink, volumeMl } = body
  if (!date || !volumeMl) return NextResponse.json({ error: 'Missing date or volumeMl' }, { status: 400 })

  const day = utcMidnight(date)
  const resolvedDrink = drink?.trim() || 'Water'
  const log = await prisma.waterLog.create({
    data: { date: day, drink: resolvedDrink, volumeMl: Math.round(volumeMl) },
  })

  if (resolvedDrink.toLowerCase() === 'water') {
    await syncWaterHabit(day).catch(() => {}) // never let this block the actual log
  }

  return NextResponse.json(log)
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  await prisma.waterLog.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
