export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Maps Health Auto Export's metric names to our internal keys, plus how
// to combine multiple same-day readings for each: cumulative counters get
// summed, rate-style vitals get averaged, point-in-time values keep the
// latest reading.
const METRIC_MAP: Record<string, { key: string; combine: 'sum' | 'avg' | 'last' }> = {
  step_count:               { key: 'steps',        combine: 'sum' },
  steps:                     { key: 'steps',        combine: 'sum' },
  active_energy:             { key: 'activeEnergy', combine: 'sum' },
  apple_exercise_time:       { key: 'exerciseMin',  combine: 'sum' },
  resting_heart_rate:        { key: 'restingHR',    combine: 'avg' },
  heart_rate_variability:    { key: 'hrv',          combine: 'avg' },
  sleep_analysis:            { key: 'sleepHours',   combine: 'sum' },
  weight_body_mass:          { key: 'weight',       combine: 'last' },
  body_mass:                 { key: 'weight',       combine: 'last' },
}

type Reading = { metric: string; date: string; value: number }

function localDayKey(dateStr: string): string {
  // Accepts "2026-07-14 00:00:00 +0000" (Health Auto Export) or ISO —
  // we only care about the calendar day, in local time.
  const d = new Date(dateStr.replace(' ', 'T').replace(/\s*\+\d{4}$/, 'Z'))
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function normalize(body: any): Reading[] {
  const out: Reading[] = []

  // Health Auto Export REST-API export shape
  if (body?.data?.metrics) {
    for (const m of body.data.metrics) {
      const mapped = METRIC_MAP[m.name]
      if (!mapped) continue
      for (const row of m.data ?? []) {
        const value = row.qty ?? row.Avg ?? row.avg ?? row.value
        if (typeof value !== 'number') continue
        out.push({ metric: mapped.key, date: row.date, value })
      }
    }
    return out
  }

  // Simple custom shape for a manual iOS Shortcut: { metrics: [{ metric, date, value }] }
  if (Array.isArray(body?.metrics)) {
    for (const row of body.metrics) {
      if (typeof row.value !== 'number' || !row.date || !row.metric) continue
      out.push({ metric: row.metric, date: row.date, value: row.value })
    }
  }
  return out
}

export async function POST(req: NextRequest) {
  const secret = process.env.HEALTH_INGEST_SECRET
  if (!secret) return NextResponse.json({ error: 'HEALTH_INGEST_SECRET not configured' }, { status: 500 })

  const auth = req.headers.get('authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : req.nextUrl.searchParams.get('token')
  if (token !== secret) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  const readings = normalize(body)
  if (readings.length === 0) return NextResponse.json({ ingested: 0 })

  // Group by (day, metric) so a source that sends per-sample data (e.g.
  // sleep_analysis with several intervals) collapses to one row per day.
  const groups = new Map<string, { metric: string; day: string; values: number[]; combine: 'sum' | 'avg' | 'last' }>()
  for (const r of readings) {
    const combine = (Object.values(METRIC_MAP).find(m => m.key === r.metric)?.combine) ?? 'last'
    const day = localDayKey(r.date)
    const gkey = `${day}:${r.metric}`
    if (!groups.has(gkey)) groups.set(gkey, { metric: r.metric, day, values: [], combine })
    groups.get(gkey)!.values.push(r.value)
  }

  let ingested = 0
  for (const g of Array.from(groups.values())) {
    const value = g.combine === 'sum' ? g.values.reduce((s, v) => s + v, 0)
      : g.combine === 'avg' ? g.values.reduce((s, v) => s + v, 0) / g.values.length
      : g.values[g.values.length - 1]
    await prisma.healthMetric.upsert({
      where: { date_metric: { date: new Date(g.day + 'T00:00:00.000Z'), metric: g.metric } },
      create: { date: new Date(g.day + 'T00:00:00.000Z'), metric: g.metric, value },
      update: { value },
    })
    ingested++
  }

  return NextResponse.json({ ingested })
}
