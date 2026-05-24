export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json({ expenses: [], income: [], accounts: [], subscriptions: [], bills: [] })

  const [expenses, income, accounts, subscriptions, bills] = await Promise.all([
    prisma.expenseEntry.findMany({
      where: {
        OR: [
          { description: { contains: q, mode: 'insensitive' } },
          { merchantName: { contains: q, mode: 'insensitive' } },
          { merchantPib: { contains: q, mode: 'insensitive' } },
          { notes: { contains: q, mode: 'insensitive' } },
          { category: { contains: q, mode: 'insensitive' } },
          { subcategory: { contains: q, mode: 'insensitive' } },
        ]
      },
      take: 5, orderBy: { date: 'desc' }, include: { account: true }
    }),
    prisma.incomeEntry.findMany({
      where: {
        OR: [
          { client: { contains: q, mode: 'insensitive' } },
          { notes: { contains: q, mode: 'insensitive' } },
          { type: { contains: q, mode: 'insensitive' } },
        ]
      },
      take: 5, orderBy: { date: 'desc' }
    }),
    prisma.account.findMany({
      where: { name: { contains: q, mode: 'insensitive' } },
      take: 5
    }),
    prisma.subscription.findMany({
      where: { name: { contains: q, mode: 'insensitive' } },
      take: 5
    }),
    prisma.bill.findMany({
      where: { name: { contains: q, mode: 'insensitive' } },
      take: 5
    }),
  ])

  return NextResponse.json({ expenses, income, accounts, subscriptions, bills })
}
