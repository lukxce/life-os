export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { utcMidnight } from '@/lib/utils'

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10)
}

// Consecutive days (walking back from yesterday — today's still in progress)
// where every task added for that day was completed. A day with zero tasks
// neither breaks nor extends the streak — it's just skipped, since there's
// no real signal either way.
export async function GET(req: NextRequest) {
  const dateParam = req.nextUrl.searchParams.get('date')
  if (!dateParam) return NextResponse.json({ error: 'Missing date' }, { status: 400 })

  const today = utcMidnight(dateParam)
  const lookback = new Date(today)
  lookback.setUTCDate(lookback.getUTCDate() - 60)

  const tasks = await prisma.dailyTask.findMany({
    where: { date: { gte: lookback, lt: today } },
    select: { date: true, completed: true },
  })

  const byDay = new Map<string, { total: number; completed: number }>()
  for (const t of tasks) {
    const key = dayKey(new Date(t.date))
    const entry = byDay.get(key) ?? { total: 0, completed: 0 }
    entry.total++
    if (t.completed) entry.completed++
    byDay.set(key, entry)
  }

  let streak = 0
  const cursor = new Date(today)
  for (let i = 0; i < 60; i++) {
    cursor.setUTCDate(cursor.getUTCDate() - 1)
    const day = byDay.get(dayKey(cursor))
    if (!day) continue // nothing planned that day — skip, don't break
    if (day.completed === day.total) streak++
    else break
  }

  return NextResponse.json({ streak }, { headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' } })
}
