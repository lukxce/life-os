export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') ?? '30')

  const logs = await prisma.workoutLog.findMany({
    where: { userId: 'default' },
    orderBy: { date: 'desc' },
    take: limit,
  })
  return NextResponse.json(logs)
}

export async function POST(req: NextRequest) {
  const { date, type, duration, notes } = await req.json()
  const log = await prisma.workoutLog.create({
    data: { userId: 'default', date: new Date(date), type, duration: duration ? +duration : null, notes: notes || null },
  })
  return NextResponse.json(log)
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  await prisma.workoutLog.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
