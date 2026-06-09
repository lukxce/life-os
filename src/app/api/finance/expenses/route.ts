export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDateRange, Period } from '@/lib/utils'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const period = (searchParams.get('period') || 'all') as Period
  const date = searchParams.get('date') ? new Date(searchParams.get('date')!) : new Date()
  const type = searchParams.get('type') // "personal" | "business" | null

  const range = getDateRange(period, date)
  const where: any = {}
  if (range) where.date = { gte: range.start, lte: range.end }
  if (type) where.type = type

  const entries = await prisma.expenseEntry.findMany({
    where,
    include: { account: true },
    orderBy: { date: 'desc' }
  })
  return NextResponse.json(entries)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const settings = await prisma.settings.findFirst()
  const rate = settings?.manualRate ?? 117.5
  const amountRSD = body.currency === 'EUR' ? body.amount * rate : body.amount

  const entry = await prisma.expenseEntry.create({
    data: {
      date: new Date(body.date),
      type: body.type,
      category: body.category,
      subcategory: body.subcategory,
      description: body.description,
      amount: body.amount,
      currency: body.currency,
      accountId: body.accountId,
      amountRSD,
      vatReclaimable: body.vatReclaimable ?? false,
      notes: body.notes,
      merchantName: body.merchantName || null,
      merchantPib: body.merchantPib || null,
      sufUrl: body.sufUrl || null,
      pdfUrl: body.pdfUrl || null,
      hasWarranty: body.hasWarranty ?? false,
      warrantyMonths: body.warrantyMonths || null,
      warrantyNotes: body.warrantyNotes || null,
    },
    include: { account: true }
  })
  return NextResponse.json(entry)
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, ...data } = body
  const settings = await prisma.settings.findFirst()
  const rate = settings?.manualRate ?? 117.5
  if (data.amount !== undefined && data.currency) {
    data.amountRSD = data.currency === 'EUR' ? data.amount * rate : data.amount
  }
  if (data.date) data.date = new Date(data.date)
  if (data.warrantyMonths === '') data.warrantyMonths = null
  const entry = await prisma.expenseEntry.update({ where: { id }, data, include: { account: true } })

  // Auto-save merchant nickname whenever a name is explicitly set on a PIB expense
  if (entry.merchantPib && entry.merchantName) {
    await prisma.merchantNickname.upsert({
      where: { pib: entry.merchantPib },
      create: { pib: entry.merchantPib, customName: entry.merchantName },
      update: { customName: entry.merchantName },
    })
  }

  return NextResponse.json(entry)
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  await prisma.expenseEntry.delete({ where: { id } })
  return NextResponse.json({ success: true })
}