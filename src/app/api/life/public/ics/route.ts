import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseICS } from '@/lib/ics'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 401 })

  const [busyRow, publicRow] = await Promise.all([
    prisma.appConfig.findUnique({ where: { key: 'shareBusyToken' } }),
    prisma.appConfig.findUnique({ where: { key: 'sharePublicToken' } }),
  ])

  const isBusy = busyRow?.value === token
  const isPublic = publicRow?.value === token
  if (!isBusy && !isPublic) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const calendars = await prisma.iCSCalendar.findMany({ orderBy: { order: 'asc' } })

  const allEvents: object[] = []
  await Promise.all(calendars.map(async cal => {
    try {
      const res = await fetch(cal.url, { headers: { 'User-Agent': 'HabitTracker/1.0' }, next: { revalidate: 300 } })
      if (!res.ok) return
      const events = parseICS(await res.text())
      for (const ev of events) {
        if (isBusy) {
          allEvents.push({ uid: ev.uid, start: ev.start, end: ev.end, allDay: ev.allDay, summary: 'Busy' })
        } else {
          allEvents.push({ ...ev, calendarName: cal.name, calendarColor: cal.color })
        }
      }
    } catch {}
  }))

  allEvents.sort((a, b) => new Date((a as { start: string }).start).getTime() - new Date((b as { start: string }).start).getTime())

  return NextResponse.json({ events: allEvents, isBusy, calendars: isPublic ? calendars.map(c => ({ name: c.name, color: c.color })) : [] })
}
