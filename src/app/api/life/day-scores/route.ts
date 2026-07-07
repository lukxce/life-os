export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isScheduledDay, startOfDay } from '@/lib/utils'

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Daily completion scores for the last N days + the current best streak.
// One query; everything else is synthesized in memory.
export async function GET(req: NextRequest) {
  const days = Math.min(parseInt(new URL(req.url).searchParams.get('days') ?? '14'), 60)
  const today = startOfDay(new Date())
  const start = new Date(today)
  start.setDate(start.getDate() - (days - 1))
  // Streak lookback goes further than the trend window
  const logFrom = new Date(today)
  logFrom.setDate(logFrom.getDate() - 120)

  const habits = await prisma.habit.findMany({
    where: { active: true, paused: false },
    include: {
      logs: {
        where: { date: { gte: logFrom } },
        select: { date: true, completed: true },
      },
    },
  })

  const tracked = habits.filter(h => h.category !== 'Weekly Check-in')

  // Index logs by habit+day for O(1) lookups
  const logMap = new Map<string, boolean>()
  for (const h of tracked) {
    for (const l of h.logs) {
      logMap.set(`${h.id}|${dayKey(startOfDay(new Date(l.date)))}`, l.completed)
    }
  }

  // Daily scores
  const result: { date: string; score: number; completed: number; total: number }[] = []
  const cursor = new Date(start)
  while (cursor <= today) {
    let total = 0, completed = 0
    for (const h of tracked) {
      if (new Date(h.createdAt) > cursor) continue
      if (!isScheduledDay(h, cursor)) continue
      total++
      if (logMap.get(`${h.id}|${dayKey(cursor)}`)) completed++
    }
    result.push({
      date: dayKey(cursor),
      score: total > 0 ? Math.round((completed / total) * 100) : 0,
      completed, total,
    })
    cursor.setDate(cursor.getDate() + 1)
  }

  // Best current streak across habits (today may still be pending — start
  // counting from today if done, else from yesterday)
  let best = { name: '', icon: null as string | null, count: 0 }
  for (const h of tracked) {
    let count = 0
    const c = new Date(today)
    if (isScheduledDay(h, c) && !logMap.get(`${h.id}|${dayKey(c)}`)) {
      c.setDate(c.getDate() - 1) // today not done yet — streak may still be alive
    }
    for (let guard = 0; guard < 120; guard++) {
      if (new Date(h.createdAt) > c) break
      if (isScheduledDay(h, c)) {
        if (logMap.get(`${h.id}|${dayKey(c)}`)) count++
        else break
      }
      c.setDate(c.getDate() - 1)
    }
    if (count > best.count) best = { name: h.name, icon: h.icon, count }
  }

  return NextResponse.json({ days: result, bestStreak: best }, {
    headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' },
  })
}
