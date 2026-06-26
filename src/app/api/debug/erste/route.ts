export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  // Find Erste Bank personal account
  const acc = await prisma.account.findFirst({
    where: { name: { contains: 'erste', mode: 'insensitive' } },
  })
  if (!acc) return NextResponse.json({ error: 'Account not found' })

  const [settings, incomeEUR, incomeRSD, expensesEUR, expensesRSD, convIn, convOut, trfIn, trfOut] = await Promise.all([
    prisma.settings.findFirst(),
    prisma.incomeEntry.findMany({ where: { accountId: acc.id, currency: 'EUR' }, select: { date: true, netAmount: true, type: true, client: true } }),
    prisma.incomeEntry.findMany({ where: { accountId: acc.id, currency: 'RSD' }, select: { date: true, netAmount: true, type: true, client: true } }),
    prisma.expenseEntry.findMany({ where: { accountId: acc.id, currency: 'EUR' }, select: { date: true, amount: true, amountRSD: true, description: true, merchantName: true } }),
    prisma.expenseEntry.findMany({ where: { accountId: acc.id, currency: 'RSD' }, select: { date: true, amount: true, amountRSD: true, description: true, merchantName: true } }),
    prisma.conversion.findMany({ where: { toAccountId: acc.id }, select: { date: true, amountReceived: true, amountSent: true, fromAccountId: true } }),
    prisma.conversion.findMany({ where: { fromAccountId: acc.id }, select: { date: true, amountSent: true, amountReceived: true, toAccountId: true } }),
    prisma.transfer.findMany({ where: { toAccountId: acc.id }, select: { date: true, amountReceived: true, fromAccountId: true } }),
    prisma.transfer.findMany({ where: { fromAccountId: acc.id }, select: { date: true, amountSent: true, toAccountId: true } }),
  ])

  const rate = settings?.manualRate ?? 117.5

  const totalIncomeEUR = incomeEUR.reduce((s, r) => s + r.netAmount, 0)
  const totalIncomeRSD = incomeRSD.reduce((s, r) => s + r.netAmount, 0)
  const totalExpensesEUR = expensesEUR.reduce((s, r) => s + r.amount, 0)
  const totalExpensesRSD = expensesRSD.reduce((s, r) => s + r.amount, 0)
  const totalExpensesRSD_all = [...expensesEUR, ...expensesRSD].reduce((s, r) => s + r.amountRSD, 0)
  const totalConvIn = convIn.reduce((s, r) => s + r.amountReceived, 0)
  const totalConvOut = convOut.reduce((s, r) => s + r.amountSent, 0)
  const totalTrfIn = trfIn.reduce((s, r) => s + r.amountReceived, 0)
  const totalTrfOut = trfOut.reduce((s, r) => s + r.amountSent, 0)

  const base = acc.manualOverride ?? acc.startingBalance

  // Old (buggy) calculation
  const oldIncome = totalIncomeEUR + totalIncomeRSD
  const oldExpenses = totalExpensesEUR + totalExpensesRSD
  const oldBalance = base + oldIncome - oldExpenses + (totalConvIn - totalConvOut) + (totalTrfIn - totalTrfOut)

  // New (correct) calculation
  const newIncome = acc.currency === 'EUR'
    ? totalIncomeEUR + totalIncomeRSD / rate
    : totalIncomeEUR * rate + totalIncomeRSD
  const newExpenses = acc.currency === 'EUR'
    ? totalExpensesRSD_all / rate
    : totalExpensesRSD_all
  const newBalance = base + newIncome - newExpenses + (totalConvIn - totalConvOut) + (totalTrfIn - totalTrfOut)

  return NextResponse.json({
    account: { id: acc.id, name: acc.name, currency: acc.currency, startingBalance: acc.startingBalance, manualOverride: acc.manualOverride, overrideDate: acc.overrideDate },
    rate,
    income: {
      EUR: { count: incomeEUR.length, total: totalIncomeEUR, entries: incomeEUR },
      RSD: { count: incomeRSD.length, total: totalIncomeRSD, entries: incomeRSD },
    },
    expenses: {
      EUR: { count: expensesEUR.length, totalAmount: totalExpensesEUR, entries: expensesEUR },
      RSD: { count: expensesRSD.length, totalAmount: totalExpensesRSD, entries: expensesRSD },
      totalAmountRSD_all: totalExpensesRSD_all,
    },
    conversions: { in: { count: convIn.length, total: totalConvIn }, out: { count: convOut.length, total: totalConvOut } },
    transfers: { in: { count: trfIn.length, total: totalTrfIn, entries: trfIn }, out: { count: trfOut.length, total: totalTrfOut, entries: trfOut } },
    calc: {
      base,
      old: { income: oldIncome, expenses: oldExpenses, balance: oldBalance },
      new: { income: newIncome, expenses: newExpenses, balance: newBalance },
    },
  })
}
