export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { classifyFromHabitName } from '@/lib/workoutType'

const FITNESS_CATEGORIES = ['fitness', 'exercise', 'sport', 'workout', 'training']

export async function GET(req: NextRequest) {
  const days = Math.min(parseInt(new URL(req.url).searchParams.get('days') ?? '30'), 90)
  const since = new Date()
  since.setDate(since.getDate() - days)
  since.setHours(0, 0, 0, 0)

  const logs = await prisma.habitLog.findMany({
    where: {
      completed: true,
      date: { gte: since },
      habit: {
        OR: FITNESS_CATEGORIES.map(c => ({ category: { contains: c, mode: 'insensitive' as const } })),
      },
    },
    include: { habit: { select: { name: true, icon: true } } },
    orderBy: { date: 'desc' },
  })

  const workouts = logs.flatMap(log => {
    const type = classifyFromHabitName(log.habit.name)
    if (!type) return []
    return [{
      id: `habit-${log.id}`,
      date: log.date.toISOString().slice(0, 10),
      type,
      duration: null,
      notes: null,
      habitName: log.habit.name,
      icon: log.habit.icon,
    }]
  })

  return NextResponse.json(workouts)
}
