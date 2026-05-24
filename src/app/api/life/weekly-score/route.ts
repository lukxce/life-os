import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isScheduledDay, startOfDay } from '@/lib/utils'

function mondayOf(date: Date): Date {
  const d = startOfDay(new Date(date))
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return d
}

function scoreForWeek(habits: { frequency: string; frequencyDays: number[]; createdAt: Date; category: string; logs: { date: Date; completed: boolean }[] }[], monday: Date): { score: number; completed: number; total: number } {
  let total = 0
  let completed = 0
  const sunday = new Date(monday)
  sunday.setDate(sunday.getDate() + 6)
  const today = startOfDay(new Date())

  for (const h of habits) {
    if (h.category === 'Weekly Check-in') continue
    const cursor = new Date(monday)
    while (cursor <= sunday && cursor <= today) {
      if (isScheduledDay(h, cursor)) {
        total++
        const t = cursor.getTime()
        const log = h.logs.find(l => startOfDay(new Date(l.date)).getTime() === t)
        if (log?.completed) completed++
      }
      cursor.setDate(cursor.getDate() + 1)
    }
  }

  return { score: total > 0 ? Math.round((completed / total) * 100) : 0, completed, total }
}

export async function GET() {
  const today = startOfDay(new Date())
  const thisMonday = mondayOf(today)
  const lastMonday = new Date(thisMonday)
  lastMonday.setDate(lastMonday.getDate() - 7)

  const from = new Date(lastMonday)

  const habits = await prisma.habit.findMany({
    where: { active: true },
    include: {
      logs: {
        where: { date: { gte: from } },
        select: { date: true, completed: true },
      },
    },
  })

  const thisWeek = scoreForWeek(habits, thisMonday)
  const lastWeek = scoreForWeek(habits, lastMonday)
  const delta = thisWeek.score - lastWeek.score
  const direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'same'

  return NextResponse.json({ thisWeek, lastWeek, delta, direction })
}
