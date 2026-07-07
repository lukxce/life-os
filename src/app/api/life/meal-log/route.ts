export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { utcMidnight } from '@/lib/utils'

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date')
  if (!date) return NextResponse.json({ error: 'Missing date' }, { status: 400 })
  const logs = await prisma.mealLog.findMany({ where: { date: utcMidnight(date) } })
  return NextResponse.json(logs)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { date, mealType, description } = body
  if (!date || !mealType) return NextResponse.json({ error: 'Missing date or mealType' }, { status: 400 })

  const log = await prisma.mealLog.upsert({
    where: { userId_date_mealType: { userId: 'default', date: utcMidnight(date), mealType } },
    update: { description: description ?? null },
    create: { date: utcMidnight(date), mealType, description: description ?? null },
  })
  return NextResponse.json(log)
}
