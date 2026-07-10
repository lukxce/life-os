export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isScheduledDay, utcMidnight } from '@/lib/utils'

export interface Nudge { id: string; mood: 'curious' | 'content'; message: string; href: string; module: string }

const FREQ_DAYS: Record<string, number> = { weekly: 7, monthly: 30, quarterly: 90, yearly: 365 }
// A habit only becomes nudge-worthy once its own window has actually
// opened — a 'night' habit shouldn't nag at 8am just because something
// somewhere is overdue. 'all_day' has no window, so it's always fair game.
const TIME_THRESHOLD: Record<string, number> = { morning: 5, noon: 12, night: 18, all_day: 0 }

// Real signals only — every nudge here is backed by an actual query result,
// never a presumed/static number. Tagged by module so the companion can
// prioritize whatever's relevant to the screen you're actually on.
//
// Client-local time, passed in as query params — this used to read the
// SERVER's UTC clock (now.getHours()), which on Vercel is never the user's
// actual local hour. That's why the habit nudge silently never fired at
// the right time: an evening-only gate compared against the wrong hour.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const now = new Date()
  const hour = sp.has('h') ? parseInt(sp.get('h')!) : now.getUTCHours()
  const localDate = sp.get('date') ?? now.toISOString().slice(0, 10)
  const today = utcMidnight(localDate)
  const [ly, lmo, ld] = localDate.split('-').map(Number)
  const nudges: Nudge[] = []

  // ── Habits: scheduled today, not done, and their own window has opened ───
  const habits = await prisma.habit.findMany({
    where: { active: true, paused: false, category: { not: 'Weekly Check-in' } },
    include: { logs: { where: { date: { gte: today } }, select: { completed: true } } },
  })
  const pending = habits.filter(h =>
    isScheduledDay(h, today) &&
    !h.logs.some(l => l.completed) &&
    hour >= (TIME_THRESHOLD[h.timeOfDay] ?? 0)
  )
  if (pending.length > 0) {
    nudges.push({
      id: 'habits-pending',
      module: 'life',
      mood: 'curious',
      message: pending.length === 1
        ? `Haven't logged "${pending[0].name}" today — everything okay?`
        : `${pending.length} habits still open today.`,
      href: '/life',
    })
  }

  // ── Bills: due day passed, no payment recorded this month ─────────────────
  const bills = await prisma.bill.findMany({
    where: { active: true, isLoan: false },
    include: { payments: { orderBy: { paidDate: 'desc' }, take: 1 } },
  })
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
      mood: 'curious',
      message: overdueBills.length === 1
        ? `"${overdueBills[0].name}" was due on the ${overdueBills[0].dayOfMonth}th — mark it paid?`
        : `${overdueBills.length} bills look unpaid this month.`,
      href: '/finance/bills',
    })
  }

  // ── Fitness: meals whose window has well passed, nothing logged ───────────
  // Windows open 12:00 / 15:30 / 19:00 — nudge roughly an hour after each,
  // using the client's local hour (the only clock resolution we get here)
  const jsDow = new Date(localDate + 'T12:00:00Z').getUTCDay()
  const dow = jsDow === 0 ? 7 : jsDow // MealPlanSlot: 1=Mon … 7=Sun
  const MEAL_NUDGE_HOUR: Record<string, number> = { breakfast: 13, snack: 17, dinner: 20 }
  const [mealPlan, mealLogsToday] = await Promise.all([
    prisma.mealPlanSlot.findMany({ where: { dayOfWeek: dow } }),
    prisma.mealLog.findMany({ where: { date: today } }),
  ])
  const loggedTypes = new Set(mealLogsToday.map(l => l.mealType))
  const unloggedMeals = mealPlan.filter(mp =>
    MEAL_NUDGE_HOUR[mp.mealType] != null &&
    hour >= MEAL_NUDGE_HOUR[mp.mealType] &&
    !loggedTypes.has(mp.mealType)
  )
  if (unloggedMeals.length > 0) {
    nudges.push({
      id: 'meals-unlogged',
      module: 'fitness',
      mood: 'curious',
      message: unloggedMeals.length === 1
        ? `Haven't logged ${unloggedMeals[0].mealType} yet — what did you eat?`
        : `${unloggedMeals.length} meals not logged yet today.`,
      href: '/fitness',
    })
  }

  // ── Finance: nothing logged today, and the day's mostly over ──────────────
  if (hour >= 12) {
    const todayExpenseCount = await prisma.expenseEntry.count({ where: { date: { gte: today } } })
    if (todayExpenseCount === 0) {
      nudges.push({
        id: 'expenses-today',
        module: 'finance',
        mood: 'curious',
        message: "No expenses logged today yet — add what you've spent so far?",
        href: '/finance/expenses/personal',
      })
    }
  }

  // ── Fitness: no weight logged in over a week ──────────────────────────────
  const lastWeight = await prisma.bodyMetric.findFirst({ where: { metric: 'weight' }, orderBy: { date: 'desc' } })
  const daysSinceWeight = lastWeight ? Math.floor((now.getTime() - new Date(lastWeight.date).getTime()) / 86400000) : null
  if (daysSinceWeight !== null && daysSinceWeight >= 8) {
    nudges.push({
      id: 'weight-stale',
      module: 'fitness',
      mood: 'curious',
      message: `It's been ${daysSinceWeight} days since your last weigh-in — worth a check?`,
      href: '/fitness/body',
    })
  }

  // ── Personal: someone you meant to reach out to ───────────────────────────
  const contacts = await prisma.contact.findMany()
  const overdueContact = contacts.find(c => {
    const days = FREQ_DAYS[c.reachOutFrequency] ?? 30
    if (!c.lastContactDate) return true
    return (now.getTime() - new Date(c.lastContactDate).getTime()) / 86400000 > days
  })
  if (overdueContact) {
    nudges.push({
      id: 'contact-overdue',
      module: 'personal',
      mood: 'curious',
      message: `Been a while since you caught up with ${overdueContact.name}.`,
      href: '/personal/contacts',
    })
  }

  if (nudges.length === 0) {
    return NextResponse.json({ nudges: [], mood: 'content' as const })
  }

  return NextResponse.json({ nudges, mood: 'curious' as const })
}
