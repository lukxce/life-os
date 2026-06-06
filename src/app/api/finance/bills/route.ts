export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const bills = await prisma.bill.findMany({
    orderBy: { dayOfMonth: 'asc' },
    include: { payments: { orderBy: { paidDate: 'desc' }, take: 1 } }
  })
  return NextResponse.json(bills)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const bill = await prisma.bill.create({
    data: {
      name: body.name,
      amount: body.amount,
      currency: body.currency,
      category: body.category || null,
      subcategory: body.subcategory || null,
      accountId: body.accountId || null,
      dayOfMonth: body.dayOfMonth,
      active: body.active ?? true,
      notes: body.notes || null,
      isLoan: body.isLoan ?? false,
      lender: body.lender || null,
    }
  })
  return NextResponse.json(bill)
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, ...data } = body
  const bill = await prisma.bill.update({ where: { id }, data })
  return NextResponse.json(bill)
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  await prisma.bill.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
