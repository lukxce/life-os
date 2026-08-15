'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'
import {
  Search, Bell, Moon, Plus, LayoutDashboard, TrendingUp, ShoppingCart, Briefcase,
  CreditCard, FileText, Building2, Target, Lightbulb,
} from 'lucide-react'
import { formatRSD, formatEUR, formatDate, Period, cn } from '@/lib/utils'
import { Card, Label, CHART_COLORS } from '@/components/ledger/primitives'
import { SignalsCard } from '@/components/finance/SignalsCard'

// Matches the real app's system-font stack exactly, overriding the beta
// layout's Geist wrapper via inline style (highest specificity) — this
// page should read as "the current app", not a redesign.
const SYSTEM_FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'

const GLOBAL_NAV = [
  { href: '/',          label: 'Dashboard' },
  { href: '/finance',   label: 'Finance' },
  { href: '/life',      label: 'Habits' },
  { href: '/fitness',   label: 'Fitness' },
  { href: '/schedule',  label: 'Schedule' },
  { href: '/journal',   label: 'Journal' },
  { href: '/food',      label: 'Food' },
  { href: '/personal',  label: 'Personal' },
  { href: '/watchlist', label: 'Watchlist' },
]

const RAIL = [
  { icon: LayoutDashboard, href: '/finance',                   label: 'Finance Home', active: true },
  { icon: TrendingUp,      href: '/finance/income',             label: 'Income' },
  { icon: ShoppingCart,    href: '/finance/expenses/personal',  label: 'Personal Expenses' },
  { icon: Briefcase,       href: '/finance/expenses/business',  label: 'Business Expenses' },
  { icon: CreditCard,      href: '/finance/subscriptions',      label: 'Subscriptions' },
  { icon: FileText,        href: '/finance/bills',              label: 'Bills & Loans' },
  { icon: Building2,       href: '/finance/accounts',           label: 'Accounts' },
  { icon: Target,          href: '/finance/budgets',            label: 'Budgets' },
  { icon: Lightbulb,       href: '/finance/insights',           label: 'Insights' },
]

// Light frosted glass — sits over the app's actual ldg-paper background,
// distinguishing the floating chrome from the plain content beneath it.
const navGlass: React.CSSProperties = {
  background: 'rgba(255,255,255,0.68)',
  backdropFilter: 'blur(22px) saturate(160%)', WebkitBackdropFilter: 'blur(22px) saturate(160%)',
  border: '1px solid rgba(255,255,255,0.85)',
  boxShadow: '0 10px 30px rgba(20,30,25,0.08), inset 0 1px 0 rgba(255,255,255,0.9)',
}

