export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET: all merchant nicknames keyed by pib
export async function GET() {
  const nicknames = await prisma.merchantNickname.findMany()
  return NextResponse.json(nicknames)
}

// PATCH: upsert a nickname { pib, customName }
export async function PATCH(req: NextRequest) {
  const { pib, customName } = await req.json()
  if (!pib || !customName?.trim()) {
    return NextResponse.json({ error: 'pib and customName required' }, { status: 400 })
  }
  const record = await prisma.merchantNickname.upsert({
    where: { pib },
    create: { pib, customName: customName.trim() },
    update: { customName: customName.trim() },
  })
  return NextResponse.json(record)
}

// DELETE: remove a nickname
export async function DELETE(req: NextRequest) {
  const { pib } = await req.json()
  await prisma.merchantNickname.delete({ where: { pib } }).catch(() => null)
  return NextResponse.json({ success: true })
}
