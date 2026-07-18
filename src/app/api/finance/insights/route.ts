export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDateRange, type Period } from '@/lib/utils'

const PERIODS: Period[] = ['day', 'week', 'month', 'year', 'all']

function getPreviousAnchor(period: Period, date: Date): Date {
  const d = new Date(date)
  switch (period) {
    case 'day':   d.setDate(d.getDate() - 1); break
    case 'week':  d.setDate(d.getDate() - 7); break
    case 'month': d.setMonth(d.getMonth() - 1); break
    case 'year':  d.setFullYear(d.getFullYear() - 1); break
    case 'all':   break
  }
  return d
}

type Entry = { category: string; subcategory: string | null; amountRSD: number; type: string }

function sumByCategory(entries: Entry[]) {
  const map: Record<string, number> = {}
  for (const e of entries) map[e.category] = (map[e.category] ?? 0) + e.amountRSD
  return map
}

function sumBySubcategory(entries: Entry[]) {
  const map: Record<string, Record<string, number>> = {}
  for (const e of entries) {
    const sub = e.subcategory || 'Uncategorized'
    if (!map[e.category]) map[e.category] = {}
    map[e.category][sub] = (map[e.category][sub] ?? 0) + e.amountRSD
  }
  return map
}

function pctDelta(current: number, previous: number) {
  return previous === 0 ? (current > 0 ? 100 : 0) : Math.round(((current - previous) / previous) * 100)
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const period: Period = PERIODS.includes(sp.get('period') as Period) ? (sp.get('period') as Period) : 'month'
  const anchor = sp.get('date') ? new Date(sp.get('date')!) : new Date()
  const type = sp.get('type') // 'personal' | 'business' | null (= all)

  const currentRange = getDateRange(period, anchor)
  const prevRange = period === 'all' ? null : getDateRange(period, getPreviousAnchor(period, anchor))

  const typeFilter = type === 'personal' || type === 'business' ? { type } : {}

  const [thisExp, lastExp, budgets, settings] = await Promise.all([
    prisma.expenseEntry.findMany({
      where: { ...(currentRange ? { date: { gte: currentRange.start, lte: currentRange.end } } : {}), ...typeFilter },
      select: { category: true, subcategory: true, amountRSD: true, type: true },
    }),
    prevRange
      ? prisma.expenseEntry.findMany({
          where: { date: { gte: prevRange.start, lte: prevRange.end }, ...typeFilter },
          select: { category: true, subcategory: true, amountRSD: true, type: true },
        })
      : Promise.resolve([] as Entry[]),
    prisma.budget.findMany(),
    prisma.settings.findFirst(),
  ])

  const thisMap = sumByCategory(thisExp)
  const lastMap = sumByCategory(lastExp)
  const thisSubMap = sumBySubcategory(thisExp)
  const lastSubMap = sumBySubcategory(lastExp)

  const allCats = Array.from(new Set([...Object.keys(thisMap), ...Object.keys(lastMap)]))

  const categories = allCats.map(cat => {
    const current = thisMap[cat] ?? 0
    const previous = lastMap[cat] ?? 0
    const budget = budgets.find(b => b.category === cat)
    const budgetRSD = budget?.amountRSD ?? (budget?.amountEUR ? budget.amountEUR * (settings?.manualRate ?? 117.5) : null)

    const subKeys = Array.from(new Set([...Object.keys(thisSubMap[cat] ?? {}), ...Object.keys(lastSubMap[cat] ?? {})]))
    const subcategories = subKeys
      .map(sub => {
        const c = thisSubMap[cat]?.[sub] ?? 0
        const p = lastSubMap[cat]?.[sub] ?? 0
        return { subcategory: sub, current: c, previous: p, delta: pctDelta(c, p) }
      })
      .sort((a, b) => b.current - a.current)

    return { category: cat, current, previous, delta: pctDelta(current, previous), budgetRSD, subcategories }
  }).sort((a, b) => b.current - a.current)

  const totalThis = Object.values(thisMap).reduce((s, v) => s + v, 0)
  const totalLast = Object.values(lastMap).reduce((s, v) => s + v, 0)

  const topMovers = [...categories]
    .filter(c => c.previous > 0 || c.current > 0)
    .sort((a, b) => Math.abs(b.current - b.previous) - Math.abs(a.current - a.previous))
    .slice(0, 5)

  return NextResponse.json({
    period,
    type: type === 'personal' || type === 'business' ? type : 'all',
    current: { start: currentRange?.start ?? null, end: currentRange?.end ?? null, total: totalThis },
    previous: { start: prevRange?.start ?? null, end: prevRange?.end ?? null, total: totalLast },
    totalDelta: pctDelta(totalThis, totalLast),
    categories,
    topMovers,
  })
}
