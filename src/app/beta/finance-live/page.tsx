'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'
import {
  Search, Bell, Moon, Plus, LayoutDashboard, TrendingUp, Repeat, Building2, Target,
  Lightbulb, Send, Check, ChevronDown,
} from 'lucide-react'
import { formatRSD, formatEUR, formatDate, Period, cn } from '@/lib/utils'
import { Card, Label, CHART_COLORS } from '@/components/ledger/primitives'
import { SignalsCard } from '@/components/finance/SignalsCard'
import { useCommandBox, describeCommandAction } from '@/hooks/useCommandBox'
import { GrainMesh } from '@/components/beta/GrainMesh'

// Matches the real app's system-font stack exactly, overriding the beta
// layout's Geist wrapper via inline style (highest specificity) — this
// page should read as "the current app", not a redesign.
const SYSTEM_FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'

// Curated primary tabs + a "More" flyout for the rest — showing all 9 at
// once was crowding the pill and pushing Watchlist out of view entirely.
const NAV_PRIMARY = [
  { href: '/',         label: 'Dashboard' },
  { href: '/finance',  label: 'Finance' },
  { href: '/life',     label: 'Habits' },
  { href: '/fitness',  label: 'Fitness' },
  { href: '/schedule', label: 'Schedule' },
]
const NAV_MORE = [
  { href: '/journal',   label: 'Journal' },
  { href: '/food',      label: 'Food' },
  { href: '/personal',  label: 'Personal' },
  { href: '/watchlist', label: 'Watchlist' },
]

// Grouped like the real sidebar's actual sections (Money Flow, Recurring,
// Banking, Planning, Reports) — each rail icon reveals its real sub-pages
// on hover instead of the rail only ever showing one flat level.
const RAIL_GROUPS: { icon: any; label: string; href?: string; items?: { href: string; label: string }[] }[] = [
  { icon: LayoutDashboard, label: 'Finance Home', href: '/finance' },
  { icon: TrendingUp, label: 'Money Flow', items: [
    { href: '/finance/income', label: 'Income' },
    { href: '/finance/expenses/personal', label: 'Personal Expenses' },
    { href: '/finance/expenses/business', label: 'Business Expenses' },
  ] },
  { icon: Repeat, label: 'Recurring', items: [
    { href: '/finance/subscriptions', label: 'Subscriptions' },
    { href: '/finance/bills', label: 'Bills & Loans' },
  ] },
  { icon: Building2, label: 'Banking', items: [
    { href: '/finance/accounts', label: 'Accounts' },
    { href: '/finance/transfers', label: 'Transfers' },
    { href: '/finance/conversions', label: 'Conversions' },
    { href: '/finance/crypto', label: 'Crypto' },
  ] },
  { icon: Target, label: 'Planning', items: [
    { href: '/finance/budgets', label: 'Budgets' },
    { href: '/finance/goals', label: 'Goals' },
    { href: '/finance/planner', label: 'Planner' },
  ] },
  { icon: Lightbulb, label: 'Reports', items: [
    { href: '/finance/summaries', label: 'Summaries' },
    { href: '/finance/insights', label: 'Insights' },
    { href: '/finance/warranties', label: 'Warranties' },
    { href: '/finance/merchants', label: 'Merchants' },
  ] },
]
// A flattened version for the mobile strip, where a flyout menu doesn't work.
const RAIL_FLAT = RAIL_GROUPS.flatMap(g => g.items ? g.items.map(i => ({ ...i, icon: g.icon })) : [{ href: g.href!, label: g.label, icon: g.icon }])

// Simplest, most standard glassmorphism recipe — flat translucent white,
// blur, soft shadow, a barely-there border. Two prior passes added a
// diagonal internal gradient chasing a "sheen", which read as a fake
// plastic bevel instead of glass. Dropping it fixed that.
const navGlass: React.CSSProperties = {
  background: 'rgba(255,255,255,0.65)',
  backdropFilter: 'blur(18px) saturate(160%)', WebkitBackdropFilter: 'blur(18px) saturate(160%)',
  border: '1px solid rgba(255,255,255,0.5)',
  boxShadow: '0 8px 24px rgba(20,30,25,0.08)',
}
const cardGlass: React.CSSProperties = {
  background: 'rgba(255,255,255,0.55)',
  backdropFilter: 'blur(14px) saturate(150%)', WebkitBackdropFilter: 'blur(14px) saturate(150%)',
  border: '1px solid rgba(255,255,255,0.4)',
  boxShadow: '0 6px 20px rgba(20,30,25,0.06)',
}
// Flyout/dropdown panels — more opaque than the ambient glass for legibility.
const flyoutGlass: React.CSSProperties = {
  background: 'rgba(255,255,255,0.92)',
  backdropFilter: 'blur(20px) saturate(160%)', WebkitBackdropFilter: 'blur(20px) saturate(160%)',
  border: '1px solid rgba(255,255,255,0.7)',
  boxShadow: '0 16px 36px rgba(20,30,25,0.16)',
}

