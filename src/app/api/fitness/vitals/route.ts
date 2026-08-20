export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { computeVitals } from '@/lib/vitals'

function toLocalDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export async function GET(req: NextRequest) {
  const date = new URL(req.url).searchParams.get('date') ?? toLocalDate(new Date())
  const result = await computeVitals(date)
  return NextResponse.json(result)
}
