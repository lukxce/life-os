export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDateRange, Period } from '@/lib/utils'
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const period = (searchParams.get('period') || 'all') as Period
  const date = searchParams.get('date') ? new Date(searchParams.get('date')!) : new Date()

  const range = getDateRange(period, date)
  const where = range ? { date: { gte: range.start, lte: range.end } } : {}

  const entries = await prisma.incomeEntry.findMany({
    where,
    include: { account: true },
    orderBy: { date: 'desc' }
  })
  return NextResponse.json(entries)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const net = body.grossAmount - (body.deduction ?? 0)

  // Auto-route account based on type and currency
  let accountId = body.accountId
  if (!accountId) {
    if (body.type === 'Invoice') {
      const acc = await prisma.account.findFirst({
        where: { type: 'company', currency: body.currency }
      })
      accountId = acc?.id
    } else {
      const acc = await prisma.account.findFirst({
        where: { type: 'personal', currency: body.currency, name: { contains: 'OTP' } }
      }) ?? await prisma.account.findFirst({
        where: { type: 'personal', currency: body.currency }
      })
      accountId = acc?.id
    }
  }

  const entry = await prisma.incomeEntry.create({
    data: {
      date: new Date(body.date),
      type: body.type,
      currency: body.currency,
      grossAmount: body.grossAmount,
      deduction: body.deduction ?? 0,
      netAmount: net,
      client: body.client,
      accountId,
      notes: body.notes,
    },
    include: { account: true }
  })
  return NextResponse.json(entry)
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, ...data } = body
  if (data.date) data.date = new Date(data.date)
  if (data.grossAmount !== undefined || data.deduction !== undefined) {
    data.netAmount = (data.grossAmount ?? 0) - (data.deduction ?? 0)
  }
  const entry = await prisma.incomeEntry.update({ where: { id }, data, include: { account: true } })
  return NextResponse.json(entry)
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  await prisma.incomeEntry.delete({ where: { id } })
  return NextResponse.json({ success: true })
}