import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const questions = await prisma.journalQuestion.findMany({ orderBy: { order: 'asc' } })
  return NextResponse.json(questions)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const count = await prisma.journalQuestion.count()
  const q = await prisma.journalQuestion.create({ data: { text: body.text, order: count } })
  return NextResponse.json(q)
}
