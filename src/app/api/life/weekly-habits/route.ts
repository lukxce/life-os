import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startOfDay } from '@/lib/utils'

export const dynamic = 'force-dynamic'

function mondayOf(date: Date): Date {
  const d = startOfDay(new Date(date))
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  return d
}

export async function GET() {
  const today = startOfDay(new Date())
  const monday = mondayOf(today)
  const nextMonday = new Date(monday)
  nextMonday.setDate(nextMonday.getDate() + 7)

  const threeMonthsAgo = new Date(today)
  threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 90)

  const habits = await prisma.habit.findMany({
    where: { active: true, paused: false, frequency: 'specific_days' },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    include: {
      logs: {
        where: { date: { gte: threeMonthsAgo } },
        orderBy: { date: 'asc' },
      },
      subTasks: { orderBy: { order: 'asc' } },
    },
  })

  // Only show habits scheduled for exactly one day per week.
  // Multi-day habits (Mon/Wed/Fri etc.) appear in the daily Today view — not here.
  const singleDayHabits = habits.filter(h => h.frequencyDays.length === 1)

  const result = singleDayHabits.map(h => {
    const thisWeekLogs = h.logs.filter(l => {
      const d = new Date(l.date)
      return d >= monday && d < nextMonday
    })
    const completedThisWeek = thisWeekLogs.some(l => l.completed)
    const thisWeekLog = thisWeekLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] ?? null

    return {
      habit: {
        id: h.id,
        name: h.name,
        category: h.category,
        type: h.type,
        unit: h.unit,
        target: h.target,
        frequency: h.frequency,
        frequencyDays: h.frequencyDays,
        timeOfDay: h.timeOfDay,
        icon: h.icon,
        color: h.color,
        order: h.order,
        active: h.active,
        createdAt: h.createdAt,
        subTasks: h.subTasks,
      },
      completedThisWeek,
      thisWeekLog,
      recentLogs: h.logs.map(l => ({ date: l.date, completed: l.completed, value: l.value })),
    }
  })

  return NextResponse.json(result)
}
