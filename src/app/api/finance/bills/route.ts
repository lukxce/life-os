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
      type: body.type || 'personal',
      isLoan: body.isLoan ?? false,
      lender: body.lender || null,
      loanEndDate: body.loanEndDate ? new Date(body.loanEndDate) : null,
    }
  })
  return NextResponse.json(bill)
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, ...rest } = body
  // The edit form sends raw string fields including empty strings for unset
  // optional values ("" for category/accountId/loanEndDate on a non-loan
  // bill) — Prisma rejects "" for a DateTime column outright, which used to
  // fail the *entire* update (including whatever field was actually being
  // changed, e.g. dayOfMonth) while the client still reported success.
  const data: Record<string, unknown> = { ...rest }
  if ('loanEndDate' in data) data.loanEndDate = data.loanEndDate ? new Date(data.loanEndDate as string) : null
  if ('category' in data) data.category = data.category || null
  if ('subcategory' in data) data.subcategory = data.subcategory || null
  if ('accountId' in data) data.accountId = data.accountId || null
  if ('notes' in data) data.notes = data.notes || null
  if ('lender' in data) data.lender = data.lender || null

  const bill = await prisma.bill.update({ where: { id }, data })
  return NextResponse.json(bill)
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  await prisma.bill.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
