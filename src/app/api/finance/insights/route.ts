export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function monthRange(year: number, month: number) {
  const start = new Date(year, month, 1)
  const end   = new Date(year, month + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

export async function GET() {
  const now = new Date()
  const thisMonth  = monthRange(now.getFullYear(), now.getMonth())
  const lastMonth  = monthRange(
    now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear(),
    now.getMonth() === 0 ? 11 : now.getMonth() - 1
  )

  const [thisExp, lastExp, budgets, settings] = await Promise.all([
    prisma.expenseEntry.findMany({
      where: { date: { gte: thisMonth.start, lte: thisMonth.end } },
      select: { category: true, amountRSD: true, type: true },
    }),
    prisma.expenseEntry.findMany({
      where: { date: { gte: lastMonth.start, lte: lastMonth.end } },
      select: { category: true, amountRSD: true, type: true },
    }),
    prisma.budget.findMany(),
    prisma.settings.findFirst(),
  ])

  // Aggregate by category
  const sumByCat = (entries: { category: string; amountRSD: number }[]) => {
    const map: Record<string, number> = {}
    for (const e of entries) {
      map[e.category] = (map[e.category] ?? 0) + e.amountRSD
    }
    return map
  }

  const thisMap = sumByCat(thisExp)
  const lastMap = sumByCat(lastExp)

  const allCats = Array.from(new Set([...Object.keys(thisMap), ...Object.keys(lastMap)]))

  const categories = allCats.map(cat => {
    const current  = thisMap[cat] ?? 0
    const previous = lastMap[cat] ?? 0
    const delta    = previous === 0 ? (current > 0 ? 100 : 0) : Math.round(((current - previous) / previous) * 100)
    const budget   = budgets.find(b => b.category === cat)
    const budgetRSD = budget?.amountRSD ?? (budget?.amountEUR ? budget.amountEUR * (settings?.manualRate ?? 117.5) : null)
    return { category: cat, current, previous, delta, budgetRSD }
  }).sort((a, b) => b.current - a.current)

  const totalThis = Object.values(thisMap).reduce((s, v) => s + v, 0)
  const totalLast = Object.values(lastMap).reduce((s, v) => s + v, 0)
  const totalDelta = totalLast === 0 ? (totalThis > 0 ? 100 : 0) : Math.round(((totalThis - totalLast) / totalLast) * 100)

  // Top movers (biggest absolute change)
  const topMovers = [...categories]
    .filter(c => c.previous > 0 || c.current > 0)
    .sort((a, b) => Math.abs(b.current - b.previous) - Math.abs(a.current - a.previous))
    .slice(0, 5)

  return NextResponse.json({
    thisMonth: { start: thisMonth.start, end: thisMonth.end, total: totalThis },
    lastMonth: { start: lastMonth.start, end: lastMonth.end, total: totalLast },
    totalDelta,
    categories,
    topMovers,
  })
}
