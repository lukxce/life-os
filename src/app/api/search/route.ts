export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get('q')?.trim()
  if (!q || q.length < 2) {
    return NextResponse.json({ finance: {}, life: {}, food: {} })
  }

  const contains = { contains: q, mode: 'insensitive' as const }

  const [
    expenses, income, subscriptions, bills,
    habits, goals, contacts,
    places,
    watchlist,
  ] = await Promise.all([
    // Finance
    prisma.expenseEntry.findMany({
      where: { OR: [{ description: contains }, { merchantName: contains }, { category: contains }, { subcategory: contains }, { notes: contains }] },
      take: 4, orderBy: { date: 'desc' },
    }),
    prisma.incomeEntry.findMany({
      where: { OR: [{ client: contains }, { notes: contains }, { type: contains }] },
      take: 3, orderBy: { date: 'desc' },
    }),
    prisma.subscription.findMany({
      where: { name: contains },
      take: 3,
    }),
    prisma.bill.findMany({
      where: { OR: [{ name: contains }, { category: contains }] },
      take: 3,
    }),

    // Life
    prisma.habit.findMany({
      where: { OR: [{ name: contains }, { category: contains }] },
      take: 5, orderBy: { order: 'asc' },
    }),
    prisma.goal.findMany({
      where: { name: contains },
      take: 5,
    }),
    prisma.contact.findMany({
      where: { OR: [{ name: contains }, { note: contains }] },
      take: 5,
    }),

    // Food
    prisma.place.findMany({
      where: { OR: [{ name: contains }, { city: contains }, { cuisine: contains }, { notes: contains }, { mustOrder: contains }] },
      take: 5, orderBy: { createdAt: 'desc' },
    }),

    // Watchlist
    prisma.watchlistItem.findMany({
      where: { OR: [{ title: contains }, { author: contains }, { notes: contains }] },
      take: 5, orderBy: { updatedAt: 'desc' },
    }),
  ])

  return NextResponse.json({
    finance:   { expenses, income, subscriptions, bills },
    life:      { habits, goals, contacts, watchlist },
    food:      { places },
  })
}
