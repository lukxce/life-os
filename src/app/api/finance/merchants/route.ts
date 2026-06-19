export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const nicknames = await prisma.merchantNickname.findMany()
  return NextResponse.json(nicknames)
}

export async function PATCH(req: NextRequest) {
  const { pib, customName, category, subcategory } = await req.json()
  if (!pib || !customName?.trim()) {
    return NextResponse.json({ error: 'pib and customName required' }, { status: 400 })
  }
  const record = await prisma.merchantNickname.upsert({
    where: { pib },
    create: { pib, customName: customName.trim(), category: category ?? null, subcategory: subcategory ?? null },
    update: {
      customName: customName.trim(),
      ...(category    !== undefined && { category }),
      ...(subcategory !== undefined && { subcategory }),
    },
  })
  return NextResponse.json(record)
}

export async function DELETE(req: NextRequest) {
  const { pib } = await req.json()
  await prisma.merchantNickname.delete({ where: { pib } }).catch(() => null)
  return NextResponse.json({ success: true })
}
