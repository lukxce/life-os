import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startOfDay } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function GET() {
  const entries = await prisma.journalEntry.findMany({ orderBy: { date: 'desc' }, take: 52 })
  return NextResponse.json(entries)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const date = startOfDay(new Date(body.date + 'T12:00:00.000Z'))
  const entry = await prisma.journalEntry.upsert({
    where: { date },
    update: { answers: body.answers },
    create: { date, answers: body.answers },
  })
  return NextResponse.json(entry)
}
