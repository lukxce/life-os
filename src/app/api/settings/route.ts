export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const settings = await prisma.settings.upsert({
    where: { userId: 'default' },
    update: {},
    create: { id: 'default', userId: 'default', manualRate: 117.5, weekStartsOn: 1, theme: 'light' },
  })
  return NextResponse.json(settings)
}

export async function PATCH(req: NextRequest) {
  const data = await req.json()
  const settings = await prisma.settings.upsert({
    where: { userId: 'default' },
    update: data,
    create: { id: 'default', userId: 'default', manualRate: 117.5, weekStartsOn: 1, theme: 'light', ...data },
  })
  return NextResponse.json(settings)
}
