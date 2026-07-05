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

  // Grouped balance components — one query per table instead of 7 per account
  const [incomeByAcc, expenseByAcc, convInByAcc, convOutByAcc, trfInByAcc, trfOutByAcc] = await Promise.all([
    prisma.incomeEntry.groupBy({ by: ['accountId', 'currency'], _sum: { netAmount: true } }),
    prisma.expenseEntry.groupBy({ by: ['accountId'], _sum: { amountRSD: true } }),
    prisma.conversion.groupBy({ by: ['toAccountId'], _sum: { amountReceived: true } }),
    prisma.conversion.groupBy({ by: ['fromAccountId'], _sum: { amountSent: true } }),
    prisma.transfer.groupBy({ by: ['toAccountId'], _sum: { amountReceived: true } }),
    prisma.transfer.groupBy({ by: ['fromAccountId'], _sum: { amountSent: true } }),
  ])

  // Compute actual current balance per account (currency-aware)
  const accountBalances = await Promise.all(accounts.map(async (acc) => {
    if (acc.name.toLowerCase().includes('crypto')) {
      return { currency: 'EUR', balance: cryptoEUR }
    }

    let incEUR: number, incRSD: number, expRSD: number, convIn: number, convOut: number, trfIn: number, trfOut: number

    if (acc.overrideDate) {
      // Rare path: only transactions after the override date count
      const dateFilter = { date: { gte: acc.overrideDate } }
      const [incGB, expAgg, cIn, cOut, tIn, tOut] = await Promise.all([
        prisma.incomeEntry.groupBy({ by: ['currency'], where: { accountId: acc.id, ...dateFilter }, _sum: { netAmount: true } }),
        prisma.expenseEntry.aggregate({ where: { accountId: acc.id, ...dateFilter }, _sum: { amountRSD: true } }),
        prisma.conversion.aggregate({ where: { toAccountId: acc.id, ...dateFilter }, _sum: { amountReceived: true } }),
        prisma.conversion.aggregate({ where: { fromAccountId: acc.id, ...dateFilter }, _sum: { amountSent: true } }),
        prisma.transfer.aggregate({ where: { toAccountId: acc.id, ...dateFilter }, _sum: { amountReceived: true } }),
        prisma.transfer.aggregate({ where: { fromAccountId: acc.id, ...dateFilter }, _sum: { amountSent: true } }),
      ])
      incEUR = incGB.find(r => r.currency === 'EUR')?._sum.netAmount ?? 0
      incRSD = incGB.find(r => r.currency === 'RSD')?._sum.netAmount ?? 0
      expRSD = expAgg._sum.amountRSD ?? 0
      convIn  = cIn._sum.amountReceived ?? 0
      convOut = cOut._sum.amountSent ?? 0
      trfIn   = tIn._sum.amountReceived ?? 0
      trfOut  = tOut._sum.amountSent ?? 0
    } else {
      incEUR = incomeByAcc.find(r => r.accountId === acc.id && r.currency === 'EUR')?._sum.netAmount ?? 0
      incRSD = incomeByAcc.find(r => r.accountId === acc.id && r.currency === 'RSD')?._sum.netAmount ?? 0
      expRSD = expenseByAcc.find(r => r.accountId === acc.id)?._sum.amountRSD ?? 0
      convIn  = convInByAcc.find(r => r.toAccountId === acc.id)?._sum.amountReceived ?? 0
      convOut = convOutByAcc.find(r => r.fromAccountId === acc.id)?._sum.amountSent ?? 0
      trfIn   = trfInByAcc.find(r => r.toAccountId === acc.id)?._sum.amountReceived ?? 0
      trfOut  = trfOutByAcc.find(r => r.fromAccountId === acc.id)?._sum.amountSent ?? 0
    }

    const base = acc.manualOverride ?? acc.startingBalance
    const income = acc.currency === 'EUR'
      ? incEUR + incRSD / manualRate
      : incEUR * manualRate + incRSD
    const expenses = acc.currency === 'EUR' ? expRSD / manualRate : expRSD
    const balance = base + income - expenses + (convIn - convOut) + (trfIn - trfOut)
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
