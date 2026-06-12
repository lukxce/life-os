export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { computeCryptoPortfolioEUR } from '@/lib/crypto'

export async function GET() {
  const accounts = await prisma.account.findMany({ orderBy: { createdAt: 'asc' } })

  const hasCrypto = accounts.some(a => a.name.toLowerCase().includes('crypto'))
  const cryptoEUR  = hasCrypto ? await computeCryptoPortfolioEUR() : 0

  const withBalances = await Promise.all(accounts.map(async (acc) => {
    if (acc.name.toLowerCase().includes('crypto')) {
      return { ...acc, currentBalance: cryptoEUR, cryptoAutoSync: true }
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

    const base     = acc.manualOverride ?? acc.startingBalance
    const income   = incomeSum._sum.netAmount ?? 0
    const expenses = expenseSum._sum.amount ?? 0
    const netConv  = (convIn._sum.amountReceived ?? 0) - (convOut._sum.amountSent ?? 0)
    const netTrf   = (trfIn._sum.amountReceived ?? 0) - (trfOut._sum.amountSent ?? 0)
    const currentBalance = base + income - expenses + netConv + netTrf

    return { ...acc, currentBalance }
  }))

  return NextResponse.json(withBalances)
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
