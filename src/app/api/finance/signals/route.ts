export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getLiveRate } from '@/lib/utils'

function daysUntil(dayOfMonth: number): number {
  const now = new Date()
  const due = new Date(now.getFullYear(), now.getMonth(), dayOfMonth)
  if (due < now) due.setMonth(due.getMonth() + 1)
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function isPaidThisMonth(payments: { paidDate: Date }[]): boolean {
  if (!payments?.length) return false
  const now = new Date()
  const last = payments[0].paidDate
  return last.getMonth() === now.getMonth() && last.getFullYear() === now.getFullYear()
}

export async function GET() {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
  const dayPct = now.getDate() / monthEnd.getDate()

  const [bills, budgets, monthExpenses, subscriptions, warrantyExpenses, rate] = await Promise.all([
    prisma.bill.findMany({ where: { active: true, isLoan: false }, include: { payments: { orderBy: { paidDate: 'desc' }, take: 1 } } }),
    prisma.budget.findMany(),
    prisma.expenseEntry.findMany({ where: { date: { gte: monthStart, lte: monthEnd } }, select: { category: true, amountRSD: true, currency: true, amount: true, subscriptionId: true } }),
    prisma.subscription.findMany({ where: { active: true }, include: { expenseEntries: { orderBy: { date: 'desc' }, take: 2 } } }),
    prisma.expenseEntry.findMany({ where: { hasWarranty: true, warrantyMonths: { not: null } }, select: { id: true, description: true, merchantName: true, date: true, warrantyMonths: true } }),
    getLiveRate(),
  ])

  // ── Bills due within 3 days (includes already-overdue) ──────────────────
  const billsDueSoon = bills
    .filter(b => !isPaidThisMonth(b.payments))
    .map(b => ({ id: b.id, name: b.name, amount: b.amount, currency: b.currency, daysUntil: daysUntil(b.dayOfMonth) }))
    .filter(b => b.daysUntil <= 3)
    .sort((a, b) => a.daysUntil - b.daysUntil)

  // ── Budgets at/near their monthly limit ──────────────────────────────────
  const spentByCategory: Record<string, { rsd: number; eur: number }> = {}
  for (const e of monthExpenses) {
    if (!spentByCategory[e.category]) spentByCategory[e.category] = { rsd: 0, eur: 0 }
    if (e.currency === 'EUR') spentByCategory[e.category].eur += e.amount
    else spentByCategory[e.category].rsd += e.amount
  }
  const budgetsNearLimit = budgets
    .map(b => {
      const spent = spentByCategory[b.category] ?? { rsd: 0, eur: 0 }
      const rows = [
        b.amountRSD ? { spent: spent.rsd, limit: b.amountRSD, currency: 'RSD' } : null,
        b.amountEUR ? { spent: spent.eur, limit: b.amountEUR, currency: 'EUR' } : null,
      ].filter(Boolean) as { spent: number; limit: number; currency: string }[]
      return rows.map(r => ({ category: b.category, pct: Math.round((r.spent / r.limit) * 100), spent: r.spent, limit: r.limit, currency: r.currency }))
    })
    .flat()
    .filter(r => r.pct >= 80)
    .sort((a, b) => b.pct - a.pct)

  // ── Subscription renewals predicted within 3 days ────────────────────────
  const renewalsSoon = subscriptions
    .map(s => {
      const [last, prev] = s.expenseEntries
      if (!last) return null
      const intervalDays = prev ? Math.round((last.date.getTime() - prev.date.getTime()) / 86400000) : 30
      const estDate = new Date(last.date.getTime() + intervalDays * 86400000)
      const estDaysUntil = Math.ceil((estDate.getTime() - now.getTime()) / 86400000)
      return { id: s.id, name: s.name, amount: s.billingAmount, currency: s.billingCurrency, daysUntil: estDaysUntil }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null && r.daysUntil >= 0 && r.daysUntil <= 3)
    .sort((a, b) => a.daysUntil - b.daysUntil)

  // ── Warranties expiring within 30 days ────────────────────────────────────
  const warrantiesExpiringSoon = warrantyExpenses
    .map(e => {
      const expiresAt = new Date(e.date)
      expiresAt.setMonth(expiresAt.getMonth() + (e.warrantyMonths ?? 0))
      const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / 86400000)
      return { id: e.id, name: e.description || e.merchantName || 'Item', daysLeft }
    })
    .filter(w => w.daysLeft >= 0 && w.daysLeft <= 30)
    .sort((a, b) => a.daysLeft - b.daysLeft)

  // ── Spending pace: % of month elapsed vs % of average monthly spend used ─
  const totalSpentRSD = monthExpenses.reduce((s, e) => s + e.amountRSD, 0)
  const threeMoAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1)
  const priorExpenses = await prisma.expenseEntry.findMany({ where: { date: { gte: threeMoAgo, lt: monthStart } }, select: { amountRSD: true } })
  const avgMonthlyRSD = priorExpenses.length > 0 ? priorExpenses.reduce((s, e) => s + e.amountRSD, 0) / 3 : null
  const pace = avgMonthlyRSD && avgMonthlyRSD > 0
    ? {
        dayPct: Math.round(dayPct * 100),
        spentPct: Math.round((totalSpentRSD / avgMonthlyRSD) * 100),
        status: (totalSpentRSD / avgMonthlyRSD) - dayPct > 0.15 ? 'ahead' as const
          : dayPct - (totalSpentRSD / avgMonthlyRSD) > 0.15 ? 'behind' as const
          : 'onTrack' as const,
      }
    : null

  return NextResponse.json({ billsDueSoon, budgetsNearLimit, renewalsSoon, warrantiesExpiringSoon, pace, liveRate: rate })
}
