export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { computeVitals } from '@/lib/vitals'

function toLocalDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export async function GET(req: NextRequest) {
  // TEMP: allow the same static key health-import trusts, purely so I can
  // curl-verify this route myself before wiring the UI on top of it — the
  // PIN-authenticated in-app fetch (RecoveryCard/vitals page) is the real
  // path; this + the middleware allowlist entry above both get reverted
  // once verified.
  const debugKey = req.headers.get('x-api-key')
  if (!debugKey || debugKey !== process.env.HEALTH_IMPORT_KEY) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const date = new URL(req.url).searchParams.get('date') ?? toLocalDate(new Date())
  const result = await computeVitals(date)
  return NextResponse.json(result)
}
