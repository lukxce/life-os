export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/life/body-metrics
// ?metric=weight           → history for one metric, ordered oldest→newest
// ?metrics=weight,waist    → history for multiple metrics
// (no params)              → latest value for every metric
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const metric  = searchParams.get('metric')
  const metrics = searchParams.get('metrics')

  if (metric) {
    const rows = await prisma.bodyMetric.findMany({
      where: { metric },
      orderBy: { date: 'asc' },
    })
    return NextResponse.json(rows)
  }

  if (metrics) {
    const list = metrics.split(',').map(m => m.trim()).filter(Boolean)
    const rows = await prisma.bodyMetric.findMany({
      where: { metric: { in: list } },
      orderBy: { date: 'asc' },
    })
    return NextResponse.json(rows)
  }

  // Return the latest entry per metric
  const all = await prisma.bodyMetric.findMany({ orderBy: { date: 'desc' } })
  const seen = new Set<string>()
  const latest = all.filter(r => {
    if (seen.has(r.metric)) return false
    seen.add(r.metric)
    return true
  })
  return NextResponse.json(latest)
}

// POST /api/life/body-metrics
// { metric, value, date? (ISO string), notes? }
// Upserts: one entry per metric per calendar day
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { metric, value, notes } = body

  if (!metric || value == null) {
    return NextResponse.json({ error: 'metric and value required' }, { status: 400 })
  }

  // Truncate to midnight UTC for the given date (or today)
  const rawDate = body.date ? new Date(body.date) : new Date()
  const date = new Date(Date.UTC(rawDate.getFullYear(), rawDate.getMonth(), rawDate.getDate()))

  const row = await prisma.bodyMetric.upsert({
    where: { date_metric: { date, metric } },
    update: { value: Number(value), notes: notes ?? null },
    create: { date, metric, value: Number(value), notes: notes ?? null },
  })

  return NextResponse.json(row)
}
