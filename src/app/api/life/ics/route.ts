import { NextRequest, NextResponse } from 'next/server'
import { parseICS } from '@/lib/ics'

export { type ICSEvent } from '@/lib/ics'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'Missing url param' }, { status: 400 })

  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'HabitTracker/1.0' }, next: { revalidate: 300 } })
    if (!res.ok) return NextResponse.json({ error: `Upstream ${res.status}` }, { status: 502 })
    const text = await res.text()
    return NextResponse.json(parseICS(text))
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 })
  }
}
