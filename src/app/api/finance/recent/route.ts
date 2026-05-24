export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '5')

  const [expenses, income, transfers, conversions] = await Promise.all([
    prisma.expenseEntry.findMany({ take: limit, orderBy: { date: 'desc' }, include: { account: true } }),
    prisma.incomeEntry.findMany({ take: limit, orderBy: { date: 'desc' }, include: { account: true } }),
    prisma.transfer.findMany({ take: limit, orderBy: { date: 'desc' }, include: { fromAccount: true, toAccount: true } }),
    prisma.conversion.findMany({ take: limit, orderBy: { date: 'desc' }, include: { fromAccount: true, toAccount: true } }),
  ])

  const all = [
    ...expenses.map(e => ({ id: e.id, type: 'expense', date: e.date, label: e.description || e.merchantName || e.category, sub: e.category, amount: e.amountRSD, currency: 'RSD', href: `/expenses/${e.type}` })),
    ...income.map(e => ({ id: e.id, type: 'income', date: e.date, label: e.client || e.type, sub: e.type, amount: e.netAmount, currency: e.currency, href: '/income' })),
    ...transfers.map(e => ({ id: e.id, type: 'transfer', date: e.date, label: `${e.fromAccount?.name} → ${e.toAccount?.name}`, sub: 'Transfer', amount: e.amountSent, currency: '', href: '/transfers' })),
    ...conversions.map(e => ({ id: e.id, type: 'conversion', date: e.date, label: `${e.fromAccount?.name} → ${e.toAccount?.name}`, sub: 'Conversion', amount: e.amountSent, currency: '', href: '/conversions' })),
  ]

  all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return NextResponse.json(all.slice(0, limit))
}
