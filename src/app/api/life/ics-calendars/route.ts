import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const cals = await prisma.iCSCalendar.findMany({ orderBy: [{ order: 'asc' }] })
  return NextResponse.json(cals)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const count = await prisma.iCSCalendar.count()
  const cal = await prisma.iCSCalendar.create({
    data: { name: body.name, url: body.url, color: body.color ?? '#6366f1', order: count },
  })
  return NextResponse.json(cal)
}
