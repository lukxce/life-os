export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { utcMidnight } from '@/lib/utils'

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get('date')
  if (!date) return NextResponse.json({ error: 'Missing date' }, { status: 400 })
  const logs = await prisma.mealLog.findMany({ where: { date: utcMidnight(date) }, orderBy: { createdAt: 'asc' } })
  return NextResponse.json(logs)
}

// Always creates a new row — logging the same mealType again records another
// real meal (e.g. a second snack) rather than overwriting the first
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { date, mealType, description } = body
  if (!date || !mealType) return NextResponse.json({ error: 'Missing date or mealType' }, { status: 400 })

  const log = await prisma.mealLog.create({
    data: { date: utcMidnight(date), mealType, description: description ?? null },
  })
  return NextResponse.json(log)
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  await prisma.mealLog.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
