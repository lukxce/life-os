import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const [blocks, days] = await Promise.all([
    prisma.scheduleBlock.findMany({ orderBy: [{ day: 'asc' }, { startTime: 'asc' }] }),
    prisma.scheduleDay.findMany(),
  ])
  const blocksByDay: Record<string, typeof blocks> = {}
  for (const b of blocks) {
    if (!blocksByDay[b.day]) blocksByDay[b.day] = []
    blocksByDay[b.day].push(b)
  }
  const daysMap: Record<string, typeof days[0]> = {}
  for (const d of days) daysMap[d.day] = d
  return NextResponse.json({ blocks: blocksByDay, days: daysMap })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const block = await prisma.scheduleBlock.create({
    data: {
      day: body.day,
      startTime: body.startTime,
      endTime: body.endTime ?? null,
      name: body.name,
      note: body.note ?? null,
      category: body.category,
      sacred: body.sacred ?? false,
    },
  })
  return NextResponse.json(block)
}
