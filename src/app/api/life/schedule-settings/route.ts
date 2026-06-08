import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const KEYS = ['scheduleLocation', 'scheduleMeetingLink'] as const

export async function GET() {
  const rows = await prisma.appConfig.findMany({
    where: { key: { in: [...KEYS] } },
  })
  const result: Record<string, string> = {}
  for (const row of rows) result[row.key] = row.value
  return NextResponse.json({
    location: result['scheduleLocation'] ?? '',
    meetingLink: result['scheduleMeetingLink'] ?? '',
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const updates: Promise<unknown>[] = []

  if (body.location !== undefined) {
    updates.push(prisma.appConfig.upsert({
      where: { key: 'scheduleLocation' },
      update: { value: body.location },
      create: { key: 'scheduleLocation', value: body.location },
    }))
  }
  if (body.meetingLink !== undefined) {
    updates.push(prisma.appConfig.upsert({
      where: { key: 'scheduleMeetingLink' },
      update: { value: body.meetingLink },
      create: { key: 'scheduleMeetingLink', value: body.meetingLink },
    }))
  }

  await Promise.all(updates)
  return NextResponse.json({ ok: true })
}
