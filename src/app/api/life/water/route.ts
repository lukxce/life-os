export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { utcMidnight } from '@/lib/utils'

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date')
  if (!date) return NextResponse.json({ error: 'Missing date' }, { status: 400 })
  const logs = await prisma.waterLog.findMany({
    where: { date: utcMidnight(date) },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(logs, { headers: { 'Cache-Control': 'no-store, max-age=0, must-revalidate' } })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { date, drink, volumeMl } = body
  if (!date || !volumeMl) return NextResponse.json({ error: 'Missing date or volumeMl' }, { status: 400 })

  const log = await prisma.waterLog.create({
    data: { date: utcMidnight(date), drink: drink?.trim() || 'Water', volumeMl: Math.round(volumeMl) },
  })
  return NextResponse.json(log)
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  await prisma.waterLog.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
