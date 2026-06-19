export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getLiveRate, getDateRange } from '@/lib/utils'
import { computeCryptoPortfolioEUR } from '@/lib/crypto'
import { startOfDay, endOfDay } from 'date-fns'

export async function GET() {
  const today = new Date()
  const range = getDateRange('month', today)
  const where = range ? { date: { gte: range.start, lte: range.end } } : {}

  const [settings, liveRate, accounts, incomeRSD, incomeEUR, expensesThisMonth, bills] = await Promise.all([
    prisma.settings.findFirst(),
    getLiveRate(),
    prisma.account.findMany(),
    prisma.incomeEntry.aggregate({ where: { ...where, currency: 'RSD' }, _sum: { netAmount: true } }),
    prisma.incomeEntry.aggregate({ where: { ...where, currency: 'EUR' }, _sum: { netAmount: true } }),
    prisma.expenseEntry.aggregate({ where, _sum: { amountRSD: true } }),
    prisma.bill.findMany({ where: { active: true }, take: 5, orderBy: { dayOfMonth: 'asc' } }),
  ])

  const manualRate = settings?.manualRate ?? 117.5

  // Crypto portfolio (only compute once if needed)
  const hasCrypto = accounts.some(a => a.name.toLowerCase().includes('crypto'))
  const cryptoEUR = hasCrypto ? await computeCryptoPortfolioEUR() : 0

  // Compute actual current balance per account (mirrors accounts route logic)
  const accountBalances = await Promise.all(accounts.map(async (acc) => {
    if (acc.name.toLowerCase().includes('crypto')) {
      return { currency: 'EUR', balance: cryptoEUR }
    }
    const overrideWhere = acc.overrideDate ? { date: { gte: acc.overrideDate } } : {}
    const [incomeSum, expenseSum, convIn, convOut, trfIn, trfOut] = await Promise.all([
      prisma.incomeEntry.aggregate({ where: { accountId: acc.id, ...overrideWhere }, _sum: { netAmount: true } }),
      prisma.expenseEntry.aggregate({ where: { accountId: acc.id, ...overrideWhere }, _sum: { amount: true } }),
      prisma.conversion.aggregate({ where: { toAccountId: acc.id, ...overrideWhere }, _sum: { amountReceived: true } }),
      prisma.conversion.aggregate({ where: { fromAccountId: acc.id, ...overrideWhere }, _sum: { amountSent: true } }),
      prisma.transfer.aggregate({ where: { toAccountId: acc.id, ...overrideWhere }, _sum: { amountReceived: true } }),
      prisma.transfer.aggregate({ where: { fromAccountId: acc.id, ...overrideWhere }, _sum: { amountSent: true } }),
    ])
    const base    = acc.manualOverride ?? acc.startingBalance
    const balance = base
      + (incomeSum._sum.netAmount   ?? 0)
      - (expenseSum._sum.amount     ?? 0)
      + (convIn._sum.amountReceived ?? 0) - (convOut._sum.amountSent ?? 0)
      + (trfIn._sum.amountReceived  ?? 0) - (trfOut._sum.amountSent  ?? 0)
    return { currency: acc.currency, balance }
  }))

  const totalBalanceEUR = accountBalances.reduce((sum, acc) => {
    return sum + (acc.currency === 'RSD' ? acc.balance / liveRate : acc.balance)
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
      incomeThisMonthRSD: (incomeRSD._sum.netAmount ?? 0) + (incomeEUR._sum.netAmount ?? 0) * manualRate,
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
