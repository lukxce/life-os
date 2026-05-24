export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

async function getAccountBalance(accountId: string): Promise<number> {
  const account = await prisma.account.findUnique({ where: { id: accountId } })
  if (!account) return 0

  const [income, expenses, convFrom, convTo, trfFrom, trfTo] = await Promise.all([
    prisma.incomeEntry.aggregate({ where: { accountId }, _sum: { netAmount: true } }),
    prisma.expenseEntry.aggregate({ where: { accountId }, _sum: { amount: true } }),
    prisma.conversion.aggregate({ where: { fromAccountId: accountId }, _sum: { amountSent: true } }),
    prisma.conversion.aggregate({ where: { toAccountId: accountId }, _sum: { amountReceived: true } }),
    prisma.transfer.aggregate({ where: { fromAccountId: accountId }, _sum: { amountSent: true } }),
    prisma.transfer.aggregate({ where: { toAccountId: accountId }, _sum: { amountReceived: true } }),
  ])

  const incomeSum = income._sum.netAmount ?? 0
  const expenseSum = expenses._sum.amount ?? 0
  const netConv = (convTo._sum.amountReceived ?? 0) - (convFrom._sum.amountSent ?? 0)
  const netTrf = (trfTo._sum.amountReceived ?? 0) - (trfFrom._sum.amountSent ?? 0)

  const base = account.manualOverride ?? account.startingBalance
  return base + incomeSum - expenseSum + netConv + netTrf
}

export async function GET() {
  const [goals, settings] = await Promise.all([
    prisma.savingGoal.findMany({
      orderBy: { createdAt: 'asc' },
      include: { deposits: { orderBy: { date: 'desc' } } },
    }),
    prisma.settings.findFirst(),
  ])

  const rate = settings?.manualRate ?? 117.5

  const result = await Promise.all(goals.map(async goal => {
    const accountBalance = goal.accountId ? await getAccountBalance(goal.accountId) : 0

    const depositTotal = goal.deposits.reduce((s, d) => {
      if (d.currency === goal.currency) return s + d.amount
      if (d.currency === 'EUR' && goal.currency === 'RSD') return s + d.amount * rate
      if (d.currency === 'RSD' && goal.currency === 'EUR') return s + d.amount / rate
      return s
    }, 0)

    const saved = goal.accountId ? accountBalance + depositTotal : depositTotal
    const pct = goal.targetAmount > 0 ? Math.min(100, (saved / goal.targetAmount) * 100) : 0

    return { ...goal, saved, pct }
  }))

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  if (body.targetDate) body.targetDate = new Date(body.targetDate)
  const goal = await prisma.savingGoal.create({ data: body })
  return NextResponse.json(goal)
}

export async function PATCH(req: NextRequest) {
  const { id, ...data } = await req.json()
  if (data.targetDate) data.targetDate = new Date(data.targetDate)
  const goal = await prisma.savingGoal.update({ where: { id }, data })
  return NextResponse.json(goal)
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  await prisma.savingGoal.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
