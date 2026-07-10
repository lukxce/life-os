export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isScheduledDay, utcMidnight } from '@/lib/utils'

// One place for "everything you've missed so far today": habits whose
// window has opened but aren't done, meals whose window passed unlogged,
// and whether any expense has been recorded yet. All real queries — the
// card renders nothing when there's genuinely nothing to catch up on.

// A habit counts once its own time-of-day window has opened
const TIME_THRESHOLD: Record<string, number> = { morning: 5, noon: 12, night: 18, all_day: 0 }
// Meal windows open 12:00 / 15:30 / 19:00 — count as "missed" 45 min after
const MEAL_OPEN_MIN: Record<string, number> = { breakfast: 12 * 60 + 45, snack: 15 * 60 + 75, dinner: 19 * 60 + 45 }
const MEAL_ORDER: Record<string, number> = { breakfast: 0, snack: 1, dinner: 2 }

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const now = new Date()
  // Client-local time, same convention as right-now/nudges — never the server's clock
  const hour = sp.has('h') ? parseInt(sp.get('h')!) : now.getUTCHours()
  const minute = sp.has('m') ? parseInt(sp.get('m')!) : now.getUTCMinutes()
  const localDate = sp.get('date') ?? now.toISOString().slice(0, 10)
  const today = utcMidnight(localDate)
  const nowMin = hour * 60 + minute
  const jsDow = new Date(localDate + 'T12:00:00Z').getUTCDay()
  const dow = jsDow === 0 ? 7 : jsDow // MealPlanSlot: 1=Mon … 7=Sun

  const [habits, mealPlan, mealLogs, expensesToday, noExpCfg] = await Promise.all([
    prisma.habit.findMany({
      where: { active: true, paused: false, category: { not: 'Weekly Check-in' } },
      include: { logs: { where: { date: { gte: today } }, select: { completed: true } } },
    }),
    prisma.mealPlanSlot.findMany({ where: { dayOfWeek: dow } }),
    prisma.mealLog.findMany({ where: { date: today } }),
    prisma.expenseEntry.count({ where: { date: { gte: today } } }),
    prisma.appConfig.findUnique({ where: { key: `no-expenses:${localDate}` } }),
  ])

  const pendingHabits = habits
    .filter(h =>
      isScheduledDay(h, today) &&
      !h.logs.some(l => l.completed) &&
      hour >= (TIME_THRESHOLD[h.timeOfDay] ?? 0)
    )
    .map(h => ({ id: h.id, name: h.name }))

  const loggedTypes = new Set(mealLogs.map(l => l.mealType))
  const unloggedMeals = mealPlan
    .filter(mp => MEAL_OPEN_MIN[mp.mealType] != null && nowMin >= MEAL_OPEN_MIN[mp.mealType] && !loggedTypes.has(mp.mealType))
    .sort((a, b) => (MEAL_ORDER[a.mealType] ?? 9) - (MEAL_ORDER[b.mealType] ?? 9))
    .map(mp => ({ mealType: mp.mealType, plannedName: mp.name }))

  return NextResponse.json({
    pendingHabits,
    unloggedMeals,
    expensesToday,
    noExpenses: noExpCfg?.value === 'true',
  }, {
    headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' },
  })
}

// "No spending today" is an answer worth remembering, not a dismissal to
// re-ask on every device — persisted per-date so it sticks everywhere
export async function POST(req: NextRequest) {
  const { date, action } = await req.json()
  if (!date || action !== 'no-expenses') return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  const key = `no-expenses:${date}`
  await prisma.appConfig.upsert({
    where: { key },
    update: { value: 'true' },
    create: { key, value: 'true' },
  })
  return NextResponse.json({ ok: true })
}
