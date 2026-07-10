export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isScheduledDay, utcMidnight } from '@/lib/utils'

// ── The companion's brain, v2 ─────────────────────────────────────────────────
// Still real signals only — but now every nudge carries a priority score
// (a streak about to die outranks a generic reminder), the payload needed
// to ACT on it inline from the popup (habits to check, meals to log),
// and when there's genuinely nothing left, a celebration built from real
// numbers instead of a shrug.

export interface Nudge {
  id: string
  module: string
  score: number // higher = more pressing
  message: string
  href: string
  habits?: { id: string; name: string }[] // inline-checkable
  meals?: { mealType: string; plannedName: string }[] // inline-loggable
  action?: 'no-expenses' // inline-answerable
}

const FREQ_DAYS: Record<string, number> = { weekly: 7, monthly: 30, quarterly: 90, yearly: 365 }
// A habit only becomes nudge-worthy once its own window has opened
const TIME_THRESHOLD: Record<string, number> = { morning: 5, noon: 12, night: 18, all_day: 0 }
// Meal windows open 12:00 / 15:30 / 19:00 — nudge roughly an hour after
const MEAL_NUDGE_HOUR: Record<string, number> = { breakfast: 13, snack: 17, dinner: 20 }

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10)
}

/** Consecutive completed days walking back from yesterday (today may still be pending) */
function currentStreak(
  habit: { frequency: string; frequencyDays: number[]; createdAt: Date },
  logsByDay: Set<string>,
  today: Date,
): number {
  let streak = 0
  const cursor = new Date(today)
  for (let i = 0; i < 90; i++) {
    cursor.setUTCDate(cursor.getUTCDate() - 1)
    if (new Date(habit.createdAt) > cursor) break
    if (!isScheduledDay(habit, cursor)) continue // off-days don't break streaks
    if (logsByDay.has(dayKey(cursor))) streak++
    else break
  }
  return streak
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const now = new Date()
  // Client-local time — never the server's clock (Vercel is always UTC)
  const hour = sp.has('h') ? parseInt(sp.get('h')!) : now.getUTCHours()
  const localDate = sp.get('date') ?? now.toISOString().slice(0, 10)
  const today = utcMidnight(localDate)
  const [ly, lmo, ld] = localDate.split('-').map(Number)
  const jsDow = new Date(localDate + 'T12:00:00Z').getUTCDay()
  const dow = jsDow === 0 ? 7 : jsDow // MealPlanSlot: 1=Mon … 7=Sun
  const streakLookback = new Date(today)
  streakLookback.setUTCDate(streakLookback.getUTCDate() - 90)

  const nudges: Nudge[] = []

  const [habits, mealPlan, mealLogsToday, bills, expenseCount, noExpCfg, lastWeight, contacts] = await Promise.all([
    prisma.habit.findMany({
      where: { active: true, paused: false, category: { not: 'Weekly Check-in' } },
      include: { logs: { where: { date: { gte: streakLookback }, completed: true }, select: { date: true } } },
    }),
    prisma.mealPlanSlot.findMany({ where: { dayOfWeek: dow } }),
    prisma.mealLog.findMany({ where: { date: today } }),
    prisma.bill.findMany({ where: { active: true, isLoan: false }, include: { payments: { orderBy: { paidDate: 'desc' }, take: 1 } } }),
    prisma.expenseEntry.count({ where: { date: { gte: today } } }),
    prisma.appConfig.findUnique({ where: { key: `no-expenses:${localDate}` } }),
    prisma.bodyMetric.findFirst({ where: { metric: 'weight' }, orderBy: { date: 'desc' } }),
    prisma.contact.findMany(),
  ])

  // ── Habits: pending in an open window; streaks at risk get top billing ────
  const todayKey = dayKey(today)
  const withState = habits.map(h => {
    const logDays = new Set(h.logs.map(l => dayKey(new Date(l.date))))
    return {
      habit: h,
      doneToday: logDays.has(todayKey),
      streak: currentStreak(h, logDays, today),
    }
  })
  const dueToday = withState.filter(s => isScheduledDay(s.habit, today))
  const pending = dueToday.filter(s => !s.doneToday && hour >= (TIME_THRESHOLD[s.habit.timeOfDay] ?? 0))

  const atRisk = pending.filter(s => s.streak >= 3).sort((a, b) => b.streak - a.streak)
  if (atRisk.length > 0) {
    const top = atRisk[0]
    nudges.push({
      id: 'streak-risk',
      module: 'life',
      score: 90,
      message: `Your ${top.streak}-day streak on "${top.habit.name}" dies today if you skip it.`,
      href: '/life',
      habits: atRisk.slice(0, 5).map(s => ({ id: s.habit.id, name: s.habit.name })),
    })
  }
  const ordinaryPending = pending.filter(s => s.streak < 3)
  if (ordinaryPending.length > 0) {
    nudges.push({
      id: 'habits-pending',
      module: 'life',
      score: 50,
      message: ordinaryPending.length === 1
        ? `"${ordinaryPending[0].habit.name}" is still open today.`
        : `${ordinaryPending.length} habits still open today.`,
      href: '/life',
      habits: ordinaryPending.slice(0, 8).map(s => ({ id: s.habit.id, name: s.habit.name })),
    })
  }

  // ── Bills: due day passed, no payment recorded this month ─────────────────
  const monthStart = new Date(Date.UTC(ly, lmo - 1, 1))
  const overdueBills = bills.filter(b => {
    if (b.dayOfMonth > ld) return false
    const lastPaid = b.payments[0]?.paidDate
    return !lastPaid || new Date(lastPaid) < monthStart
  })
  if (overdueBills.length > 0) {
    nudges.push({
      id: 'bills-overdue',
      module: 'finance',
      score: 80,
      message: overdueBills.length === 1
        ? `"${overdueBills[0].name}" was due on the ${overdueBills[0].dayOfMonth}th — mark it paid?`
        : `${overdueBills.length} bills look unpaid this month.`,
      href: '/finance/bills',
    })
  }

  // ── Meals: window well past, nothing logged ───────────────────────────────
  const loggedTypes = new Set(mealLogsToday.map(l => l.mealType))
  const unloggedMeals = mealPlan.filter(mp =>
    MEAL_NUDGE_HOUR[mp.mealType] != null && hour >= MEAL_NUDGE_HOUR[mp.mealType] && !loggedTypes.has(mp.mealType)
  )
  if (unloggedMeals.length > 0) {
    nudges.push({
      id: 'meals-unlogged',
      module: 'fitness',
      score: 60,
      message: unloggedMeals.length === 1
        ? `Haven't logged ${unloggedMeals[0].mealType} yet — what did you eat?`
        : `${unloggedMeals.length} meals not logged yet today.`,
      href: '/fitness',
      meals: unloggedMeals.map(mp => ({ mealType: mp.mealType, plannedName: mp.name })),
    })
  }

  // ── Finance: nothing logged today and the day's mostly over ───────────────
  if (hour >= 12 && expenseCount === 0 && noExpCfg?.value !== 'true') {
    nudges.push({
      id: 'expenses-today',
      module: 'finance',
      score: 40,
      message: "No expenses logged today — add them, or was it a no-spend day?",
      href: '/finance/expenses/personal',
      action: 'no-expenses',
    })
  }

  // ── Fitness: stale weigh-in ────────────────────────────────────────────────
  const daysSinceWeight = lastWeight ? Math.floor((now.getTime() - new Date(lastWeight.date).getTime()) / 86400000) : null
  if (daysSinceWeight !== null && daysSinceWeight >= 8) {
    nudges.push({
      id: 'weight-stale',
      module: 'fitness',
      score: 30,
      message: `It's been ${daysSinceWeight} days since your last weigh-in — worth a check?`,
      href: '/fitness/body',
    })
  }

  // ── Personal: someone you meant to reach out to ───────────────────────────
  const overdueContact = contacts.find(c => {
    const days = FREQ_DAYS[c.reachOutFrequency] ?? 30
    if (!c.lastContactDate) return true
    return (now.getTime() - new Date(c.lastContactDate).getTime()) / 86400000 > days
  })
  if (overdueContact) {
    nudges.push({
      id: 'contact-overdue',
      module: 'personal',
      score: 20,
      message: `Been a while since you caught up with ${overdueContact.name}.`,
      href: '/personal/contacts',
    })
  }

  nudges.sort((a, b) => b.score - a.score)

  // ── Celebration: earned, from real numbers — not a canned shrug ───────────
  let celebration: string | null = null
  if (nudges.length === 0) {
    const done = dueToday.filter(s => s.doneToday).length
    const bestStreak = withState.reduce((best, s) => s.streak + (s.doneToday ? 1 : 0) > best.n
      ? { n: s.streak + (s.doneToday ? 1 : 0), name: s.habit.name } : best, { n: 0, name: '' })
    celebration = dueToday.length > 0 && done === dueToday.length
      ? `All ${done} habits done${bestStreak.n >= 3 ? ` — ${bestStreak.n} days running on ${bestStreak.name}` : ''}. Clean sheet.`
      : 'All caught up — nothing needs you right now.'
  }

  return NextResponse.json({ nudges, celebration }, {
    headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' },
  })
}
