import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isScheduledDay, calcStreak, calcLongestStreak, startOfDay } from '@/lib/utils'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const period = Number(searchParams.get('period') ?? '30')
  const habitId = searchParams.get('habitId')

  const to = startOfDay(new Date())
  const from = new Date(to)
  if (period === 0) {
    from.setFullYear(from.getFullYear() - 10)
  } else {
    from.setDate(from.getDate() - (period - 1))
  }

  const habits = await prisma.habit.findMany({
    where: { active: true, ...(habitId ? { id: habitId } : {}) },
    orderBy: [{ order: 'asc' }],
    include: {
      logs: {
        where: { date: { gte: from } },
        orderBy: { date: 'asc' },
      },
    },
  })

  const habitStats = habits.map((h) => {
    const logMap = new Map<number, boolean>()
    for (const log of h.logs) {
      logMap.set(startOfDay(new Date(log.date)).getTime(), log.completed)
    }

    let scheduledDays = 0
    let completedDays = 0
    const cursor = new Date(from)
    while (cursor <= to) {
      if (isScheduledDay(h, cursor)) {
        scheduledDays++
        if (logMap.get(cursor.getTime())) completedDays++
      }
      cursor.setDate(cursor.getDate() + 1)
    }

    const completionRate = scheduledDays > 0 ? Math.round((completedDays / scheduledDays) * 100) : 0
    const currentStreak = calcStreak(h)
    const longestStreak = calcLongestStreak(h)

    return {
      habitId: h.id,
      name: h.name,
      icon: h.icon,
      color: h.color,
      currentStreak,
      longestStreak,
      completionRate,
      completedDays,
      scheduledDays,
    }
  })

  // Daily trend: completion rate per day across all habits
  const trend: { date: string; completionRate: number }[] = []
  const cursor2 = new Date(from)
  while (cursor2 <= to) {
    const t = cursor2.getTime()
    let sched = 0
    let done = 0
    for (const h of habits) {
      if (isScheduledDay(h, cursor2)) {
        sched++
        const log = h.logs.find((l) => startOfDay(new Date(l.date)).getTime() === t)
        if (log?.completed) done++
      }
    }
    trend.push({
      date: cursor2.toISOString().split('T')[0],
      completionRate: sched > 0 ? Math.round((done / sched) * 100) : 0,
    })
    cursor2.setDate(cursor2.getDate() + 1)
  }

  // Best day of week
  const dayTotals: { sched: number; done: number }[] = Array.from({ length: 7 }, () => ({
    sched: 0,
    done: 0,
  }))
  for (const entry of trend) {
    const d = new Date(entry.date + 'T00:00:00')
    const dow = d.getDay()
    for (const h of habits) {
      if (isScheduledDay(h, d)) {
        dayTotals[dow].sched++
        const log = h.logs.find(
          (l) => startOfDay(new Date(l.date)).getTime() === d.getTime()
        )
        if (log?.completed) dayTotals[dow].done++
      }
    }
  }
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const bestDayOfWeek = dayTotals.map((t, i) => ({
    day: dayNames[i],
    avgCompletionRate: t.sched > 0 ? Math.round((t.done / t.sched) * 100) : 0,
  }))

  return NextResponse.json({ habitStats, trend, bestDayOfWeek })
}
