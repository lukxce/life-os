export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const accounts = await prisma.account.findMany({ orderBy: { createdAt: 'asc' } })
  return NextResponse.json(accounts)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const account = await prisma.account.create({
    data: {
      name: body.name,
      type: body.type,
      currency: body.currency,
      startingBalance: body.startingBalance ?? 0,
    }
  })
  return NextResponse.json(account)
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, ...data } = body
  const account = await prisma.account.update({ where: { id }, data })
  return NextResponse.json(account)
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  await prisma.account.delete({ where: { id } })
  return NextResponse.json({ success: true })
}