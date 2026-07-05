export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDateRange, getLiveRate, Period } from '@/lib/utils'
import { computeCryptoPortfolioEUR } from '@/lib/crypto'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const period = (searchParams.get('period') || 'month') as Period
  const date = searchParams.get('date') ? new Date(searchParams.get('date')!) : new Date()
  const range = getDateRange(period, date)
  const where = range ? { date: { gte: range.start, lte: range.end } } : {}

  // Everything in one parallel burst — grouped aggregates instead of
  // per-account / per-category query fans (was ~70 queries, now ~12)
  const [
    accounts, settings, liveRate,
    incomeByAcc, expenseByAcc, convInByAcc, convOutByAcc, trfInByAcc, trfOutByAcc,
    incomeByType, deductions, expenseByCat, categories,
  ] = await Promise.all([
    prisma.account.findMany(),
    prisma.settings.findFirst(),
    getLiveRate(),
    // Balance components, grouped per account (income split by currency)
    prisma.incomeEntry.groupBy({ by: ['accountId', 'currency'], _sum: { netAmount: true } }),
    prisma.expenseEntry.groupBy({ by: ['accountId'], _sum: { amountRSD: true } }),
    prisma.conversion.groupBy({ by: ['toAccountId'], _sum: { amountReceived: true } }),
    prisma.conversion.groupBy({ by: ['fromAccountId'], _sum: { amountSent: true } }),
    prisma.transfer.groupBy({ by: ['toAccountId'], _sum: { amountReceived: true } }),
    prisma.transfer.groupBy({ by: ['fromAccountId'], _sum: { amountSent: true } }),
    // Period-filtered income + expense breakdowns
    prisma.incomeEntry.groupBy({ by: ['type', 'currency'], where, _sum: { netAmount: true } }),
    prisma.incomeEntry.aggregate({ where, _sum: { deduction: true } }),
    prisma.expenseEntry.groupBy({ by: ['type', 'category'], where, _sum: { amountRSD: true } }),
    prisma.category.findMany(),
  ])

  const manualRate = settings?.manualRate ?? 117.5

  const hasCryptoAcc = accounts.some(a => a.name.toLowerCase().includes('crypto'))
  const cryptoPortfolioEUR = hasCryptoAcc ? await computeCryptoPortfolioEUR() : 0

  // Currency-aware balance: expenses always via amountRSD, income split by currency
  const accountBalances = await Promise.all(accounts.map(async (acc) => {
    if (acc.name.toLowerCase().includes('crypto')) {
      const balanceEUR = cryptoPortfolioEUR
      return { ...acc, currentBalance: balanceEUR, balanceRSD: balanceEUR * manualRate, balanceEUR, cryptoAutoSync: true }
    }

    let incomeEUR: number, incomeRSD: number, expenseRSD: number, convIn: number, convOut: number, trfIn: number, trfOut: number

    if (acc.overrideDate) {
      // Rare path: override accounts only count transactions after the override date
      const dateFilter = { date: { gte: acc.overrideDate } }
      const [incGB, expAgg, cIn, cOut, tIn, tOut] = await Promise.all([
        prisma.incomeEntry.groupBy({ by: ['currency'], where: { accountId: acc.id, ...dateFilter }, _sum: { netAmount: true } }),
        prisma.expenseEntry.aggregate({ where: { accountId: acc.id, ...dateFilter }, _sum: { amountRSD: true } }),
        prisma.conversion.aggregate({ where: { toAccountId: acc.id, ...dateFilter }, _sum: { amountReceived: true } }),
        prisma.conversion.aggregate({ where: { fromAccountId: acc.id, ...dateFilter }, _sum: { amountSent: true } }),
        prisma.transfer.aggregate({ where: { toAccountId: acc.id, ...dateFilter }, _sum: { amountReceived: true } }),
        prisma.transfer.aggregate({ where: { fromAccountId: acc.id, ...dateFilter }, _sum: { amountSent: true } }),
      ])
      incomeEUR  = incGB.find(r => r.currency === 'EUR')?._sum.netAmount ?? 0
      incomeRSD  = incGB.find(r => r.currency === 'RSD')?._sum.netAmount ?? 0
      expenseRSD = expAgg._sum.amountRSD ?? 0
      convIn  = cIn._sum.amountReceived ?? 0
      convOut = cOut._sum.amountSent ?? 0
      trfIn   = tIn._sum.amountReceived ?? 0
      trfOut  = tOut._sum.amountSent ?? 0
    } else {
      incomeEUR  = incomeByAcc.find(r => r.accountId === acc.id && r.currency === 'EUR')?._sum.netAmount ?? 0
      incomeRSD  = incomeByAcc.find(r => r.accountId === acc.id && r.currency === 'RSD')?._sum.netAmount ?? 0
      expenseRSD = expenseByAcc.find(r => r.accountId === acc.id)?._sum.amountRSD ?? 0
      convIn  = convInByAcc.find(r => r.toAccountId === acc.id)?._sum.amountReceived ?? 0
      convOut = convOutByAcc.find(r => r.fromAccountId === acc.id)?._sum.amountSent ?? 0
      trfIn   = trfInByAcc.find(r => r.toAccountId === acc.id)?._sum.amountReceived ?? 0
      trfOut  = trfOutByAcc.find(r => r.fromAccountId === acc.id)?._sum.amountSent ?? 0
    }

    const base = acc.manualOverride ?? acc.startingBalance
    const income = acc.currency === 'EUR'
      ? incomeEUR + incomeRSD / manualRate
      : incomeEUR * manualRate + incomeRSD
    const expenses = acc.currency === 'EUR' ? expenseRSD / manualRate : expenseRSD
    const currentBalance = base + income - expenses + (convIn - convOut) + (trfIn - trfOut)
    const balanceRSD = acc.currency === 'EUR' ? currentBalance * manualRate : currentBalance
    const balanceEUR = acc.currency === 'RSD' ? currentBalance / liveRate : currentBalance

    return { ...acc, currentBalance, balanceRSD, balanceEUR }
  }))

  // Income breakdown from the grouped result
  const inc = (type: string, currency: string) =>
    incomeByType.find(r => r.type === type && r.currency === currency)?._sum.netAmount ?? 0

  const salaryRSDVal  = inc('Salary', 'RSD')
  const invoiceRSDVal = inc('Invoice', 'RSD')
  const invoiceEURVal = inc('Invoice', 'EUR') * manualRate
  const otherRSDVal   = inc('Other', 'RSD')
  const otherEURVal   = inc('Other', 'EUR') * manualRate
  const totalGrossRSD = salaryRSDVal + inc('Salary', 'EUR') * manualRate + invoiceRSDVal + invoiceEURVal + otherRSDVal + otherEURVal
  const totalDeductions = deductions._sum.deduction ?? 0
  const totalNetRSD = totalGrossRSD - totalDeductions

  // Category breakdowns from the grouped result (keeps zero-spend categories visible)
  const catSum = (type: string, category: string) =>
    expenseByCat.find(r => r.type === type && r.category === category)?._sum.amountRSD ?? 0

  const personalExpenses = categories.filter(c => c.type === 'personal')
    .map(cat => ({ category: cat.name, amountRSD: catSum('personal', cat.name) }))
  const businessExpenses = categories.filter(c => c.type === 'business')
    .map(cat => ({ category: cat.name, amountRSD: catSum('business', cat.name) }))

  const personalRSD = accountBalances.filter(a => a.type === 'personal').reduce((s, a) => s + a.balanceRSD, 0)
  const companyRSD  = accountBalances.filter(a => a.type === 'company').reduce((s, a) => s + a.balanceRSD, 0)
  const totalRSD = personalRSD + companyRSD

  return NextResponse.json({
    liveRate,
    manualRate,
    accounts: accountBalances,
    totals: {
      personalRSD,
      personalEUR: personalRSD / liveRate,
      companyRSD,
      companyEUR: companyRSD / liveRate,
      totalRSD,
      totalEUR: totalRSD / liveRate,
    },
    income: {
      salaryRSD: salaryRSDVal,
      invoiceRSD: invoiceRSDVal,
      invoiceEUR: inc('Invoice', 'EUR'),
      invoiceEURinRSD: invoiceEURVal,
      otherRSD: otherRSDVal,
      otherEUR: inc('Other', 'EUR'),
      otherEURinRSD: otherEURVal,
      totalGrossRSD,
      totalDeductions,
      totalNetRSD,
      totalGrossEUR: totalGrossRSD / liveRate,
      totalNetEUR: totalNetRSD / liveRate,
    },
    personalExpenses,
    businessExpenses,
  })
}
