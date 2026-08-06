export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const subs = await prisma.subscription.findMany({ orderBy: { name: 'asc' } })
  return NextResponse.json(subs)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const sub = await prisma.subscription.create({
    data: {
      name: body.name,
      type: body.type || 'personal',
      billingAmount: body.billingAmount,
      billingCurrency: body.billingCurrency,
      category: body.category || null,
      subcategory: body.subcategory || null,
      accountId: body.accountId || null,
      active: body.active ?? true,
      notes: body.notes || null,
    }
  })
  return NextResponse.json(sub)
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, ...rest } = body
  const data: Record<string, unknown> = { ...rest }
  if ('category' in data) data.category = data.category || null
  if ('subcategory' in data) data.subcategory = data.subcategory || null
  if ('accountId' in data) data.accountId = data.accountId || null
  if ('notes' in data) data.notes = data.notes || null

  const sub = await prisma.subscription.update({ where: { id }, data })
  return NextResponse.json(sub)
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  await prisma.subscription.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
