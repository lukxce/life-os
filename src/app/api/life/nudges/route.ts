export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isScheduledDay, startOfDay } from '@/lib/utils'

export interface Nudge { id: string; mood: 'curious' | 'content'; message: string; href: string; module: string }

const FREQ_DAYS: Record<string, number> = { weekly: 7, monthly: 30, quarterly: 90, yearly: 365 }

// Real signals only — every nudge here is backed by an actual query result,
// never a presumed/static number. Tagged by module so the companion can
// prioritize whatever's relevant to the screen you're actually on.
export async function GET() {
  const now = new Date()
  const today = startOfDay(now)
  const hour = now.getHours()
  const nudges: Nudge[] = []

  // ── Habits: scheduled today, not done, and it's evening ──────────────────
  if (hour >= 18) {
    const habits = await prisma.habit.findMany({
      where: { active: true, paused: false, category: { not: 'Weekly Check-in' } },
      include: { logs: { where: { date: { gte: today } }, select: { completed: true } } },
    })
    const pending = habits.filter(h => isScheduledDay(h, today) && !h.logs.some(l => l.completed))
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
  }

  // ── Bills: due day passed, no payment recorded this month ─────────────────
  const bills = await prisma.bill.findMany({
    where: { active: true, isLoan: false },
    include: { payments: { orderBy: { paidDate: 'desc' }, take: 1 } },
  })
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const overdueBills = bills.filter(b => {
    if (b.dayOfMonth > now.getDate()) return false
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