export default function FinanceLiveGlassBeta() {
  const [data, setData] = useState<any>(null)
  const [period, setPeriod] = useState<Period>('month')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [recent, setRecent] = useState<any[]>([])
  const { commandText, setCommandText, commandLoading, commandActions, commandSaved, submitCommand, saveCommandAction } = useCommandBox(() => {
    fetch('/api/finance/recent?limit=6').then(r => r.json()).then(setRecent).catch(() => {})
    fetch(`/api/finance/dashboard?period=${period}&date=${date}`).then(r => r.json()).then(setData).catch(() => {})
  })

  useEffect(() => {
    fetch(`/api/finance/dashboard?period=${period}&date=${date}`).then(r => r.json()).then(setData).catch(() => {})
  }, [period, date])
  useEffect(() => { fetch('/api/finance/recent?limit=6').then(r => r.json()).then(setRecent).catch(() => {}) }, [])

  const monthOut = data ? data.personalExpenses.concat(data.businessExpenses).reduce((s: number, e: any) => s + e.amountRSD, 0) : 0

  return (
    <div style={{ minHeight: '100dvh', fontFamily: SYSTEM_FONT, position: 'relative' }}>
      {/* Fixed pseudo-background — not background-attachment:fixed on the
          scrolling element (that forces a full-page repaint every scroll
          frame once several backdrop-filters are stacked, janky enough to
          swallow the first click). This is also the actual fix for "nothing
          looks like frosted glass": a smooth 3-stop gradient has no edges
          for backdrop-blur to distort, so panels sitting on it look flat no
          matter the recipe. GrainMesh gives it real, soft-edged blob detail
          — same mechanism that already worked on the dark/sage/photo betas
          — using a new 'paper' tone that stays genuinely light (not the
          gray-green wash that got rejected before). */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: -1, background: 'rgb(var(--l-paper))' }}>
        <GrainMesh tone="paper" />
      </div>
      {/* Left rail — hidden below lg, exactly like the real app's own ModuleDock.
          Finance Home is a direct link; every other group reveals its real
          sub-pages in a flyout on hover instead of only ever showing one
          flat level (addresses "it should open everything under like
          personal expenses and stuff"). */}
      <div className="hidden lg:flex" style={{ position: 'fixed', left: 18, top: '50%', transform: 'translateY(-50%)', zIndex: 30, flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgb(var(--l-ink) / 0.35)', marginBottom: 2, writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>Finance</span>
        {RAIL_GROUPS.map((g, i) => {
          const isHome = !!g.href
          const Icon = g.icon
          const button = (
            <span
              title={g.label}
              style={{
                width: 42, height: 42, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', cursor: 'pointer',
                ...(isHome ? { background: 'rgb(var(--l-green))', boxShadow: '0 4px 14px rgba(46,125,79,0.35)' } : { ...navGlass }),
              }}>
              <Icon size={16} color={isHome ? '#fff' : 'rgb(var(--l-ink) / 0.6)'} />
              <span className="rail-label" style={{
                position: 'absolute', left: 52, top: '50%', transform: 'translateY(-50%)',
                background: 'rgb(var(--l-ink))', color: 'rgb(var(--l-paper))', fontSize: 11, fontWeight: 600,
                padding: '5px 10px', borderRadius: 8, whiteSpace: 'nowrap', opacity: 0, pointerEvents: 'none', transition: 'opacity .15s',
              }}>{g.label}</span>
            </span>
          )
          return (
            <span key={g.label} className="rail-group group" style={{ position: 'relative' }}>
              {isHome ? <Link href={g.href!} style={{ textDecoration: 'none', display: 'block' }}>{button}</Link> : button}
              {i === 0 && <div style={{ width: 20, height: 1, background: 'rgb(var(--l-ink) / 0.12)', margin: '4px auto' }} />}
              {g.items && (
                <div className="rail-flyout" style={{
                  ...flyoutGlass, position: 'absolute', left: 52, top: '50%', transform: 'translateY(-50%)',
                  borderRadius: 14, padding: '8px', minWidth: 176, opacity: 0, pointerEvents: 'none', transition: 'opacity .15s',
                  display: 'flex', flexDirection: 'column', gap: 1,
                }}>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgb(var(--l-ink) / 0.4)', padding: '4px 10px 6px' }}>{g.label}</span>
                  {g.items.map(it => (
                    <Link key={it.href} href={it.href} style={{
                      fontSize: 13, fontWeight: 600, color: 'rgb(var(--l-ink) / 0.8)', textDecoration: 'none',
                      padding: '7px 10px', borderRadius: 8, whiteSpace: 'nowrap',
                    }}>{it.label}</Link>
                  ))}
                </div>
              )}
            </span>
          )
        })}
      </div>
      <style>{`
        .group:hover .rail-label { opacity: 1 !important; }
        .rail-group:hover .rail-flyout { opacity: 1 !important; pointer-events: auto !important; }
        .nav-more:hover .nav-more-flyout { opacity: 1 !important; pointer-events: auto !important; }
        .rail-flyout a:hover, .nav-more-flyout a:hover { background: rgb(var(--l-green) / 0.1); color: rgb(var(--l-green)); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      <div className="pl-4 lg:pl-[100px]" style={{ maxWidth: 980, margin: '0 auto', padding: '20px 20px 60px' }}>
        {/* Floating pill top nav — wider, full-bleed within the page's max-width */}
        <div style={{ position: 'sticky', top: 14, zIndex: 40, marginBottom: 12 }}>
          <div style={{ ...navGlass, borderRadius: 999, padding: '9px 12px 9px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <div style={{ width: 24, height: 24, borderRadius: 8, background: 'rgb(var(--l-green))' }} />
              <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.08em' }}>LIFE OS</span>
            </div>
            <div className="hidden md:flex no-scrollbar" style={{ gap: 2, overflowX: 'auto', flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              {NAV_PRIMARY.map(n => {
                const active = n.href === '/finance'
                return (
                  <Link key={n.href} href={n.href} style={{
                    fontSize: 12.5, fontWeight: 600, padding: '7px 14px', borderRadius: 999, whiteSpace: 'nowrap', textDecoration: 'none',
                    background: active ? 'rgb(var(--l-green) / 0.12)' : 'transparent',
                    color: active ? 'rgb(var(--l-green))' : 'rgb(var(--l-ink) / 0.55)',
                  }}>{n.label}</Link>
                )
              })}
              {/* "More" flyout keeps Journal/Food/Personal/Watchlist reachable
                  without crowding the pill or pushing Watchlist off-screen. */}
              <span className="nav-more" style={{ position: 'relative' }}>
                <span style={{
                  fontSize: 12.5, fontWeight: 600, padding: '7px 12px', borderRadius: 999, whiteSpace: 'nowrap',
                  color: 'rgb(var(--l-ink) / 0.55)', display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer',
                }}>More <ChevronDown size={13} /></span>
                <div className="nav-more-flyout" style={{
                  ...flyoutGlass, position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 8,
                  borderRadius: 14, padding: '8px', minWidth: 150, opacity: 0, pointerEvents: 'none', transition: 'opacity .15s',
                  display: 'flex', flexDirection: 'column', gap: 1, zIndex: 50,
                }}>
                  {NAV_MORE.map(n => (
                    <Link key={n.href} href={n.href} style={{
                      fontSize: 13, fontWeight: 600, color: 'rgb(var(--l-ink) / 0.8)', textDecoration: 'none',
                      padding: '7px 10px', borderRadius: 8, whiteSpace: 'nowrap', textAlign: 'center',
                    }}>{n.label}</Link>
                  ))}
                </div>
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {[Search, Bell, Moon].map((Icon, i) => (
                <span key={i} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  <Icon size={14} color="rgb(var(--l-ink) / 0.55)" />
                  {i === 1 && <span style={{ position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: '50%', background: 'rgb(var(--l-green))', border: '1.5px solid #fff' }} />}
                </span>
              ))}
              <span className="hidden sm:flex" style={{ fontSize: 12.5, fontWeight: 700, color: '#fff', background: 'rgb(var(--l-ink))', borderRadius: 999, padding: '8px 16px', alignItems: 'center', gap: 5 }}>
                <Plus size={13} /> New
              </span>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgb(var(--l-green))', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>LJ</div>
            </div>
          </div>

          {/* Mobile substitute for the left rail — that just vanishes below lg
              otherwise, taking every finance sub-page with it. Horizontal
              scroll strip of the same real links (flattened, since a hover
              flyout doesn't work on touch) instead of nothing. */}
          <div className="flex lg:hidden no-scrollbar" style={{ ...navGlass, borderRadius: 999, marginTop: 8, padding: '6px 8px', gap: 4, overflowX: 'auto' }}>
            {RAIL_FLAT.map(r => (
              <Link key={r.href} href={r.href} title={r.label} style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 999, flexShrink: 0, textDecoration: 'none',
                color: 'rgb(var(--l-ink) / 0.6)',
              }}>
                <r.icon size={13} />
                <span style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>{r.label}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-4 pb-8">
          <Card className="p-5" style={cardGlass}>
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

            {/* AI command box — the real thing, not decorative */}
            <div className="mt-4 pt-3 border-t border-ldg-ink/[0.07]">
              <div className="flex gap-2">
                <input value={commandText} onChange={e => setCommandText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') submitCommand() }}
                  placeholder="Tell the blob anything — spent 500 on groceries, how much did I spend this week…" disabled={commandLoading}
                  className="flex-1 min-w-0 rounded-lg px-3 py-2 text-[14px] bg-white/50 border border-ldg-ink/10 focus:outline-none focus:bg-white/80 disabled:opacity-60 transition-colors" />
                <button onClick={submitCommand} disabled={commandLoading || !commandText.trim()}
                  className="flex items-center justify-center w-9 h-9 shrink-0 rounded-lg bg-ldg-green text-white disabled:opacity-40">
                  {commandLoading ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Send size={14} />}
                </button>
              </div>
              {commandActions && (
                <div className="mt-2 space-y-1.5">
                  {commandActions.length === 0 && <p className="text-[12px] text-ldg-ink/40">Didn't catch anything there.</p>}
                  {commandActions.map((a, i) => {
                    const saved = commandSaved.has(i)
                    const canSave = a.type !== 'unclear' && a.type !== 'answer' && !(a.type === 'expense' && !a.accountId)
                    return (
                      <div key={i} className={cn('flex items-start gap-2 px-2.5 py-1.5 rounded-lg text-[12px]',
                        a.type === 'unclear' ? 'bg-ldg-urgent/[0.08] text-ldg-urgent'
                        : a.type === 'answer' ? 'bg-white/50 text-ldg-ink'
                        : saved ? 'bg-ldg-green/10 text-ldg-green' : 'bg-white/40 text-ldg-ink/80')}>
                        <span className={cn('flex-1 min-w-0', a.type === 'answer' ? 'leading-snug' : 'truncate')}>{describeCommandAction(a)}</span>
                        {saved ? <Check size={13} className="shrink-0 text-ldg-green" />
                          : canSave ? <button onClick={() => saveCommandAction(a, i)} className="text-[11px] font-bold text-ldg-green shrink-0">Save</button> : null}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </Card>

          <SignalsCard style={cardGlass} />

          <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
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
                  className={cn('shrink-0 text-[14px] px-5 py-2.5 rounded-xl border transition-colors',
                    active ? 'font-semibold bg-ldg-green/10 text-ldg-green border-ldg-green/30' : 'font-medium text-ldg-ink/60 border-transparent')}
                  style={!active ? navGlass : undefined}>
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
                <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
                  {shown.map((acc: any) => (
                    <Card key={acc.id} className="p-4" style={cardGlass}>
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
            <Card className="overflow-hidden" style={cardGlass}>
              <div className="px-5 py-3.5 border-b border-ldg-ink/[0.07]"><Label>Recent activity</Label></div>
              <div className="px-5">
                {recent.map(r => (
                  <Link key={`${r.type}-${r.id}`} href={r.href}
                    className="flex items-center gap-3 py-2.5 border-t border-ldg-ink/[0.07] first:border-t-0 hover:bg-white/40 transition-colors -mx-5 px-5">
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
                <Card key={section.title} className="p-5" style={cardGlass}>
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
