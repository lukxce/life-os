export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const pib = req.nextUrl.searchParams.get('pib')
  if (!pib) return NextResponse.json({ category: null, subcategory: null })

  const last = await prisma.expenseEntry.findFirst({
    where: { merchantPib: pib },
    orderBy: { date: 'desc' },
    select: { category: true, subcategory: true }
  })

  return NextResponse.json({
    category: last?.category || null,
    subcategory: last?.subcategory || null,
  })
}