export default function FinanceLiveGlassBeta() {
  const [data, setData] = useState<any>(null)
  const [period, setPeriod] = useState<Period>('month')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [recent, setRecent] = useState<any[]>([])

  useEffect(() => {
    fetch(`/api/finance/dashboard?period=${period}&date=${date}`).then(r => r.json()).then(setData).catch(() => {})
  }, [period, date])
  useEffect(() => { fetch('/api/finance/recent?limit=6').then(r => r.json()).then(setRecent).catch(() => {}) }, [])

  const monthOut = data ? data.personalExpenses.concat(data.businessExpenses).reduce((s: number, e: any) => s + e.amountRSD, 0) : 0

  return (
    <div style={{ minHeight: '100dvh', fontFamily: SYSTEM_FONT, background: 'rgb(var(--l-paper))' }}>
      {/* Left rail — rounded frosted buttons, replacing the plain sidebar list */}
      <div style={{ position: 'fixed', left: 18, top: '50%', transform: 'translateY(-50%)', zIndex: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgb(var(--l-ink) / 0.35)', marginBottom: 2, writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Finance</span>
        {RAIL.map((r, i) => (
          <span key={r.href} style={{ position: 'relative' }}>
            <Link href={r.href} title={r.label}
              className="group"
              style={{
                width: 42, height: 42, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                textDecoration: 'none', position: 'relative',
                ...(r.active ? { background: 'rgb(var(--l-green))', boxShadow: '0 4px 14px rgba(46,125,79,0.35)' } : { ...navGlass }),
              }}>
              <r.icon size={16} color={r.active ? '#fff' : 'rgb(var(--l-ink) / 0.6)'} />
              <span className="rail-label" style={{
                position: 'absolute', left: 52, top: '50%', transform: 'translateY(-50%)',
                background: 'rgb(var(--l-ink))', color: 'rgb(var(--l-paper))', fontSize: 11, fontWeight: 600,
                padding: '5px 10px', borderRadius: 8, whiteSpace: 'nowrap', opacity: 0, pointerEvents: 'none', transition: 'opacity .15s',
              }}>{r.label}</span>
            </Link>
            {i === 0 && <div style={{ width: 20, height: 1, background: 'rgb(var(--l-ink) / 0.12)', margin: '4px auto' }} />}
          </span>
        ))}
      </div>
      <style>{`.group:hover .rail-label { opacity: 1 !important; }`}</style>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 20px 60px 84px' }}>
        {/* Floating pill top nav */}
        <div style={{ position: 'sticky', top: 14, zIndex: 40, display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
          <div style={{ ...navGlass, borderRadius: 999, padding: '7px 10px 7px 16px', display: 'flex', alignItems: 'center', gap: 18, width: 'fit-content', maxWidth: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{ width: 22, height: 22, borderRadius: 7, background: 'rgb(var(--l-green))' }} />
              <span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: '0.08em' }}>LIFE OS</span>
            </div>
            <div style={{ display: 'flex', gap: 1, overflowX: 'auto' }}>
              {GLOBAL_NAV.map(n => {
                const active = n.href === '/finance'
                return (
                  <span key={n.href} style={{
                    fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 999, whiteSpace: 'nowrap',
                    background: active ? 'rgb(var(--l-green) / 0.12)' : 'transparent',
                    color: active ? 'rgb(var(--l-green))' : 'rgb(var(--l-ink) / 0.55)',
                  }}>{n.label}</span>
                )
              })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {[Search, Bell, Moon].map((Icon, i) => (
                <span key={i} style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  <Icon size={13} color="rgb(var(--l-ink) / 0.55)" />
                  {i === 1 && <span style={{ position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: '50%', background: 'rgb(var(--l-green))', border: '1.5px solid #fff' }} />}
                </span>
              ))}
              <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', background: 'rgb(var(--l-ink))', borderRadius: 999, padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Plus size={12} /> New
              </span>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgb(var(--l-green))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>LJ</div>
            </div>
          </div>
        </div>

        {/* ── Everything below is the real page's actual content, unchanged ── */}
        <div className="space-y-4 pb-8">
          <Card className="p-5">
            <Label>Net worth</Label>
            {data ? (
              <>
                <p className="font-mono text-[32px] tabular-nums tracking-tight leading-none mt-1">{formatEUR(data.totals.totalEUR)}</p>
                <p className="font-mono text-[12px] text-ldg-ink/55 mt-1">{formatRSD(data.totals.totalRSD)}</p>
                <div className="grid grid-cols-3 mt-4 border-t border-ldg-ink/[0.07] pt-3">
                  <div>
                    <p className="text-[11px] text-ldg-ink/55">Personal</p>
                    <p className="font-mono text-[15px] font-semibold tabular-nums mt-0.5">{formatEUR(data.totals.personalEUR)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-ldg-ink/55">Company</p>
                    <p className="font-mono text-[15px] font-semibold tabular-nums mt-0.5">{formatEUR(data.totals.companyEUR)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-ldg-ink/55">Out · {period === 'month' ? 'this month' : period}</p>
                    <p className="font-mono text-[15px] font-semibold tabular-nums mt-0.5 text-ldg-urgent">{formatRSD(monthOut)}</p>
                  </div>
                </div>
                <p className="font-mono text-[11px] text-ldg-ink/55 mt-3">EUR/RSD live {data.liveRate.toFixed(2)} · manual {data.manualRate.toFixed(2)}</p>
              </>
            ) : <div className="h-36 flex items-center text-ldg-ink/40 animate-pulse">Loading…</div>}
          </Card>

          <SignalsCard />

          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {[
              { label: 'Today', period: 'day' as Period, offset: 0 },
              { label: 'This Week', period: 'week' as Period, offset: 0 },
              { label: 'This Month', period: 'month' as Period, offset: 0 },
              { label: 'Last Month', period: 'month' as Period, offset: -1 },
              { label: 'YTD', period: 'year' as Period, offset: 0 },
              { label: 'All Time', period: 'all' as Period, offset: 0 },
            ].map(s => {
              const d = new Date()
              if (s.offset) d.setMonth(d.getMonth() + s.offset)
              const dStr = d.toISOString().split('T')[0]
              const active = period === s.period && (s.period === 'all' || date === dStr)
              return (
                <button key={s.label} onClick={() => { setPeriod(s.period); setDate(dStr) }}
                  className={cn('shrink-0 text-[13px] px-3 py-1.5 rounded-lg border transition-colors',
                    active ? 'font-semibold bg-ldg-green/10 text-ldg-green border-ldg-green/30' : 'font-medium text-ldg-ink/55 border-ldg-ink/10')}>
                  {s.label}
                </button>
              )
            })}
          </div>

          {data && (() => {
            const pinned = data.accounts.filter((a: any) => a.pinned)
            const shown = pinned.length > 0 ? pinned : data.accounts
            return (
              <div>
                <div className="flex items-center justify-between mb-2 px-1">
                  <Label>Accounts</Label>
                  <Link href="/finance/accounts" className="font-mono text-[12px] underline underline-offset-2 text-ldg-ink/55">See all {data.accounts.length} →</Link>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
                  {shown.map((acc: any) => (
                    <Card key={acc.id} className="snap-start shrink-0 w-[190px] p-4">
                      <Label>{acc.name}</Label>
                      <p className="font-mono text-[15px] font-semibold tabular-nums mt-1.5">{acc.currency === 'EUR' ? formatEUR(acc.currentBalance) : formatRSD(acc.currentBalance)}</p>
                      <p className="font-mono text-[12px] text-ldg-ink/55 tabular-nums">{acc.currency === 'EUR' ? formatRSD(acc.balanceRSD) : formatEUR(acc.balanceEUR)}</p>
                    </Card>
                  ))}
                </div>
              </div>
            )
          })()}

          {recent.length > 0 && (
            <Card className="overflow-hidden">
              <div className="px-5 py-3.5 border-b border-ldg-ink/[0.07]"><Label>Recent activity</Label></div>
              <div className="px-5">
                {recent.map(r => (
                  <Link key={`${r.type}-${r.id}`} href={r.href}
                    className="flex items-center gap-3 py-2.5 border-t border-ldg-ink/[0.07] first:border-t-0 hover:bg-ldg-ink/[0.02] transition-colors -mx-5 px-5">
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] text-ldg-ink truncate">{r.label || r.sub}</p>
                      <p className="font-mono text-[12px] text-ldg-ink/55">{formatDate(r.date)}</p>
                    </div>
                    <span className={cn('font-mono text-[14px] tabular-nums shrink-0',
                      r.type === 'expense' ? 'text-ldg-urgent' : r.type === 'income' ? 'text-ldg-green' : 'text-ldg-ink/55')}>
                      {r.type === 'expense' ? '−' : r.type === 'income' ? '+' : ''}{r.amount.toLocaleString()}{r.currency ? ` ${r.currency}` : ''}
                    </span>
                  </Link>
                ))}
              </div>
            </Card>
          )}

          {data && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[{ title: 'Personal spending', data: data.personalExpenses }, { title: 'Business spending', data: data.businessExpenses }].map(section => (
                <Card key={section.title} className="p-5">
                  <Label>{section.title}</Label>
                  {section.data.filter((e: any) => e.amountRSD > 0).length === 0 ? (
                    <p className="font-mono text-[12px] text-ldg-ink/55 text-center py-8">nothing this period</p>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={170}>
                        <PieChart>
                          <Pie data={section.data.filter((e: any) => e.amountRSD > 0)} dataKey="amountRSD" nameKey="category"
                            cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} strokeWidth={0}>
                            {section.data.filter((e: any) => e.amountRSD > 0).map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v: any) => formatRSD(v)} contentStyle={{ fontSize: 12, borderRadius: 12, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="mt-2">
                        {section.data.filter((e: any) => e.amountRSD > 0).map((e: any, i: number) => (
                          <div key={e.category} className="flex items-center justify-between py-2 border-t border-ldg-ink/[0.07] first:border-t-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                              <span className="text-[14px] text-ldg-ink truncate">{e.category}</span>
                            </div>
                            <span className="font-mono text-[14px] text-ldg-ink shrink-0 ml-2 tabular-nums">{formatRSD(e.amountRSD)}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
