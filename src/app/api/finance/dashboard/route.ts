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

  const [accounts, settings, liveRate] = await Promise.all([
    prisma.account.findMany(),
    prisma.settings.findFirst(),
    getLiveRate(),
  ])

  const manualRate = settings?.manualRate ?? 117.5

  // Pre-compute crypto portfolio once if there's a crypto account
  const hasCryptoAcc = accounts.some(a => a.name.toLowerCase().includes('crypto'))
  const cryptoPortfolioEUR = hasCryptoAcc ? await computeCryptoPortfolioEUR() : 0

  // Calculate balance for each account
  const accountBalances = await Promise.all(accounts.map(async (acc) => {
    const isCryptoAcc = acc.name.toLowerCase().includes('crypto')

    // Crypto accounts use live portfolio value as base — no transactions tracked
    if (isCryptoAcc) {
      const balanceEUR = cryptoPortfolioEUR
      const balanceRSD = balanceEUR * manualRate
      return { ...acc, currentBalance: balanceEUR, balanceRSD, balanceEUR, cryptoAutoSync: true }
    }

    const overrideWhere = acc.overrideDate
      ? { date: { gte: acc.overrideDate } }
      : {}

    const [incomeSum, expenseSum, convIn, convOut, trfIn, trfOut] = await Promise.all([
      prisma.incomeEntry.aggregate({ where: { accountId: acc.id, ...overrideWhere }, _sum: { netAmount: true } }),
      prisma.expenseEntry.aggregate({ where: { accountId: acc.id, ...overrideWhere }, _sum: { amount: true } }),
      prisma.conversion.aggregate({ where: { toAccountId: acc.id, ...overrideWhere }, _sum: { amountReceived: true } }),
      prisma.conversion.aggregate({ where: { fromAccountId: acc.id, ...overrideWhere }, _sum: { amountSent: true } }),
      prisma.transfer.aggregate({ where: { toAccountId: acc.id, ...overrideWhere }, _sum: { amountReceived: true } }),
      prisma.transfer.aggregate({ where: { fromAccountId: acc.id, ...overrideWhere }, _sum: { amountSent: true } }),
    ])

    const base = acc.manualOverride ?? acc.startingBalance
    const income = incomeSum._sum.netAmount ?? 0
    const expenses = expenseSum._sum.amount ?? 0
    const netConv = (convIn._sum.amountReceived ?? 0) - (convOut._sum.amountSent ?? 0)
    const netTrf = (trfIn._sum.amountReceived ?? 0) - (trfOut._sum.amountSent ?? 0)
    const currentBalance = base + income - expenses + netConv + netTrf
    const balanceRSD = acc.currency === 'EUR' ? currentBalance * manualRate : currentBalance
    const balanceEUR = acc.currency === 'RSD' ? currentBalance / liveRate : currentBalance

    return { ...acc, currentBalance, balanceRSD, balanceEUR }
  }))

  // Income filtered by period
  const [salaryRSD, salaryEUR, invoiceRSD, invoiceEUR, otherRSD, otherEUR, deductions] = await Promise.all([
    prisma.incomeEntry.aggregate({ where: { ...where, type: 'Salary', currency: 'RSD' }, _sum: { netAmount: true } }),
    prisma.incomeEntry.aggregate({ where: { ...where, type: 'Salary', currency: 'EUR' }, _sum: { netAmount: true } }),
    prisma.incomeEntry.aggregate({ where: { ...where, type: 'Invoice', currency: 'RSD' }, _sum: { netAmount: true } }),
    prisma.incomeEntry.aggregate({ where: { ...where, type: 'Invoice', currency: 'EUR' }, _sum: { netAmount: true } }),
    prisma.incomeEntry.aggregate({ where: { ...where, type: 'Other', currency: 'RSD' }, _sum: { netAmount: true } }),
    prisma.incomeEntry.aggregate({ where: { ...where, type: 'Other', currency: 'EUR' }, _sum: { netAmount: true } }),
    prisma.incomeEntry.aggregate({ where, _sum: { deduction: true } }),
  ])

  // Expenses filtered by period
  const personalCats = await prisma.category.findMany({ where: { type: 'personal' } })
  const businessCats = await prisma.category.findMany({ where: { type: 'business' } })

  const personalExpenses = await Promise.all(personalCats.map(async (cat) => {
    const sum = await prisma.expenseEntry.aggregate({
      where: { ...where, type: 'personal', category: cat.name },
      _sum: { amountRSD: true }
    })
    return { category: cat.name, amountRSD: sum._sum.amountRSD ?? 0 }
  }))

  const businessExpenses = await Promise.all(businessCats.map(async (cat) => {
    const sum = await prisma.expenseEntry.aggregate({
      where: { ...where, type: 'business', category: cat.name },
      _sum: { amountRSD: true }
    })
    return { category: cat.name, amountRSD: sum._sum.amountRSD ?? 0 }
  }))

  const salaryRSDVal = salaryRSD._sum.netAmount ?? 0
  const invoiceRSDVal = invoiceRSD._sum.netAmount ?? 0
  const invoiceEURVal = (invoiceEUR._sum.netAmount ?? 0) * manualRate
  const otherRSDVal = otherRSD._sum.netAmount ?? 0
  const otherEURVal = (otherEUR._sum.netAmount ?? 0) * manualRate
  const totalGrossRSD = salaryRSDVal + invoiceRSDVal + invoiceEURVal + otherRSDVal + otherEURVal
  const totalDeductions = deductions._sum.deduction ?? 0
  const totalNetRSD = totalGrossRSD - totalDeductions

  // Totals
  const personalRSD = accountBalances.filter(a => a.type === 'personal').reduce((s, a) => s + a.balanceRSD, 0)
  const companyRSD = accountBalances.filter(a => a.type === 'company').reduce((s, a) => s + a.balanceRSD, 0)
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
      invoiceEUR: invoiceEUR._sum.netAmount ?? 0,
      invoiceEURinRSD: invoiceEURVal,
      otherRSD: otherRSDVal,
      otherEUR: otherEUR._sum.netAmount ?? 0,
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