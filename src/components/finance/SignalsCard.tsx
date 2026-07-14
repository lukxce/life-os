'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, TrendingUp, Repeat, ShieldAlert, Gauge } from 'lucide-react'
import { Card, Label } from '@/components/ledger/primitives'
import { cn } from '@/lib/utils'

type Signals = {
  billsDueSoon: { id: string; name: string; amount: number; currency: string; daysUntil: number }[]
  budgetsNearLimit: { category: string; pct: number; spent: number; limit: number; currency: string }[]
  renewalsSoon: { id: string; name: string; amount: number; currency: string; daysUntil: number }[]
  warrantiesExpiringSoon: { id: string; name: string; daysLeft: number }[]
  pace: { dayPct: number; spentPct: number; status: 'ahead' | 'onTrack' | 'behind' } | null
}

function dueLabel(days: number) {
  if (days < 0) return `${Math.abs(days)}d overdue`
  if (days === 0) return 'due today'
  return `due in ${days}d`
}

export function SignalsCard() {
  const [data, setData] = useState<Signals | null>(null)

  useEffect(() => {
    fetch('/api/finance/signals').then(r => r.json()).then(setData).catch(() => {})
  }, [])

  if (!data) return null

  const rows: { key: string; icon: React.ReactNode; text: React.ReactNode; href: string; urgent?: boolean }[] = []

  for (const b of data.billsDueSoon) {
    rows.push({
      key: `bill-${b.id}`,
      icon: <AlertTriangle size={14} />,
      urgent: true,
      href: '/finance/bills',
      text: <><strong className="font-semibold">{b.name}</strong> — {dueLabel(b.daysUntil)} · <span className="font-mono">{b.amount.toLocaleString()} {b.currency}</span></>,
    })
  }
  for (const bud of data.budgetsNearLimit) {
    rows.push({
      key: `budget-${bud.category}`,
      icon: <Gauge size={14} />,
      urgent: bud.pct >= 100,
      href: '/finance/budgets',
      text: <><strong className="font-semibold">{bud.category}</strong> — <span className="font-mono">{bud.pct}%</span> of budget used</>,
    })
  }
  for (const r of data.renewalsSoon) {
    rows.push({
      key: `renewal-${r.id}`,
      icon: <Repeat size={14} />,
      href: '/finance/subscriptions',
      text: <><strong className="font-semibold">{r.name}</strong> — renews {r.daysUntil === 0 ? 'today' : `in ${r.daysUntil}d`} · <span className="font-mono">{r.amount.toLocaleString()} {r.currency}</span></>,
    })
  }
  for (const w of data.warrantiesExpiringSoon) {
    rows.push({
      key: `warranty-${w.id}`,
      icon: <ShieldAlert size={14} />,
      href: '/finance/warranties',
      text: <><strong className="font-semibold">{w.name}</strong> — warranty expires in {w.daysLeft}d</>,
    })
  }
  if (data.pace && data.pace.status !== 'onTrack') {
    rows.push({
      key: 'pace',
      icon: <TrendingUp size={14} />,
      urgent: data.pace.status === 'ahead',
      href: '/finance/insights',
      text: data.pace.status === 'ahead'
        ? <>Spending pace is <strong className="font-semibold">ahead</strong> of the month — <span className="font-mono">{data.pace.spentPct}%</span> of your usual monthly spend at day <span className="font-mono">{data.pace.dayPct}%</span></>
        : <>Spending pace is <strong className="font-semibold">behind</strong> the month — only <span className="font-mono">{data.pace.spentPct}%</span> of your usual monthly spend so far</>,
    })
  }

  if (rows.length === 0) return null

  return (
    <Card className="overflow-hidden">
      <div className="px-5 py-3.5 border-b border-ldg-ink/[0.07]">
        <Label>Signals</Label>
      </div>
      <div className="px-5">
        {rows.map(r => (
          <Link key={r.key} href={r.href}
            className="flex items-start gap-3 py-2.5 border-t border-ldg-ink/[0.07] first:border-t-0 hover:bg-ldg-ink/[0.02] transition-colors -mx-5 px-5">
            <span className={cn('shrink-0 mt-0.5', r.urgent ? 'text-ldg-urgent' : 'text-ldg-ink/55')}>{r.icon}</span>
            <span className="text-[14px] text-ldg-ink leading-snug">{r.text}</span>
          </Link>
        ))}
      </div>
    </Card>
  )
}
