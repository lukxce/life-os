export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 401 })

  const stored = await prisma.appConfig.findUnique({ where: { key: 'shareToken' } })
  if (!stored || stored.value !== token) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const showDetailsRow = await prisma.appConfig.findUnique({ where: { key: 'shareShowDetails' } })
  const showDetails = showDetailsRow?.value !== 'false'

  const [blocks, days] = await Promise.all([
    prisma.scheduleBlock.findMany({ orderBy: { startTime: 'asc' } }),
    prisma.scheduleDay.findMany(),
  ])

  const blocksByDay: Record<string, typeof blocks> = {}
  for (const b of blocks) {
    if (!blocksByDay[b.day]) blocksByDay[b.day] = []
    const block = showDetails ? b : { ...b, name: 'Busy', note: null, category: 'ritual', sacred: false }
    blocksByDay[b.day].push(block)
  }

  const daysMap: Record<string, typeof days[0]> = {}
  for (const d of days) daysMap[d.day] = d

  return NextResponse.json({ blocks: blocksByDay, days: daysMap, showDetails })
}
