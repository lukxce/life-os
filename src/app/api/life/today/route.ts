export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isScheduledDay, utcMidnight } from '@/lib/utils'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const dateParam = searchParams.get('date')
  const day = utcMidnight(dateParam ?? new Date().toISOString())
  const tomorrow = new Date(day)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)

  const habits = await prisma.habit.findMany({
    where: { active: true, paused: false },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    include: {
      logs: {
        where: { date: { gte: day, lt: tomorrow } },
        take: 1,
      },
      subTasks: { orderBy: { order: 'asc' } },
    },
  })

  const result = habits
    .filter((h) => isScheduledDay(h, day))
    .map((h) => ({
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
        updatedAt: h.updatedAt,
        subTasks: h.subTasks,
      },
      log: h.logs[0] ?? null,
      isScheduled: true,
    }))

  return NextResponse.json(result)
}
