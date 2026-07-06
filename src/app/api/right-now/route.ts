export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isScheduledDay, utcMidnight } from '@/lib/utils'

// ── Real, first-party data only. No invented urgency, no fake countdowns. ──
// "Now" is always the CLIENT's local clock, passed in as query params — the
// server has no business deciding what time it is for you (the habit-log
// bug earlier was exactly this mistake: server-local time silently used
// where user-local time was meant).

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const MEAL_TIMES: Record<string, string> = { breakfast: '12:00', snack: '15:30', dinner: '19:00' }
const TRAINING_PLAN: Record<number, { activity: string; type: 'pt' | 'cardio_bike' | 'rest' }> = {
  1: { activity: 'PT Session',  type: 'pt' },
  2: { activity: 'Bike Ride',   type: 'cardio_bike' },
  3: { activity: 'PT Session',  type: 'pt' },
  4: { activity: 'Active Rest', type: 'rest' },
  5: { activity: 'PT Session',  type: 'pt' },
  6: { activity: 'Long Ride',   type: 'cardio_bike' },
  7: { activity: 'Full Rest',   type: 'rest' },
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + (m ?? 0)
}

function timeOfDayBucket(nowMin: number): string {
  if (nowMin < 12 * 60) return 'morning'
  if (nowMin < 18 * 60) return 'noon'
  return 'night'
}

interface RightNowItem {
  id: string
  kind: 'meeting' | 'meal' | 'habit' | 'training'
  urgency: number // lower = sooner/more pressing
  title: string
  detail: string
  href: string
  habits?: { id: string; name: string }[] // present only for kind === 'habit' — real records to check off inline
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const now = new Date()
  // Client-local time — falls back to server time only if the caller omits it
  const localHour = sp.has('h') ? parseInt(sp.get('h')!) : now.getUTCHours()
  const localMinute = sp.has('m') ? parseInt(sp.get('m')!) : now.getUTCMinutes()
  const localDow = sp.has('dow') ? parseInt(sp.get('dow')!) : now.getUTCDay()
  const localDate = sp.get('date') ?? now.toISOString().slice(0, 10)

  const nowMin = localHour * 60 + localMinute
  const dow = localDow || 7
  const dayKey = DAY_KEYS[localDow]
  const today = utcMidnight(localDate)

  const items: RightNowItem[] = []

  // ── Schedule: your recurring weekly blocks, current or starting soon ──────
  const blocks = await prisma.scheduleBlock.findMany({ where: { day: dayKey }, orderBy: { startTime: 'asc' } })
  for (const b of blocks) {
    const start = toMinutes(b.startTime)
    const end = b.endTime ? toMinutes(b.endTime) : start + 30
    if (nowMin >= start && nowMin <= end) {
      items.push({ id: `block-${b.id}`, kind: 'meeting', urgency: 0, title: b.name, detail: 'happening now', href: '/schedule' })
    } else if (start > nowMin && start - nowMin <= 60) {
      items.push({ id: `block-${b.id}`, kind: 'meeting', urgency: start - nowMin, title: b.name, detail: `in ${start - nowMin} min`, href: '/schedule' })
    }
  }

  // ── Fitness: always know what's next to eat, not just in a narrow window ─
  const meals = await prisma.mealPlanSlot.findMany({ where: { dayOfWeek: dow } })
  let bestMeal: { meal: (typeof meals)[number]; start: number; diff: number; upcoming: boolean } | null = null
  for (const meal of meals) {
    const mealTime = MEAL_TIMES[meal.mealType]
    if (!mealTime) continue
    const start = toMinutes(mealTime)
    const diff = start - nowMin // positive = upcoming, negative = already open
    // Prefer the meal whose window we're closest to being inside of:
    // "just opened" (0 to +150 min ago) beats "still to come"
    const withinOpen = diff <= 0 && diff >= -150
    if (!bestMeal || withinOpen) {
      if (!bestMeal || (withinOpen && !bestMeal.upcoming) || Math.abs(diff) < Math.abs(bestMeal.diff)) {
        bestMeal = { meal, start, diff, upcoming: diff > 0 }
      }
    }
  }
  if (bestMeal) {
    const { meal, diff, upcoming } = bestMeal
    const isOpen = diff <= 0 && diff >= -150
    items.push({
      id: `meal-${meal.id}`,
      kind: 'meal',
      urgency: isOpen ? 15 : upcoming ? 25 + diff : 200,
      title: meal.name,
      detail: isOpen
        ? `${meal.mealType} · ${meal.calories} kcal · window's open`
        : upcoming
          ? `${meal.mealType} in ${diff > 60 ? `${Math.round(diff / 60)}h` : `${diff} min`} · ${meal.calories} kcal`
          : `${meal.mealType} · ${meal.calories} kcal`,
      href: '/fitness',
    })
  }

  // ── Habits: due in the current time-of-day bucket, not yet done ──────────
  const bucket = timeOfDayBucket(nowMin)
  const habits = await prisma.habit.findMany({
    where: { active: true, paused: false, category: { not: 'Weekly Check-in' } },
    include: { logs: { where: { date: { gte: today } }, select: { completed: true } } },
  })
  const pendingHabits = habits.filter(h =>
    isScheduledDay(h, today) &&
    (h.timeOfDay === bucket || h.timeOfDay === 'all_day') &&
    !h.logs.some(l => l.completed)
  )
  if (pendingHabits.length > 0) {
    items.push({
      id: 'habits-now', kind: 'habit', urgency: 50,
      title: pendingHabits.length === 1 ? pendingHabits[0].name : `${pendingHabits.length} habits due this ${bucket}`,
      detail: 'tap to check off',
      href: '/life',
      habits: pendingHabits.map(h => ({ id: h.id, name: h.name })),
    })
  }

  // ── Training: session day, roughly workout hours, nothing logged ─────────
  const plan = TRAINING_PLAN[dow]
  if (plan.type !== 'rest' && nowMin >= 9 * 60 && nowMin <= 20 * 60) {
    const habitLogged = await prisma.habitLog.findFirst({
      where: { date: { gte: today }, completed: true, habit: { name: { contains: plan.activity.split(' ')[0], mode: 'insensitive' } } },
    })
    if (!habitLogged) {
      items.push({ id: 'training-today', kind: 'training', urgency: 60, title: plan.activity, detail: 'not logged yet', href: '/fitness/workouts' })
    }
  }

  items.sort((a, b) => a.urgency - b.urgency)

  // Mood: honest, not fabricated — either something real needs attention
  // (curious), or every habit due so far today is actually done (pleased),
  // or just steady (content). No invented composite score.
  const dueSoFar = habits.filter(h => isScheduledDay(h, today))
  const doneSoFar = dueSoFar.filter(h => h.logs.some(l => l.completed))
  const mood = items.some(i => i.urgency < 100)
    ? 'curious'
    : dueSoFar.length > 0 && doneSoFar.length === dueSoFar.length
      ? 'pleased'
      : 'content'

  return NextResponse.json({
    top: items[0] ?? null,
    upcoming: items.slice(1, 4),
    timeOfDay: bucket,
    mood,
  })
}
