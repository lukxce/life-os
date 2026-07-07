export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { computeCryptoPortfolioEUR } from '@/lib/crypto'

export async function GET(req: NextRequest) {
  // ?simple=1 → just names/ids/currency, no balance computation (for dropdowns)
  const simple = new URL(req.url).searchParams.get('simple') === '1'

  const accounts = await prisma.account.findMany({ orderBy: { createdAt: 'asc' } })
  if (simple) return NextResponse.json(accounts)

  const settings = await prisma.settings.findFirst()

  const rate = settings?.manualRate ?? 117.5
  const hasCrypto = accounts.some(a => a.name.toLowerCase().includes('crypto'))
  const cryptoEUR  = hasCrypto ? await computeCryptoPortfolioEUR() : 0

  const withBalances = await Promise.all(accounts.map(async (acc) => {
    if (acc.name.toLowerCase().includes('crypto')) {
      return { ...acc, currentBalance: cryptoEUR, cryptoAutoSync: true }
    }

    const overrideWhere = acc.overrideDate ? { date: { gte: acc.overrideDate } } : {}

    const [incomeEUR, incomeRSD, expenseSum, convIn, convOut, trfIn, trfOut] = await Promise.all([
      prisma.incomeEntry.aggregate({ where: { accountId: acc.id, currency: 'EUR', ...overrideWhere }, _sum: { netAmount: true } }),
      prisma.incomeEntry.aggregate({ where: { accountId: acc.id, currency: 'RSD', ...overrideWhere }, _sum: { netAmount: true } }),
      prisma.expenseEntry.aggregate({ where: { accountId: acc.id, ...overrideWhere }, _sum: { amountRSD: true } }),
      prisma.conversion.aggregate({ where: { toAccountId: acc.id, ...overrideWhere }, _sum: { amountReceived: true } }),
      prisma.conversion.aggregate({ where: { fromAccountId: acc.id, ...overrideWhere }, _sum: { amountSent: true } }),
      prisma.transfer.aggregate({ where: { toAccountId: acc.id, ...overrideWhere }, _sum: { amountReceived: true } }),
      prisma.transfer.aggregate({ where: { fromAccountId: acc.id, ...overrideWhere }, _sum: { amountSent: true } }),
    ])

    const base = acc.manualOverride ?? acc.startingBalance
    const income = acc.currency === 'EUR'
      ? (incomeEUR._sum.netAmount ?? 0) + (incomeRSD._sum.netAmount ?? 0) / rate
      : (incomeEUR._sum.netAmount ?? 0) * rate + (incomeRSD._sum.netAmount ?? 0)
    const expenses = acc.currency === 'EUR'
      ? (expenseSum._sum.amountRSD ?? 0) / rate
      : (expenseSum._sum.amountRSD ?? 0)
    const netConv  = (convIn._sum.amountReceived ?? 0) - (convOut._sum.amountSent ?? 0)
    const netTrf   = (trfIn._sum.amountReceived ?? 0) - (trfOut._sum.amountSent ?? 0)
    const currentBalance = base + income - expenses + netConv + netTrf

    return { ...acc, currentBalance }
  }))

  return NextResponse.json(withBalances, {
    headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' },
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const account = await prisma.account.create({
    data: {
      name: body.name,
      type: body.type,
      currency: body.currency,
      startingBalance: body.startingBalance ?? 0,
    }
  })
  return NextResponse.json(account)
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, ...data } = body
  const account = await prisma.account.update({ where: { id }, data })
  return NextResponse.json(account)
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  await prisma.account.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
