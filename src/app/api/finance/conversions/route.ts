export const dynamic = 'force-dynamic'
// ── src/app/api/conversions/route.ts ─────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const entries = await prisma.conversion.findMany({
    include: { fromAccount: true, toAccount: true },
    orderBy: { date: 'desc' }
  })
  return NextResponse.json(entries)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const entry = await prisma.conversion.create({
    data: {
      date: new Date(body.date),
      amountSent: body.amountSent,
      fromAccountId: body.fromAccountId,
      amountReceived: body.amountReceived,
      toAccountId: body.toAccountId,
      rateUsed: body.rateUsed,
      notes: body.notes,
    },
    include: { fromAccount: true, toAccount: true }
  })
  return NextResponse.json(entry)
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, ...data } = body
  if (data.date) data.date = new Date(data.date)
  const entry = await prisma.conversion.update({ where: { id }, data, include: { fromAccount: true, toAccount: true } })
  return NextResponse.json(entry)
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  await prisma.conversion.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

// ── src/app/api/transfers/route.ts ────────────────────────────────────────────
// (Create this as a separate file — same structure)
// import { NextRequest, NextResponse } from 'next/server'
// import { prisma } from '@/lib/prisma'
//
// export async function GET() {
//   const entries = await prisma.transfer.findMany({
//     include: { fromAccount: true, toAccount: true },
//     orderBy: { date: 'desc' }
//   })
//   return NextResponse.json(entries)
// }
//
// export async function POST(req: NextRequest) {
//   const body = await req.json()
//   const entry = await prisma.transfer.create({
//     data: {
//       date: new Date(body.date),
//       amountSent: body.amountSent,
//       fromAccountId: body.fromAccountId,
//       amountReceived: body.amountReceived,
//       toAccountId: body.toAccountId,
//       rateUsed: body.rateUsed,
//       notes: body.notes,
//     },
//     include: { fromAccount: true, toAccount: true }
//   })
//   return NextResponse.json(entry)
// }

// ── src/app/api/settings/route.ts ─────────────────────────────────────────────
// export async function GET() {
//   const settings = await prisma.settings.findFirst()
//   return NextResponse.json(settings ?? { manualRate: 117.5 })
// }
//
// export async function PATCH(req: NextRequest) {
//   const body = await req.json()
//   const settings = await prisma.settings.upsert({
//     where: { id: 'default' },
//     update: { manualRate: body.manualRate },
//     create: { id: 'default', manualRate: body.manualRate },
//   })
//   return NextResponse.json(settings)
// }