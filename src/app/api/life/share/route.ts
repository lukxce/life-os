import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'

async function getOrCreate(key: string): Promise<string> {
  const row = await prisma.appConfig.findUnique({ where: { key } })
  if (row) return row.value
  const token = randomUUID()
  await prisma.appConfig.create({ data: { key, value: token } })
  return token
}

export async function GET() {
  const [busyToken, publicToken] = await Promise.all([
    getOrCreate('shareBusyToken'),
    getOrCreate('sharePublicToken'),
  ])
  return NextResponse.json({ busyToken, publicToken })
}

export async function POST(req: NextRequest) {
  const { type } = await req.json()
  const key = type === 'busy' ? 'shareBusyToken' : 'sharePublicToken'
  const token = randomUUID()
  await prisma.appConfig.upsert({
    where: { key },
    update: { value: token },
    create: { key, value: token },
  })
  return NextResponse.json({ token })
}
