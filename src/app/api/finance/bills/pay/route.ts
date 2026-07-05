export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { billId, amount, accountId, category, subcategory, date } = body

  const bill = await prisma.bill.findUnique({ where: { id: billId } })
  if (!bill) return NextResponse.json({ error: 'Bill not found' }, { status: 404 })

  const resolvedAccountId = accountId || bill.accountId
  if (!resolvedAccountId) {
    return NextResponse.json({ error: 'No account set — pick an account or set one on the bill' }, { status: 400 })
  }

  const settings = await prisma.settings.findFirst()
  const rate = settings?.manualRate ?? 117.5
  const currency = bill.currency
  const amountRSD = currency === 'EUR' ? amount * rate : amount

  const expense = await prisma.expenseEntry.create({
    data: {
      date: date ? new Date(date) : new Date(),
      type: bill.type === 'company' ? 'business' : 'personal',
      category: category || bill.category || 'Other',
      subcategory: subcategory || bill.subcategory || null,
      description: bill.name,
      amount,
      currency,
      accountId: resolvedAccountId,
      amountRSD,
      notes: `Bill payment: ${bill.name}`,
    }
  })
  const payment = await prisma.billPayment.create({
    data: {
      billId,
      amount,
      paidDate: date ? new Date(date) : new Date(),
      expenseId: expense.id,
    }
  })

  return NextResponse.json({ expense, payment })
}
