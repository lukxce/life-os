export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isScheduledDay, utcMidnight } from '@/lib/utils'

// Everything except mood/notes is computed fresh from the tables that
// already track it — never duplicated into DailyLog itself.
async function buildSummary(date: Date) {
  const dayEnd = new Date(date); dayEnd.setUTCHours(23, 59, 59, 999)
  const jsDow = date.getUTCDay()

  const [habits, waterLogs, mealLogs, tasks, expenseCount, workouts] = await Promise.all([
    prisma.habit.findMany({
      where: { active: true, paused: false, category: { not: 'Weekly Check-in' } },
      include: { logs: { where: { date }, select: { completed: true } } },
    }),
    prisma.waterLog.findMany({ where: { date, drink: 'Water' } }),
    prisma.mealLog.findMany({ where: { date } }),
    prisma.dailyTask.findMany({ where: { date } }),
    prisma.expenseEntry.count({ where: { date: { gte: date, lte: dayEnd } } }),
    prisma.workoutLog.count({ where: { date: { gte: date, lte: dayEnd } } }),
  ])

  const dueToday = habits.filter(h => isScheduledDay(h, date))
  const habitsDone = dueToday.filter(h => h.logs[0]?.completed).length

  return {
    habitsDone,
    habitsTotal: dueToday.length,
    habitNames: dueToday.filter(h => h.logs[0]?.completed).map(h => h.name),
    waterMl: waterLogs.reduce((s, w) => s + w.volumeMl, 0),
    mealsLogged: mealLogs.filter(m => m.description).length,
    mealsSkipped: mealLogs.filter(m => !m.description).length,
    tasksDone: tasks.filter(t => t.completed).length,
    tasksTotal: tasks.length,
    expensesLogged: expenseCount,
    workoutsLogged: workouts,
  }
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const dateParam = sp.get('date')

  if (dateParam) {
    const date = utcMidnight(dateParam)
    const [log, summary] = await Promise.all([
      prisma.dailyLog.findUnique({ where: { date } }),
      buildSummary(date),
    ])
    return NextResponse.json({ log, summary })
  }

  // No date: recent history list
  const limit = Number(sp.get('limit') ?? 30)
  const logs = await prisma.dailyLog.findMany({ orderBy: { date: 'desc' }, take: limit })
  return NextResponse.json(logs)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { date: dateStr, mood, notes } = body
  if (!dateStr) return NextResponse.json({ error: 'date required' }, { status: 400 })
  const date = utcMidnight(dateStr)

  const log = await prisma.dailyLog.upsert({
    where: { date },
    create: { date, mood: mood ?? null, notes: notes ?? null },
    update: { mood: mood ?? undefined, notes: notes ?? undefined },
  })
  return NextResponse.json(log)
}
