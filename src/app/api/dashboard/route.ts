export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getLiveRate, getDateRange } from '@/lib/utils'
import { startOfDay, endOfDay } from 'date-fns'

export async function GET() {
  const today = new Date()
  const range = getDateRange('month', today)
  const where = range ? { date: { gte: range.start, lte: range.end } } : {}

  const [settings, liveRate, accounts, incomeThisMonth, expensesThisMonth, bills] = await Promise.all([
    prisma.settings.findFirst(),
    getLiveRate(),
    prisma.account.findMany(),
    prisma.incomeEntry.aggregate({ where, _sum: { netAmount: true } }),
    prisma.expenseEntry.aggregate({ where, _sum: { amountRSD: true } }),
    prisma.bill.findMany({ where: { active: true }, take: 5, orderBy: { dayOfMonth: 'asc' } }),
  ])

  const manualRate = settings?.manualRate ?? 117.5

  // Total balance across all accounts in EUR
  const totalBalanceEUR = accounts.reduce((sum, acc) => {
    const bal = acc.startingBalance
    return sum + (acc.currency === 'RSD' ? bal / liveRate : bal)
  }, 0)

  // Today's habit log
  const dayStart = startOfDay(today)
  const dayEnd = endOfDay(today)

  const [habitsToday, logsToday] = await Promise.all([
    prisma.habit.findMany({ where: { active: true } }),
    prisma.habitLog.findMany({ where: { date: { gte: dayStart, lte: dayEnd } } }),
  ])

  // Only count habits scheduled for today
  const dow = today.getDay()
  const scheduled = habitsToday.filter(h => {
    if (h.frequency === 'daily') return true
    if (h.frequency === 'specific_days') return h.frequencyDays.includes(dow)
    return true
  })
  const completed = logsToday.filter(l => l.completed).length

  return NextResponse.json({
    finance: {
      totalBalanceEUR,
      incomeThisMonthRSD: incomeThisMonth._sum.netAmount ?? 0,
      expensesThisMonthRSD: expensesThisMonth._sum.amountRSD ?? 0,
      upcomingBills: bills,
      manualRate,
      liveRate,
    },
    life: {
      habitsScheduledToday: scheduled.length,
      habitsCompletedToday: completed,
    },
  })
}
