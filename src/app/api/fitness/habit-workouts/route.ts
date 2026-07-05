export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const FITNESS_CATEGORIES = ['fitness', 'exercise', 'sport', 'workout', 'training']

// Daily mobility/routine habits are tracked as habits but aren't workouts —
// keep them out of the workout history so it stays a log of real sessions.
const EXCLUDE = ['bend', 'circuit', 'bodyweight', 'stretch', 'mobility', 'steps']

function classify(name: string): string | null {
  const n = name.toLowerCase()
  if (EXCLUDE.some(k => n.includes(k))) return null
  if (/(bike|cycl|ride)/.test(n)) return 'cardio_bike'
  if (/(run|jog|swim|cardio|row)/.test(n)) return 'cardio_other'
  if (/(pt|gym|train|lift|strength)/.test(n)) return 'pt'
  if (/(walk|rest|yoga)/.test(n)) return 'rest'
  return 'other'
}

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
    const type = classify(log.habit.name)
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
